// ============================================================
// TADASHI Phase 4 Test Suite — Backend, Auth, DB & Sync Engine
// Tests device registration, authentication, revocation,
// durable outbox, idempotent push, version conflicts, and cursors.
// ============================================================

const assert = require('assert');

// Mock Browser Environment for SyncEngine
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};
global.window = global;
global.navigator = { onLine: true };

// Load Backend Modules
const { _memoryStore, userRepo, deviceRepo, recordRepo, syncOpRepo, conflictRepo } = require('../server/src/db');
const { createToken, verifyToken, registerDevice, revokeDevice, authenticateRequest } = require('../server/src/auth');
const { handleSyncPush, handleSyncPull, handleLegacyMigration } = require('../server/src/sync');
require('../js/assistant/sync-engine.js');

async function runPhase4Tests() {
  console.log('--- STARTING PHASE 4 SUITE: BACKEND, AUTH & SYNC ---');

  // Reset in-memory DB
  _memoryStore.reset();
  const testUser = await userRepo.create({
    id: 'user_krishna',
    auth_subject: 'auth0|krishna',
    email: 'krishna@tadashi.os'
  });

  // Test 1: Device Registration & Token Creation
  const devLaptop = await registerDevice(testUser.id, {
    deviceId: 'dev_laptop_001',
    name: "Krishna's ThinkPad",
    platform: 'laptop'
  });
  assert(devLaptop.sessionToken, 'Must generate session token');
  assert.strictEqual(devLaptop.device.id, 'dev_laptop_001');

  const devPhone = await registerDevice(testUser.id, {
    deviceId: 'dev_phone_002',
    name: "Krishna's Android Phone",
    platform: 'android'
  });
  assert(devPhone.sessionToken, 'Must generate session token for phone');
  console.log('✓ Test 1: Multi-device registration & session tokens generated');

  // Test 2: Token Verification & Authentication Middleware
  const authGood = await authenticateRequest({
    authorization: `Bearer ${devLaptop.sessionToken}`
  });
  assert.strictEqual(authGood.ok, true);
  assert.strictEqual(authGood.user.id, testUser.id);
  assert.strictEqual(authGood.device.id, 'dev_laptop_001');

  const authBad = await authenticateRequest({
    authorization: 'Bearer bad_fake_token_123'
  });
  assert.strictEqual(authBad.ok, false);
  assert.strictEqual(authBad.status, 401);
  console.log('✓ Test 2: Authentication middleware validates valid tokens and rejects malformed tokens');

  // Test 3: Device Revocation & Isolation
  await revokeDevice('dev_laptop_001');
  const authRevoked = await authenticateRequest({
    authorization: `Bearer ${devLaptop.sessionToken}`
  });
  assert.strictEqual(authRevoked.ok, false);
  assert.strictEqual(authRevoked.status, 403);
  assert(authRevoked.error.includes('revoked'), 'Must block revoked device');

  // Phone device must remain active and unaffected
  const authPhone = await authenticateRequest({
    authorization: `Bearer ${devPhone.sessionToken}`
  });
  assert.strictEqual(authPhone.ok, true, 'Non-revoked device must remain operational');
  console.log('✓ Test 3: Device revocation blocks compromised device while preserving other devices');

  // Test 4: Durable Client Outbox Queueing
  await SyncEngine.init();
  const queuedOp = await SyncEngine.queueOperation(
    'tasks',
    '101',
    'create',
    { title: 'Offline Task 1', priority: 'high', status: 'todo' },
    null
  );
  assert(queuedOp.opId, 'Must assign opId');
  assert.strictEqual(queuedOp.entityType, 'tasks');
  const pendingOps = await SyncEngine.getPendingOperations();
  assert.strictEqual(pendingOps.length, 1);
  assert.strictEqual(pendingOps[0].opId, queuedOp.opId);
  console.log('✓ Test 4: Client outbox safely queues offline mutations');

  // Test 5: Idempotent Sync Push
  const pushBatch = [queuedOp];
  const pushRes1 = await handleSyncPush(testUser, devPhone.device, pushBatch);
  assert.strictEqual(pushRes1.ok, true);
  assert.strictEqual(pushRes1.processedCount, 1);
  assert.strictEqual(pushRes1.processed[0].status, 'applied');
  assert.strictEqual(pushRes1.processed[0].version, 1);

  // Re-push exact same operation (replay / retry scenario)
  const pushRes2 = await handleSyncPush(testUser, devPhone.device, pushBatch);
  assert.strictEqual(pushRes2.ok, true);
  assert.strictEqual(pushRes2.processedCount, 1);
  assert.strictEqual(pushRes2.processed[0].status, 'duplicate');
  assert.strictEqual(pushRes2.processed[0].idempotent, true);

  // Verify record version was not incremented
  const recCheck = await recordRepo.get(testUser.id, 'tasks', '101');
  assert.strictEqual(recCheck.version, 1, 'Duplicate push must NOT increment version');
  console.log('✓ Test 5: Idempotent push processing safely deduplicates replayed operations');

  // Test 6: Concurrency Conflict Detection
  // Valid update from phone (bumps version to 2)
  const opPhoneUpdate = {
    opId: '22222222-2222-4222-8222-222222222222',
    deviceId: devPhone.device.id,
    entityType: 'tasks',
    entityId: '101',
    operation: 'update',
    baseVersion: 1,
    payload: { title: 'Updated from Phone', status: 'in-progress' }
  };
  const pushResPhone = await handleSyncPush(testUser, devPhone.device, [opPhoneUpdate]);
  assert.strictEqual(pushResPhone.processed[0].status, 'applied');
  assert.strictEqual(pushResPhone.processed[0].version, 2);

  // Stale update based on outdated version 1
  const opStaleUpdate = {
    opId: '33333333-3333-4333-8333-333333333333',
    deviceId: 'dev_laptop_001',
    entityType: 'tasks',
    entityId: '101',
    operation: 'update',
    baseVersion: 1, // Stale! Server is now at version 2
    payload: { title: 'Stale Edit from Laptop' }
  };
  const pushResConflict = await handleSyncPush(testUser, devPhone.device, [opStaleUpdate]);
  assert.strictEqual(pushResConflict.conflictCount, 1);
  assert.strictEqual(pushResConflict.conflicts[0].serverVersion, 2);
  assert.strictEqual(pushResConflict.conflicts[0].clientBaseVersion, 1);

  // Verify server record was NOT overwritten by stale edit
  const recPreserved = await recordRepo.get(testUser.id, 'tasks', '101');
  assert.strictEqual(recPreserved.payload.title, 'Updated from Phone', 'Server record must remain untouched on conflict');
  console.log('✓ Test 6: Concurrency conflict detected and surfaced without silent data loss');

  // Test 7: Cursor-Based Sync Pull
  const pullRes = await handleSyncPull(testUser, devPhone.device, '1970-01-01T00:00:00Z');
  assert.strictEqual(pullRes.ok, true);
  assert(pullRes.records.length > 0, 'Must pull modified records');
  assert(pullRes.cursor, 'Must return updated cursor position');
  assert.strictEqual(pullRes.conflicts.length, 1, 'Must return unresolved conflicts');
  console.log(`✓ Test 7: Sync pull returns modified records (${pullRes.records.length}) and cursor`);

  // Test 8: Non-Destructive Legacy State Migration
  const mockLegacyState = {
    tasks: [
      { id: 201, title: 'Legacy Task Alpha', priority: 'medium' },
      { id: 202, title: 'Legacy Task Beta', priority: 'high' }
    ],
    goals: [
      { id: 301, title: 'Graduate with Distinction', progress: 80 }
    ],
    nutrition: {
      todayCalories: 2100,
      targetCalories: 2400
    }
  };
  const migrationRes = await handleLegacyMigration(testUser, devPhone.device, mockLegacyState);
  assert.strictEqual(migrationRes.ok, true);
  assert.strictEqual(migrationRes.migratedCount, 4); // 2 tasks + 1 goal + 1 nutrition singleton

  const migratedTask = await recordRepo.get(testUser.id, 'tasks', '201');
  assert(migratedTask, 'Migrated task must exist in records');
  assert.strictEqual(migratedTask.payload.title, 'Legacy Task Alpha');
  console.log(`✓ Test 8: Non-destructive legacy migration successfully converted ${migrationRes.migratedCount} records`);

  // Test 9: ToolRegistry get_sync_status integration
  const syncStatus = await SyncEngine.getStatus();
  assert.strictEqual(typeof syncStatus.pendingOutboxCount, 'number');
  assert.strictEqual(typeof syncStatus.deviceId, 'string');
  console.log('✓ Test 9: SyncEngine status report verified');

  console.log('\nALL 9 TESTS PASSED SUCCESSFULLY! PHASE 4 BACKEND & SYNC VERIFIED.');
}

runPhase4Tests().catch(err => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
