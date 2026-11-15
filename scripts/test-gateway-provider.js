// ============================================================
// TADASHI AI Gateway Test Suite — OmniRoute & FreeLLMAPI Provider
// Tests preset selection, endpoint normalization, loopback classification,
// OpenAI tool & message schemas, function calling loop, and AIRouter dispatch.
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
  getTool: (name) => ({ name }),
  getGeminiDeclarations: () => [
    {
      name: 'manage_tasks',
      description: 'Manage tasks and projects',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: { type: 'STRING', enum: ['add', 'list'] },
          title: { type: 'STRING' }
        },
        required: ['action']
      }
    }
  ],
  execute: async (name, args, opts) => {
    if (opts && opts.isApproved === false) {
      return { ok: true, approvalRequired: false, proposal: null };
    }
    return { ok: true, result: { id: 101, title: args.title || 'New Task', status: 'created' } };
  }
};

// Mock AI module
global.AI = {
  hasKey: () => false,
  getModel: () => 'gemini-1.5-flash',
  buildSystemPrompt: () => 'You are TADASHI LifeOS autonomous core.',
  executeTool: async (name, args) => ({ ok: true, result: 'Tool executed' }),
  chat: async (msg) => `Direct AI: ${msg}`
};

// Load AI Router
require('../js/assistant/ai-router.js');

