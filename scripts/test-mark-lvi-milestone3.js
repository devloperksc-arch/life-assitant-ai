// ============================================================
// TADASHI — Mark LVI Milestone 3 Test Suite
// Verifies: Offline Context Scoping, PC Agent Scope Enforcement,
// Memory Provenance & Inferred Hypotheses, Memory Export/Import/Delete,
// Durable Outbox (No Premature Marking), and Visible Conflict Resolution.
// ============================================================

const assert = require('assert');

// 1. Mock Browser Environment
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};
global.window = global;
global.navigator = { onLine: true };
global.performance = global.performance || { now: () => Date.now() };

// Load Backend and Frontend Modules
const { _memoryStore, userRepo, deviceRepo, recordRepo, syncOpRepo, conflictRepo } = require('../server/src/db');
const { registerDevice, authenticateRequest } = require('../server/src/auth');
const { handleSyncPush, handleSyncPull } = require('../server/src/sync');
const { PCAgent } = require('../server/src/agent/pc-agent');
require('../js/assistant/sync-engine.js');
require('../js/assistant/memory.js');

async function runMilestone3Tests() {
  console.log('--- STARTING MARK LVI MILESTONE 3 SUITE: OFFLINE CONTEXT & SYNC ---');

  // -------------------------------------------------------------
  // Test 1: Scoped Offline LifeOS Data Filtering
  // -------------------------------------------------------------
  const approvedScope = SyncEngine.getApprovedOfflineScope();
  assert(Array.isArray(approvedScope), 'Approved offline scope must be an array');
  assert(approvedScope.includes('tasks'), 'Must include tasks');
  assert(approvedScope.includes('calendar'), 'Must include calendar');
  assert(approvedScope.includes('memory'), 'Must include memory');
  assert(!approvedScope.includes('documents'), 'Documents vault must NOT be in standard offline scope');
  assert(!approvedScope.includes('finance'), 'Finance vault must NOT be in standard offline scope');

  const fullData = {
    tasks: [{ id: 1, title: 'Gym' }],
    calendar: [{ id: 2, title: 'Meeting' }],
    documents: [{ id: 3, title: 'Secret Passport' }],
    finance: [{ id: 4, balance: 50000 }]
  };

  const offlineFiltered = SyncEngine.filterOfflineData(fullData);
  assert(offlineFiltered.tasks, 'Must retain approved offline tasks');
  assert(offlineFiltered.calendar, 'Must retain approved offline calendar');
  assert.strictEqual(offlineFiltered.documents, undefined, 'Must strip unapproved documents domain');
  assert.strictEqual(offlineFiltered.finance, undefined, 'Must strip unapproved finance domain');
  console.log('✓ Test 1: Bounded offline scope strictly filters sensitive cloud-only data');

  // -------------------------------------------------------------
  // Test 2: PC Local Agent Offline Scope Enforcement
  // -------------------------------------------------------------
  const pcAgent = new PCAgent({ deviceId: 'dev_pc_laptop_scope_test' });
  const localDB = {
    tasks: [{ id: 101, title: 'Study Operating Systems' }],
    documents: [{ id: 999, title: 'Private Tax Records' }]
  };

  const tasksAccess = pcAgent.getOfflineData('tasks', localDB);
  assert.strictEqual(tasksAccess.ok, true);
  assert.strictEqual(tasksAccess.data.length, 1);

  const documentsAccess = pcAgent.getOfflineData('documents', localDB);
  assert.strictEqual(documentsAccess.ok, false);
  assert(documentsAccess.error.includes('Scope Violation'), 'PC agent must strictly enforce offline scope bounds');
  console.log('✓ Test 2: PC Companion Agent strictly enforces approved offline domain boundaries');

  // -------------------------------------------------------------
  // Test 3: Memory Provenance, Confidence & Inferred Hypotheses
  // -------------------------------------------------------------
  Memory.clear();

  // User direct fact (confirmed by definition)
  const userFact = Memory.add(
    Memory.MEMORY_TYPE.FACT,
    'Krishna is studying Computer Science at University',
    'user_direct'
  );
  assert.strictEqual(userFact.isConfirmed, true);
  assert.strictEqual(userFact.confidence, 1.0);

  // Inferred hypothesis from AI observation (unconfirmed)
  const inferredPref = Memory.add(
    Memory.MEMORY_TYPE.PREFERENCE,
    'User appears to study more productively in early mornings',
    'inferred',
    { confidence: 0.75 }
  );
  assert.strictEqual(inferredPref.isConfirmed, false);
  assert.strictEqual(inferredPref.confidence, 0.75);

  // Verify that prompt context clearly differentiates confirmed facts from inferred hypotheses
  const promptContext = Memory.formatContextForPrompt('cloud_allowed');
  assert(promptContext.includes('[FACT] Krishna is studying Computer Science'), 'Confirmed fact presented as standard fact');
  assert(promptContext.includes('[INFERRED PREFERENCE] (Unconfirmed hypothesis'), 'Inferred fact labeled with unconfirmed warning');
  assert(promptContext.includes('Note: Treat as unverified hypothesis, not confirmed fact'), 'Must include explicit warning');

  // User confirms the inferred fact
  Memory.confirm(inferredPref.id);
  const confirmedPref = Memory.list().find(m => m.id === inferredPref.id);
  assert.strictEqual(confirmedPref.isConfirmed, true);
  assert.strictEqual(confirmedPref.confidence, 1.0);
  console.log('✓ Test 3: Memory provenance distinguishes confirmed facts from unverified AI hypotheses');

  // -------------------------------------------------------------
  // Test 4: Memory Inspection, Export, Import, and Deletion
  // -------------------------------------------------------------
  const exportedJson = Memory.export();
  assert.strictEqual(exportedJson.version, '1.0');
  assert.strictEqual(exportedJson.memories.length, 2);

  // Clear all memories
  Memory.clear();
  assert.strictEqual(Memory.list().length, 0);

  // Re-import
  const importedList = Memory.import(exportedJson);
  assert.strictEqual(importedList.length, 2);
  assert.strictEqual(Memory.list().length, 2);
  console.log('✓ Test 4: Memory records can be inspected, exported, wiped, and safely re-imported');

  // -------------------------------------------------------------
  // Test 5: Durable Outbox & Zero Premature Sync Marking
  // -------------------------------------------------------------
  // Queue offline operation
  const op = await SyncEngine.queueOperation('tasks', 'task_1001', 'update', { title: 'Durable task' }, 1);
  const pendingBeforePush = await SyncEngine.getPendingOperations();
  assert.strictEqual(pendingBeforePush.length, 1);
  assert.strictEqual(pendingBeforePush[0].status, 'pending_sync');

  // Simulate network failure: push should fail and outbox MUST NOT be cleared
  global.fetch = async () => {
    throw new Error('Network connection failed');
  };

  const failedPush = await SyncEngine.push('http://127.0.0.1:3000', 'session_tok');
  assert.strictEqual(failedPush.ok, false);

  const pendingAfterFail = await SyncEngine.getPendingOperations();
  assert.strictEqual(pendingAfterFail.length, 1, 'Failed push must NEVER prematurely remove outbox operations');
  assert.strictEqual(pendingAfterFail[0].opId, op.opId);
  console.log('✓ Test 5: Outbox operations remain durable and are never marked synced prematurely on failure');

  // -------------------------------------------------------------
  // Test 6: Concurrency Conflict Detection & Visible Surfacing
  // -------------------------------------------------------------
  _memoryStore.reset();
  const testUser = await userRepo.create({ id: 'user_krishna', email: 'krishna@test.com' });
  const testDev = await registerDevice(testUser.id, { deviceId: 'dev_laptop_sync' });

  // 1. Establish canonical record at version 2 on server
  await recordRepo.upsert({
    user_id: testUser.id,
    domain: 'tasks',
    entity_id: 'task_shared_1',
    payload: { title: 'Cloud Version (Updated by Phone)' },
    version: 2
  });

  // 2. Client pushes edit based on outdated version 1
  const conflictingBatch = [
    {
      opId: 'op_conflict_123',
      deviceId: testDev.device.id,
      entityType: 'tasks',
      entityId: 'task_shared_1',
      operation: 'update',
      baseVersion: 1, // OUTDATED! Server is at version 2
      payload: { title: 'Local Version (Edited on Laptop while offline)' }
    }
  ];

  const serverPushRes = await handleSyncPush(testUser, testDev.device, conflictingBatch);
  assert.strictEqual(serverPushRes.ok, true);
  assert.strictEqual(serverPushRes.conflicts.length, 1);
  assert.strictEqual(serverPushRes.conflicts[0].opId, 'op_conflict_123');
  assert.strictEqual(serverPushRes.conflicts[0].serverVersion, 2);
  assert.strictEqual(serverPushRes.conflicts[0].clientBaseVersion, 1);

  // 3. Verify canonical server record was NOT silently overwritten
  const recordCheck = await recordRepo.get(testUser.id, 'tasks', 'task_shared_1');
  assert.strictEqual(recordCheck.version, 2);
  assert.strictEqual(recordCheck.payload.title, 'Cloud Version (Updated by Phone)');

  // 4. Client SyncEngine conflict resolution
  // Mock client outbox with conflicting op
  const db = await SyncEngine.init();
  db.memOutbox.set('op_conflict_123', {
    opId: 'op_conflict_123',
    status: 'conflict',
    baseVersion: 1,
    payload: { title: 'Local Version' }
  });
  db.memConflicts.set('op_conflict_123', serverPushRes.conflicts[0]);

  const conflicts = await SyncEngine.getConflicts();
  assert.strictEqual(conflicts.length, 1);

  // User chooses "keep_local" -> forces overwrite on next sync
  const resolved = await SyncEngine.resolveConflict('op_conflict_123', 'keep_local');
  assert.strictEqual(resolved.ok, true);
  assert.strictEqual(resolved.resolution, 'keep_local');
  const resolvedOp = db.memOutbox.get('op_conflict_123');
  assert.strictEqual(resolvedOp.status, 'pending_sync');
  assert.strictEqual(resolvedOp.baseVersion, null);
  console.log('✓ Test 6: Concurrency conflicts are visibly surfaced and safely resolved without data loss');

  console.log('\n=============================================================');
  console.log('ALL 6 TESTS PASSED SUCCESSFULLY! MARK LVI MILESTONE 3 VERIFIED.');
  console.log('=============================================================');
}

runMilestone3Tests().catch(err => {
  console.error('\nTEST SUITE FAILED:', err);
  process.exit(1);
});
