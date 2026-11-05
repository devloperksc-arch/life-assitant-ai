// ============================================================
// TADASHI Phase 5 Test Suite — Hybrid AI Routing (Ollama + Cloud)
// Tests provider-neutral contracts, local-only privacy enforcement,
// offline resilience, tool schema compatibility, and telemetry.
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
global.performance = global.performance || { now: () => Date.now() };

// Mock ToolRegistry
global.ToolRegistry = {
  getGeminiDeclarations: () => [
    {
      name: 'manage_tasks',
      description: 'Manage tasks and projects',
      parameters: { type: 'OBJECT', properties: { action: { type: 'STRING' } }, required: ['action'] }
    }
  ]
};

// Mock AI module
global.AI = {
  hasKey: () => false, // Initially no cloud key
  getModel: () => 'gemini-1.5-flash',
  chat: async (msg) => `Cloud reply: ${msg}`
};

// Load AI Router & Server Router
require('../js/assistant/ai-router.js');
const { handleAIChat } = require('../server/src/ai/router');

async function runPhase5Tests() {
  console.log('--- STARTING PHASE 5 SUITE: HYBRID AI ROUTING ---');

  // Test 1: Tool Schema Transformation for Local Models
  const tools = ToolRegistry.getGeminiDeclarations();
  const ollamaTools = AIRouter.providers.ollama.formatTools(tools);
  assert.strictEqual(ollamaTools.length, 1);
  assert.strictEqual(ollamaTools[0].type, 'function');
  assert.strictEqual(ollamaTools[0].function.name, 'manage_tasks');
  assert.strictEqual(ollamaTools[0].function.description, 'Manage tasks and projects');
  console.log('✓ Test 1: Tool schema formats cleanly for local function-calling models');

  // Test 2: Local Loopback Host Security
  const defaultHost = AIRouter.providers.ollama.getHost();
  assert(defaultHost.includes('127.0.0.1') || defaultHost.includes('localhost'), 'Ollama host must be strictly bound to loopback');
  console.log(`✓ Test 2: Ollama host strictly bound to private loopback interface (${defaultHost})`);

  // Test 3: Local-Only Privacy Policy Enforcement (Local Offline)
  AIRouter.setPrivacyMode('local_only');
  assert.strictEqual(AIRouter.getPrivacyMode(), 'local_only');

  const routePrivacyBlocked = await AIRouter.resolveRoute({ privacy: 'local_only' });
  // Since mock fetch fails on 11434 in unit test, local Ollama is offline
  assert.strictEqual(routePrivacyBlocked.selectedProvider, null);
  assert.strictEqual(routePrivacyBlocked.routeDecision, 'blocked_local_offline');
  assert(routePrivacyBlocked.error.includes('strictly blocked from cloud transit'), 'Must enforce privacy and block cloud transit');
  console.log('✓ Test 3: Local-only privacy policy blocks cloud transit when local model is offline');

  // Test 4: Server-Side Local-Only Rejection
  const serverRejection = await handleAIChat({ id: 'user_1' }, { id: 'dev_1' }, { privacy: 'local_only' });
  assert.strictEqual(serverRejection.ok, false);
  assert.strictEqual(serverRejection.status, 400);
  assert(serverRejection.error.includes('local_only must be executed on-device'), 'Server must reject local-only payload');
  console.log('✓ Test 4: Backend server enforces privacy by rejecting local-only data');

  // Test 5: Graceful Degradation when Completely Offline
  navigator.onLine = false;
  AIRouter.setPrivacyMode('cloud_allowed');
  const routeOffline = await AIRouter.resolveRoute({});
  assert.strictEqual(routeOffline.selectedProvider, null);
  assert.strictEqual(routeOffline.routeDecision, 'deterministic_offline_only');
  assert(routeOffline.error.includes('Core LifeOS deterministic tools remain available'), 'Must report deterministic fallback');
  console.log('✓ Test 5: Offline disconnect gracefully falls back to deterministic tools');

  // Test 6: Cloud Provider Resolution when Online with Key
  navigator.onLine = true;
  global.AI.hasKey = () => true; // User configured Gemini key
  const routeCloud = await AIRouter.resolveRoute({});
  assert.strictEqual(routeCloud.selectedProvider.id, 'gemini_cloud');
  assert.strictEqual(routeCloud.routeDecision, 'cloud_primary');
  console.log('✓ Test 6: Online requests route to cloud primary when configured');

  // Test 7: Cloud Chat Execution & Telemetry Recording
  AIRouter.clearTelemetry();
  const reply = await AIRouter.chat('Summarize today', [], { taskClass: 'summarization' });
  assert(reply.ok, 'Chat reply must be ok');
  assert.strictEqual(reply.provider, 'gemini');
  assert(reply.latencyMs >= 0, 'Must record latency');

  const telemetry = AIRouter.getTelemetry();
  assert.strictEqual(telemetry.length, 1);
  assert.strictEqual(telemetry[0].provider, 'gemini');
  assert.strictEqual(telemetry[0].taskClass, 'summarization');
  assert.strictEqual(telemetry[0].status, 'success');
  console.log('✓ Test 7: Chat execution records privacy-safe telemetry (Zero PII / keys)');

  // Test 8: Telemetry Sanitization & Privacy Safety
  const entry = telemetry[0];
  assert(!entry.key, 'Telemetry must NOT log API keys');
  assert(!entry.token, 'Telemetry must NOT log tokens');
  assert(!entry.prompt, 'Telemetry must NOT log raw user prompts');
  console.log('✓ Test 8: Telemetry log contains only performance & operational metrics');

  console.log('\nALL 8 TESTS PASSED SUCCESSFULLY! PHASE 5 HYBRID AI ROUTING VERIFIED.');
}

runPhase5Tests().catch(err => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
