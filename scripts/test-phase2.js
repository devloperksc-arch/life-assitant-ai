// ============================================================
// TADASHI Phase 2 Test Suite — Tool Registry & Policy Layer
// Tests schema validation, risk tiers, approval gates, idempotency,
// verified persistence, and audit logging in a headless environment.
// ============================================================

const assert = require('assert');

// Mock Browser Environment
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};
global.window = global;
global.navigator = { onLine: true };
global.performance = { now: () => Date.now() };

// Mock Utils
global.Utils = {
  timeNow: () => '12:00',
  dateNow: () => 'Wednesday, 5 Nov 2026',
  today: () => '2026-11-05',
  escapeHtml: (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
};

// Mock DB
let tasksStore = [
  { id: 101, title: 'Existing Task 1', priority: 'high', deadline: '2026-11-05', project: 'Study', status: 'todo' }
];
let lastActionUndone = false;
let dbResetCalled = false;

global.DB = {
  tasks: {
    list: (f) => tasksStore,
    add: (t) => {
      const item = { id: Date.now(), ...t };
      tasksStore.push(item);
      return item;
    },
    markDone: (id) => {
      const item = tasksStore.find(t => t.id == id);
      if (item) item.status = 'done';
      return item;
    },
    delete: (id) => {
      const idx = tasksStore.findIndex(t => t.id == id);
      if (idx >= 0) {
        tasksStore.splice(idx, 1);
        return true;
      }
      return false;
    },
    search: (q) => tasksStore.filter(t => t.title.toLowerCase().includes((q||'').toLowerCase()))
  },
  calendar: {
    list: () => [{ id: 201, title: 'OS Exam', time: '10:00', type: 'exam' }]
  },
  fitness: {
    get: () => ({ currentSplit: 'Upper Body Power' })
  },
  nutrition: {
    get: () => ({ todayCalories: 1850, targetCalories: 2400 })
  },
  routines: {
    get: () => ({ morning: [{ task: 'Cold Shower', done: true }] })
  },
  relationships: {
    list: () => [{ id: 301, name: 'Aman Sharma' }]
  },
  knowledge: {
    search: () => []
  },
  undo: () => {
    lastActionUndone = true;
    return true;
  },
  reset: () => {
    dbResetCalled = true;
    tasksStore = [];
    return true;
  }
};

// Load Tool Registry
require('../js/assistant/tool-registry.js');

async function runTests() {
  console.log('--- STARTING PHASE 2 SUITE ---');

  // Test 1: Tool Registry loaded
  assert(global.ToolRegistry, 'ToolRegistry must be defined on window');
  assert(typeof ToolRegistry.execute === 'function', 'ToolRegistry.execute must be a function');
  console.log('✓ Test 1: ToolRegistry initialized and exposed on window');

  // Test 2: Unknown Tool Rejection
  const rUnknown = await ToolRegistry.execute('arbitrary_bash_command', { cmd: 'rm -rf /' });
  assert.strictEqual(rUnknown.ok, false);
  assert(rUnknown.error.includes('Unknown or unregistered tool'), 'Must reject unknown tool');
  console.log('✓ Test 2: Arbitrary/unknown tools strictly rejected');

  // Test 3: Input Injection / XSS Guard
  const rInjection = await ToolRegistry.execute('manage_tasks', {
    action: 'add',
    title: '<script>alert("pwned")</script>'
  });
  assert.strictEqual(rInjection.ok, false);
  assert(rInjection.error.includes('Disallowed characters or executable payload'), 'Must reject script tag');
  console.log('✓ Test 3: Script injection / executable payloads blocked by validation');

  // Test 4: Schema Type & Enum Validation
  const rBadEnum = await ToolRegistry.execute('manage_tasks', {
    action: 'invalid_action_name'
  });
  assert.strictEqual(rBadEnum.ok, false);
  assert(rBadEnum.error.includes('Invalid value for "action"'), 'Must enforce enum');
  console.log('✓ Test 4: Schema enum constraints strictly enforced');

  // Test 5: Safe Read Tool Execution
  const rContext = await ToolRegistry.execute('get_current_context', {});
  assert.strictEqual(rContext.ok, true);
  assert.strictEqual(rContext.result.activeUser, 'Krishna Singh');
  assert.strictEqual(rContext.result.activeDomains, 22);
  console.log('✓ Test 5: Safe read tool (get_current_context) runs cleanly');

  // Test 6: Reversible Write Execution (manage_tasks add)
  const initialTaskCount = tasksStore.length;
  const rAdd = await ToolRegistry.execute('manage_tasks', {
    action: 'add',
    title: 'Phase 2 Verification Task',
    priority: 'high'
  });
  assert.strictEqual(rAdd.ok, true);
  assert(rAdd.result.verified, 'Action result must be verified');
  assert.strictEqual(tasksStore.length, initialTaskCount + 1, 'Task must be persisted to DB');
  const addedTaskId = rAdd.result.task.id;
  console.log('✓ Test 6: Reversible write executed, verified, and persisted');

  // Test 7: Idempotency Protection
  const idempKey = 'idemp_test_key_12345';
  const rIdemp1 = await ToolRegistry.execute('manage_tasks', {
    action: 'add',
    title: 'Idempotency Target'
  }, { idempotencyKey: idempKey });
  const countAfterFirst = tasksStore.length;

  const rIdemp2 = await ToolRegistry.execute('manage_tasks', {
    action: 'add',
    title: 'Idempotency Target'
  }, { idempotencyKey: idempKey });
  assert.strictEqual(rIdemp2.cached, true, 'Second call must return cached idempotent response');
  assert.strictEqual(tasksStore.length, countAfterFirst, 'Duplicate call must NOT create second task in DB');
  console.log('✓ Test 7: Idempotent execution prevents duplicate DB writes on replay');

  // Test 8: Policy Gate & Approval Required for Destructive Actions
  // Delete action on tasks is marked destructive
  const rDeleteHeld = await ToolRegistry.execute('manage_tasks', {
    action: 'delete',
    id: addedTaskId
  }, { isApproved: false });
  assert.strictEqual(rDeleteHeld.approvalRequired, true, 'Destructive delete must require approval');
  assert(rDeleteHeld.proposal, 'Proposal card must be created');
  assert.strictEqual(rDeleteHeld.proposal.risk, 'destructive');

  // Now execute with approval
  const rDeleteApproved = await ToolRegistry.execute('manage_tasks', {
    action: 'delete',
    id: addedTaskId
  }, { isApproved: true });
  assert.strictEqual(rDeleteApproved.ok, true);
  assert.strictEqual(rDeleteApproved.result.verified, true);
  console.log('✓ Test 8: Destructive operation holds for approval and executes when approved');

  // Test 9: Reset All Data Gate
  const rResetHeld = await ToolRegistry.execute('reset_all_data', {}, { isApproved: false });
  assert.strictEqual(rResetHeld.approvalRequired, true);
  assert.strictEqual(dbResetCalled, false, 'DB.reset must not be called when unapproved');

  const rResetApproved = await ToolRegistry.execute('reset_all_data', {}, { isApproved: true });
  assert.strictEqual(rResetApproved.ok, true);
  assert.strictEqual(dbResetCalled, true, 'DB.reset called once approved');
  console.log('✓ Test 9: reset_all_data policy gate holds until approved');

  // Test 10: Audit Log Verification
  const auditLog = ToolRegistry.getAuditLog();
  assert(Array.isArray(auditLog), 'Audit log must be an array');
  assert(auditLog.length > 5, 'Audit log must record operations');
  const lastEntry = auditLog[0];
  assert(lastEntry.timestamp, 'Audit entry must have timestamp');
  assert(lastEntry.tool, 'Audit entry must record tool name');
  console.log(`✓ Test 10: Audit log persists valid records (${auditLog.length} events logged)`);

  console.log('\nALL 10 TESTS PASSED SUCCESSFULLY! PHASE 2 POLICY LAYER VERIFIED.');
}

runTests().catch(e => {
  console.error('TEST FAILURE:', e);
  process.exit(1);
});