async function runGatewayTests() {
  console.log('--- STARTING AI GATEWAY SUITE: OMNIROUTE & FREELLMAPI ---');

  const { GatewayProvider, AIRouter } = window;
  assert(GatewayProvider, 'GatewayProvider must be exposed on window');
  assert(AIRouter, 'AIRouter must be exposed on window');

  // Test 1: Presets and Default Configurations
  assert(GatewayProvider.PRESETS.omniroute, 'OmniRoute preset must exist');
  assert(GatewayProvider.PRESETS.freellmapi, 'FreeLLMAPI preset must exist');
  assert.strictEqual(GatewayProvider.PRESETS.omniroute.defaultEndpoint, 'http://127.0.0.1:8080/v1');
  assert.strictEqual(GatewayProvider.PRESETS.freellmapi.defaultEndpoint, 'http://127.0.0.1:3001/v1');
  console.log('✓ Test 1: Presets for OmniRoute (port 8080) and FreeLLMAPI (port 3001) verified');

  // Test 2: Endpoint Normalization and Loopback Detection
  GatewayProvider.setEndpoint('http://127.0.0.1:8080');
  assert.strictEqual(GatewayProvider.getEndpoint(), 'http://127.0.0.1:8080/v1', 'Should automatically append /v1');

  GatewayProvider.setEndpoint('http://localhost:3001/v1/');
  assert.strictEqual(GatewayProvider.getEndpoint(), 'http://localhost:3001/v1', 'Should strip trailing slash');

  assert.strictEqual(GatewayProvider.isLoopback('http://127.0.0.1:8080/v1'), true);
  assert.strictEqual(GatewayProvider.isLoopback('http://localhost:3001/v1'), true);
  assert.strictEqual(GatewayProvider.isLoopback('https://api.openai.com/v1'), false);
  console.log('✓ Test 2: Endpoint normalization and private loopback classification verified');

  // Test 3: OpenAI Tool Schema Transformation
  const rawTools = ToolRegistry.getGeminiDeclarations();
  const openAITools = GatewayProvider.formatTools(rawTools);
  assert.strictEqual(openAITools.length, 1);
  assert.strictEqual(openAITools[0].type, 'function');
  assert.strictEqual(openAITools[0].function.name, 'manage_tasks');
  assert.deepStrictEqual(openAITools[0].function.parameters.required, ['action']);
  console.log('✓ Test 3: Tools formatted into OpenAI standard function-calling schema');

  // Test 4: OpenAI Message Array Builder
  const messages = [
    { role: 'user', content: 'Hello TADASHI' },
    { role: 'tadashi', content: 'Greetings Krishna' }
  ];
  const formattedMsgs = GatewayProvider.buildOpenAIMessages(messages, { prompt: 'Add task' });
  assert.strictEqual(formattedMsgs[0].role, 'system');
  assert.strictEqual(formattedMsgs[0].content, 'You are TADASHI LifeOS autonomous core.');
  assert.strictEqual(formattedMsgs[1].role, 'user');
  assert.strictEqual(formattedMsgs[1].content, 'Hello TADASHI');
  assert.strictEqual(formattedMsgs[2].role, 'assistant');
  assert.strictEqual(formattedMsgs[2].content, 'Greetings Krishna');
  assert.strictEqual(formattedMsgs[3].role, 'user');
  assert.strictEqual(formattedMsgs[3].content, 'Add task');
  console.log('✓ Test 4: System instruction and message turns correctly formatted for OpenAI API');

  // Test 5: Simulated Chat with OpenAI Tool Calling Loop
  let chatCallCount = 0;
  global.fetch = async (url, opts) => {
    if (url.includes('/models')) {
      return {
        ok: true,
        json: async () => ({ data: [{ id: 'auto' }, { id: 'deepseek-chat' }, { id: 'gemini-1.5-flash' }] })
      };
    }
    if (url.includes('/chat/completions')) {
      chatCallCount++;
      const body = JSON.parse(opts.body);
      // Turn 1: Return a tool call to manage_tasks
      if (chatCallCount === 1) {
        return {
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [{
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'manage_tasks',
                    arguments: JSON.stringify({ action: 'add', title: 'Buy milk' })
                  }
                }]
              }
            }]
          })
        };
      }
      // Turn 2: Final text response confirming tool execution
      return {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              role: 'assistant',
              content: 'I have added "Buy milk" to your task list.'
            }
          }]
        })
      };
    }
    throw new Error('Unknown URL: ' + url);
  };

  const executedTools = [];
  const genResult = await GatewayProvider.generate(
    [{ role: 'user', content: 'Buy milk' }],
    rawTools,
    {
      onToolCall: (name, args, res) => executedTools.push({ name, args, res })
    }
  );

  assert(genResult.ok, 'Generation should succeed');
  assert.strictEqual(genResult.provider, 'gateway');
  assert.strictEqual(genResult.text, 'I have added "Buy milk" to your task list.');
  assert.strictEqual(genResult.toolCalls.length, 1);
  assert.strictEqual(genResult.toolCalls[0].name, 'manage_tasks');
  assert.strictEqual(executedTools.length, 1);
  assert.strictEqual(executedTools[0].name, 'manage_tasks');
  console.log('✓ Test 5: OpenAI function calling loop and tool feedback verified');

  // Test 6: Connection Health Check
  const health = await GatewayProvider.checkHealth();
  assert(health.ok, 'Health check should be ok');
  assert.strictEqual(health.status, 'ready');
  assert.strictEqual(health.modelsCount, 3);
  console.log('✓ Test 6: Gateway connection diagnostics and model listing verified');

  // Test 7: AIRouter Policy Resolution with Gateway Enabled
  GatewayProvider.setEnabled(true);
  assert.strictEqual(GatewayProvider.isEnabled(), true);

  const route = await AIRouter.resolveRoute({});
  assert.strictEqual(route.selectedProvider.id, 'openai_gateway');
  assert.strictEqual(route.routeDecision, 'gateway_primary');
  console.log('✓ Test 7: AIRouter resolves Gateway as primary when enabled and healthy');

  // Test 8: Privacy Mode Enforcement with Local Gateway
  AIRouter.setPrivacyMode('local_only');
  GatewayProvider.setEndpoint('http://127.0.0.1:8080/v1'); // Loopback
  const privacyRouteLocal = await AIRouter.resolveRoute({ privacy: 'local_only' });
  assert.strictEqual(privacyRouteLocal.selectedProvider.id, 'openai_gateway');
  assert.strictEqual(privacyRouteLocal.routeDecision, 'gateway_privacy_enforced');
  console.log('✓ Test 8a: Local loopback Gateway (OmniRoute/FreeLLMAPI) permitted in local-only privacy mode');

  GatewayProvider.setEndpoint('https://remote.gateway.ai/v1'); // Remote
  const privacyRouteRemote = await AIRouter.resolveRoute({ privacy: 'local_only' });
  assert.strictEqual(privacyRouteRemote.selectedProvider, null);
  assert(privacyRouteRemote.error.includes('strictly blocked from cloud transit') || privacyRouteRemote.error.includes('requires a local loopback'));
  console.log('✓ Test 8b: Remote online Gateway strictly blocked under local-only privacy policy');

  console.log('\nALL 8 TESTS PASSED! AI GATEWAY (OMNIROUTE & FREELLMAPI) CONTRACT VERIFIED.');
}

runGatewayTests().catch(err => {
  console.error('\nGATEWAY TEST SUITE FAILED:', err);
  process.exit(1);
});
