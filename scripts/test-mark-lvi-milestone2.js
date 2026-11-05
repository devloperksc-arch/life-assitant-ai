// ============================================================
// TADASHI — Mark LVI Milestone 2 Test Suite
// Verifies: Tool-Call Normalization, Honest Action Outcomes,
// Bounded Rounds, Infinite Loop Detection, Approval Tokens,
// and Per-Call Timeouts/Cancellation.
// ============================================================

const assert = require('assert');

// 1. Mock Environment
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

global.Utils = {
  timeNow: () => '12:00',
  dateNow: () => 'Wednesday, 5 Nov 2026',
  today: () => '2026-11-05',
  escapeHtml: (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
};

let tasksStore = [
  { id: 101, title: 'Existing Task 1', priority: 'high', status: 'todo' }
];

global.DB = {
  tasks: {
    list: () => tasksStore,
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
    }
  },
  calendar: {
    list: () => []
  },
  fitness: {
    get: () => ({ currentSplit: 'Push' })
  },
  nutrition: {
    get: () => ({ todayCalories: 1500 })
  },
  routines: {
    get: () => ({ morning: [] })
  },
  relationships: {
    list: () => []
  },
  knowledge: {
    search: () => []
  },
  undo: () => true,
  reset: () => { tasksStore = []; return true; }
};

// Load ToolRegistry
require('../js/assistant/tool-registry.js');

