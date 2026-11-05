// ============================================================
// TADASHI LifeOS — Sync Engine Service (Phase 4)
// Processes idempotent push outbox batches, version collision checks,
// conflict surfacing, cursor-based pull synchronization, and
// explicit non-destructive legacy data migration.
// ============================================================

const { recordRepo, syncOpRepo, conflictRepo } = require('../db');

// UUID v4 format checker
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Validate sync operation envelope per schemas/sync-operation.schema.json
function validateOpEnvelope(op) {
  if (!op || typeof op !== 'object') return { valid: false, error: 'Operation must be an object' };
  const opId = op.opId || op.op_id;
  const deviceId = op.deviceId || op.device_id;
  const entityType = op.entityType || op.entity_type;
  const entityId = String(op.entityId || op.entity_id || '');
  const operation = op.operation;

  if (!opId || typeof opId !== 'string') return { valid: false, error: 'Missing or invalid opId' };
  if (!deviceId || typeof deviceId !== 'string') return { valid: false, error: 'Missing or invalid deviceId' };
  if (!entityType || typeof entityType !== 'string') return { valid: false, error: 'Missing or invalid entityType' };
  if (!entityId) return { valid: false, error: 'Missing or invalid entityId' };
  if (!['create', 'update', 'archive', 'delete'].includes(operation)) {
    return { valid: false, error: `Invalid operation "${operation}". Allowed: create, update, archive, delete` };
  }
  return { valid: true };
}

// Push Batch Handler
async function handleSyncPush(user, device, operations) {
  if (!Array.isArray(operations)) {
    return { ok: false, status: 400, error: 'Body must contain an array of operations' };
  }

  const processed = [];
  const conflicts = [];
  const errors = [];

  for (const op of operations) {
    const val = validateOpEnvelope(op);
    if (!val.valid) {
      errors.push({ opId: op?.opId || 'unknown', error: val.error });
      continue;
    }

    const opId = op.opId || op.op_id;
    const entityType = op.entityType || op.entity_type;
    const entityId = String(op.entityId || op.entity_id);
    const operation = op.operation;
    const baseVersion = op.baseVersion !== undefined ? op.baseVersion : op.base_version;
    const payload = op.payload || {};

    // 1. Idempotency Check: Return previously processed result
    const existingOp = await syncOpRepo.getByOpId(opId);
    if (existingOp) {
      processed.push({
        opId,
        status: 'duplicate',
        idempotent: true,
        result: existingOp.result
      });
      continue;
    }

    // 2. Fetch current canonical state
    const currentRecord = await recordRepo.get(user.id, entityType, entityId);

    // 3. Concurrency Conflict Detection
    if (currentRecord && (operation === 'update' || operation === 'delete')) {
      if (baseVersion !== null && baseVersion !== undefined && baseVersion < currentRecord.version) {
        // Version conflict: client based edit on outdated version
        const conflictRecord = await conflictRepo.create({
          user_id: user.id,
          op_id: opId,
          entity_id: entityId,
          server_version: currentRecord.version,
          client_base_version: baseVersion,
          conflict_details: {
            serverPayload: currentRecord.payload,
            clientPayload: payload,
            serverUpdatedAt: currentRecord.updated_at
          }
        });

        await syncOpRepo.record({
          op_id: opId,
          user_id: user.id,
          device_id: device.id,
          entity_type: entityType,
          entity_id: entityId,
          operation,
          base_version: baseVersion,
          payload,
          status: 'conflict',
          result: { conflictId: conflictRecord.id }
        });

        conflicts.push({
          opId,
          conflictId: conflictRecord.id,
          entityType,
          entityId,
          serverVersion: currentRecord.version,
          clientBaseVersion: baseVersion,
          message: `Concurrency conflict on ${entityType}:${entityId}. Server is on version ${currentRecord.version}; edit based on ${baseVersion}.`
        });
        continue;
      }
    }

    // 4. Apply Mutation
    let updatedRecord;
    if (operation === 'delete' || operation === 'archive') {
      updatedRecord = await recordRepo.upsert({
        user_id: user.id,
        domain: entityType,
        entity_id: entityId,
        payload: currentRecord ? currentRecord.payload : {},
        version: currentRecord ? currentRecord.version + 1 : 1,
        deleted_at: new Date().toISOString()
      });
    } else {
      // create or update
      const mergedPayload = currentRecord
        ? { ...currentRecord.payload, ...payload }
        : payload;
      const targetVersion = currentRecord ? currentRecord.version + 1 : 1;

      updatedRecord = await recordRepo.upsert({
        user_id: user.id,
        domain: entityType,
        entity_id: entityId,
        payload: mergedPayload,
        version: targetVersion
      });
    }

    // 5. Record Processed Op
    await syncOpRepo.record({
      op_id: opId,
      user_id: user.id,
      device_id: device.id,
      entity_type: entityType,
      entity_id: entityId,
      operation,
      base_version: baseVersion,
      payload,
      status: 'applied',
      result: {
        entityId,
        version: updatedRecord.version,
        updatedAt: updatedRecord.updated_at
      }
    });

    processed.push({
      opId,
      status: 'applied',
      entityType,
      entityId,
      version: updatedRecord.version,
      updatedAt: updatedRecord.updated_at
    });
  }

  return {
    ok: true,
    processedCount: processed.length,
    conflictCount: conflicts.length,
    errorCount: errors.length,
    processed,
    conflicts,
    errors
  };
}

// Pull Changes Handler (Cursor-Based)
async function handleSyncPull(user, device, cursorIso) {
  const records = await recordRepo.listModifiedSince(user.id, cursorIso);
  const unresolvedConflicts = await conflictRepo.listUnresolved(user.id);

  let newCursor = cursorIso || '1970-01-01T00:00:00.000Z';
  if (records.length > 0) {
    newCursor = records[records.length - 1].updated_at;
  }

  return {
    ok: true,
    cursor: newCursor,
    recordCount: records.length,
    records,
    conflicts: unresolvedConflicts
  };
}

// Legacy Data Migration Handler (Explicit, Opt-In, Non-Destructive)
async function handleLegacyMigration(user, device, legacyState) {
  if (!legacyState || typeof legacyState !== 'object') {
    return { ok: false, error: 'Invalid legacy state export' };
  }

  let migratedCount = 0;
  const domains = [
    'tasks', 'goals', 'calendarEvents', 'finance', 'fitness', 'nutrition',
    'study', 'wellbeing', 'shopping', 'relationships', 'knowledge', 'routines',
    'digitalLife', 'vehicle', 'travel', 'entertainment', 'documents', 'homeModule',
    'analytics', 'user', 'lifeState'
  ];

  for (const domainKey of domains) {
    const data = legacyState[domainKey];
    if (data === undefined || data === null) continue;

    if (Array.isArray(data)) {
      for (const item of data) {
        const entityId = String(item.id || item.name || `item_${migratedCount}`);
        await recordRepo.upsert({
          user_id: user.id,
          domain: domainKey,
          entity_id: entityId,
          payload: item,
          version: 1
        });
        migratedCount++;
      }
    } else if (typeof data === 'object') {
      await recordRepo.upsert({
        user_id: user.id,
        domain: domainKey,
        entity_id: 'singleton',
        payload: data,
        version: 1
      });
      migratedCount++;
    }
  }

  return {
    ok: true,
    migratedCount,
    migratedAt: new Date().toISOString(),
    message: `Successfully migrated ${migratedCount} personal records to cloud canonical store.`
  };
}

module.exports = {
  validateOpEnvelope,
  handleSyncPush,
  handleSyncPull,
  handleLegacyMigration
};