async function runMilestone2Tests() {
  console.log('--- STARTING MARK LVI MILESTONE 2 SUITE: COMMON TOOLS & POLICY ---');

  // -------------------------------------------------------------
  // Test 1: Tool-Call Normalization Across Providers & Formats
  // -------------------------------------------------------------
  // Format A: Ollama / OpenAI object
  const ollamaCall = {
    function: {
      name: 'manage_tasks',
      arguments: { action: 'add', title: 'Buy milk' }
    }
  };
  const normOllama = ToolRegistry.normalizeToolCall(ollamaCall);
  assert.strictEqual(normOllama.name, 'manage_tasks');
  assert.strictEqual(normOllama.args.action, 'add');
  assert.strictEqual(normOllama.args.title, 'Buy milk');
  assert(normOllama.id, 'Must assign canonical id');

  // Format B: OpenAI / LiteLLM with stringified arguments
  const openAICall = {
    id: 'call_999_test',
    type: 'function',
    function: {
      name: 'manage_calendar',
      arguments: '{"action":"list","date":"2026-11-05"}'
    }
  };
  const normOpenAI = ToolRegistry.normalizeToolCall(openAICall);
  assert.strictEqual(normOpenAI.id, 'call_999_test');
  assert.strictEqual(normOpenAI.name, 'manage_calendar');
  assert.strictEqual(normOpenAI.args.date, '2026-11-05');

  // Format C: Gemini format
  const geminiCall = {
    functionCall: {
      name: 'get_current_context',
      args: {}
    }
  };
  const normGemini = ToolRegistry.normalizeToolCall(geminiCall);
  assert.strictEqual(normGemini.name, 'get_current_context');
  assert.deepStrictEqual(normGemini.args, {});

  // Format D: Embedded in text (<tool_call> and markdown code block)
  const textWithXml = 'Let me add that for you.\n<tool_call>{"name":"manage_tasks","args":{"action":"add","title":"Clean desk"}}</tool_call>\nI will do that.';
  const extractedXml = ToolRegistry.extractToolCallsFromText(textWithXml);
  assert.strictEqual(extractedXml.length, 1);
  assert.strictEqual(extractedXml[0].name, 'manage_tasks');
  assert.strictEqual(extractedXml[0].args.title, 'Clean desk');

  const textWithMarkdown = '```json\n{"name": "manage_tasks", "args": {"action": "list"}}\n```';
  const extractedMd = ToolRegistry.extractToolCallsFromText(textWithMarkdown);
  assert.strictEqual(extractedMd.length, 1);
  assert.strictEqual(extractedMd[0].name, 'manage_tasks');
  console.log('✓ Test 1: Tool-call normalization cleanly unifies Ollama, Gemini, OpenAI, and text-embedded schemas');

  // -------------------------------------------------------------
  // Test 2: Honest Action Outcome Verification (core/outcome.py)
  // -------------------------------------------------------------
  const OUTCOME = ToolRegistry.OUTCOME;
  assert(OUTCOME, 'OUTCOME enum must exist');
  assert.strictEqual(OUTCOME.VERIFIED_DONE, 'verified_done');
  assert.strictEqual(OUTCOME.UNVERIFIED, 'unverified');
  assert.strictEqual(OUTCOME.FAILED, 'failed');
  assert.strictEqual(OUTCOME.PENDING_APPROVAL, 'pending_approval');
  assert.strictEqual(OUTCOME.CANCELLED, 'cancelled');

  // Verified Read Outcome
  const readRes = await ToolRegistry.execute('get_current_context', {});
  assert.strictEqual(readRes.status, OUTCOME.VERIFIED_DONE);
  assert.strictEqual(readRes.verification.verified, true);

  // Verified Write Outcome
  const writeRes = await ToolRegistry.execute('manage_tasks', {
    action: 'add',
    title: 'Outcome Test Task'
  });
  assert.strictEqual(writeRes.status, OUTCOME.VERIFIED_DONE);
  assert.strictEqual(writeRes.verification.verified, true);
  assert.strictEqual(writeRes.result.verified, true);

  // Register a mock tool that simulates an unconfirmed/asynchronous external write
  ToolRegistry.register({
    name: 'mock_unverified_sync',
    description: 'Simulates unconfirmed write',
    parameters: { type: 'OBJECT', properties: {} },
    risk: ToolRegistry.RISK.REVERSIBLE_WRITE,
    execute: async () => ({
      verified: false,
      verificationDetails: 'Queued to sync outbox; awaiting remote server acknowledgement'
    })
  });

  const unverifiedRes = await ToolRegistry.execute('mock_unverified_sync', {});
  assert.strictEqual(unverifiedRes.status, OUTCOME.UNVERIFIED);
  assert.strictEqual(unverifiedRes.verification.verified, false);
  assert(unverifiedRes.verification.details.includes('awaiting remote server acknowledgement'));
  console.log('✓ Test 2: Honest action outcome correctly differentiates verified_done vs unverified state');

  // -------------------------------------------------------------
  // Test 3: Approval Token Lifecycle & Anti-Self-Confirmation
  // -------------------------------------------------------------
  // Attempt destructive action without approval -> creates proposal with token
  const unapprovedRes = await ToolRegistry.execute('reset_all_data', {});
  assert.strictEqual(unapprovedRes.status, OUTCOME.PENDING_APPROVAL);
  assert.strictEqual(unapprovedRes.approvalRequired, true);
  assert(unapprovedRes.proposal.token, 'Must issue approval token');
  const validToken = unapprovedRes.proposal.token;

  // Security test: Invalid token rejected
  const fakeTokenRes = await ToolRegistry.execute('reset_all_data', {}, { approvalToken: 'tok_fake_forged_token' });
  assert.strictEqual(fakeTokenRes.status, OUTCOME.PENDING_APPROVAL);

  // Security test: Valid token for wrong arguments / mismatched tool rejected
  const mismatchToolRes = await ToolRegistry.execute('manage_tasks', { action: 'delete', id: 999 }, { approvalToken: validToken });
  assert.strictEqual(mismatchToolRes.status, OUTCOME.PENDING_APPROVAL);

  // Valid execution with legitimate user approval token
  const approvedRes = await ToolRegistry.execute('reset_all_data', {}, { approvalToken: validToken });
  assert.strictEqual(approvedRes.ok, true);
  assert.strictEqual(approvedRes.status, OUTCOME.VERIFIED_DONE);

  // Single-use token test: Replay attack fails because token was consumed
  const replayTokenRes = await ToolRegistry.execute('reset_all_data', {}, { approvalToken: validToken });
  assert.strictEqual(replayTokenRes.status, OUTCOME.PENDING_APPROVAL, 'Consumed token must not be reusable');
  console.log('✓ Test 3: Single-use approval tokens enforce human confirmation and block AI self-approval');

  // -------------------------------------------------------------
  // Test 4: Bounded Tool Execution Rounds
  // -------------------------------------------------------------
  // Test pipeline stopping when max rounds (5) are exceeded
  const excessiveRoundRes = await ToolRegistry.executePipeline(
    [{ name: 'get_current_context', args: {} }],
    { round: 6, maxRounds: 5 }
  );
  assert.strictEqual(excessiveRoundRes.ok, false);
  assert.strictEqual(excessiveRoundRes.status, OUTCOME.FAILED);
  assert(excessiveRoundRes.error.includes('Exceeded maximum tool execution rounds'));
  console.log('✓ Test 4: Bounded tool execution rounds prevent runaway model recursion');

  // -------------------------------------------------------------
  // Test 5: Duplicate Tool Call / Infinite Loop Detection
  // -------------------------------------------------------------
  // Repeatedly calling the same tool with identical arguments within a turn
  const loopHistory = [
    { name: 'manage_tasks', argsHash: 'h_same_args', round: 1 },
    { name: 'manage_tasks', argsHash: 'h_same_args', round: 2 }
  ];

  // The 3rd identical call in the same turn triggers loop abort
  const loopAbortedRes = await ToolRegistry.executePipeline(
    [{ name: 'manage_tasks', args: { action: 'list' } }],
    {
      history: [
        // Compute actual hash of { action: 'list' }
        { name: 'manage_tasks', argsHash: ToolRegistry.createProposal('manage_tasks', { action: 'list' }).argsHash, round: 1 },
        { name: 'manage_tasks', argsHash: ToolRegistry.createProposal('manage_tasks', { action: 'list' }).argsHash, round: 2 }
      ]
    }
  );
  assert.strictEqual(loopAbortedRes.ok, false);
  assert.strictEqual(loopAbortedRes.status, OUTCOME.CANCELLED);
  assert(loopAbortedRes.error.includes('Runaway loop detected'));
  console.log('✓ Test 5: Duplicate tool call detector identifies and halts identical repeating calls');

  // -------------------------------------------------------------
  // Test 6: Per-Call Timeout and Cancellation via AbortSignal
  // -------------------------------------------------------------
  // Register slow tool
  ToolRegistry.register({
    name: 'slow_mock_operation',
    description: 'Simulates slow external operation',
    parameters: { type: 'OBJECT', properties: {} },
    risk: ToolRegistry.RISK.READ,
    execute: async () => {
      await new Promise(r => setTimeout(r, 200));
      return { done: true };
    }
  });

  // Timeout test: timeoutMs = 50ms should abort the 200ms operation
  const timeoutRes = await ToolRegistry.execute('slow_mock_operation', {}, { timeoutMs: 50 });
  assert.strictEqual(timeoutRes.ok, false);
  assert.strictEqual(timeoutRes.status, OUTCOME.FAILED);
  assert(timeoutRes.error.includes('timed out after 50ms'));

  // Cancellation test: AbortSignal triggered before or during call
  const cancelController = new AbortController();
  cancelController.abort(); // Pre-abort

  const cancelledRes = await ToolRegistry.execute('slow_mock_operation', {}, { abortSignal: cancelController.signal });
  assert.strictEqual(cancelledRes.ok, false);
  assert.strictEqual(cancelledRes.status, OUTCOME.CANCELLED);
  assert(cancelledRes.error.includes('cancelled before start'));
  console.log('✓ Test 6: Per-call execution timeouts and AbortSignal cancellation operate reliably');

  console.log('\n=============================================================');
  console.log('ALL 6 TESTS PASSED SUCCESSFULLY! MARK LVI MILESTONE 2 VERIFIED.');
  console.log('=============================================================');
}

runMilestone2Tests().catch(err => {
  console.error('\nTEST SUITE FAILED:', err);
  process.exit(1);
});
