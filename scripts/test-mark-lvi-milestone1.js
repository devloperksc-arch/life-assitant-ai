// ============================================================
// TADASHI — Mark LVI Milestone 1 Test Suite
// Verifies: Local Ollama Hardening, Capability Profiling,
// Model Discovery, Offline Continuity, Zero-Cloud Leakage,
// Streaming/Cancellation, and PC Companion Agent Local Routing.
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

// Track all outbound network requests to verify ZERO CLOUD LEAKAGE
const networkAuditLog = [];
let mockOllamaResponses = {};

global.fetch = async (url, options = {}) => {
  const urlStr = String(url);
  networkAuditLog.push({ url: urlStr, method: options.method || 'GET', body: options.body });

  // Handle AbortSignal
  if (options.signal && options.signal.aborted) {
    const err = new Error('The operation was aborted');
    err.name = 'AbortError';
    throw err;
  }

  // Intercept Ollama Loopback
  if (urlStr.includes('11434') || urlStr.includes('127.0.0.1') || urlStr.includes('localhost')) {
    if (mockOllamaResponses.offline) {
      const err = new Error('connect ECONNREFUSED 127.0.0.1:11434');
      err.code = 'ECONNREFUSED';
      throw err;
    }
    if (mockOllamaResponses.timeout) {
      await new Promise(r => setTimeout(r, 200));
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      throw err;
    }

    if (urlStr.endsWith('/api/version')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ version: mockOllamaResponses.version || '0.4.1' }),
        text: async () => JSON.stringify({ version: mockOllamaResponses.version || '0.4.1' })
      };
    }

    if (urlStr.endsWith('/api/tags')) {
      const models = mockOllamaResponses.models !== undefined
        ? mockOllamaResponses.models
        : [{ name: 'llama3.2:latest', size: 2019393152, modified_at: '2026-11-01', details: { parameter_size: '3.2B', family: 'llama' } }];
      return {
        ok: true,
        status: 200,
        json: async () => ({ models }),
        text: async () => JSON.stringify({ models })
      };
    }

    if (urlStr.endsWith('/api/generate')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ response: '', done: true }),
        text: async () => JSON.stringify({ response: '', done: true })
      };
    }

    if (urlStr.endsWith('/api/chat')) {
      const parsedBody = options.body ? JSON.parse(options.body) : {};
      const isStream = parsedBody.stream === true;
      if (isStream) {
        // Return stream-compatible mock
        const chunks = [
          JSON.stringify({ message: { role: 'assistant', content: 'Hello ' }, done: false }) + '\n',
          JSON.stringify({ message: { role: 'assistant', content: 'from local Ollama!' }, done: true }) + '\n'
        ];
        return {
          ok: true,
          status: 200,
          body: {
            getReader: () => {
              let idx = 0;
              const encoder = new TextEncoder();
              return {
                read: async () => {
                  if (options.signal && options.signal.aborted) {
                    const err = new Error('The operation was aborted');
                    err.name = 'AbortError';
                    throw err;
                  }
                  if (idx >= chunks.length) return { done: true, value: undefined };
                  const val = encoder.encode(chunks[idx++]);
                  return { done: false, value: val };
                }
              };
            }
          }
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          message: {
            role: 'assistant',
            content: `Local response to: ${parsedBody.messages?.[0]?.content || ''}`,
            tool_calls: parsedBody.tools ? [{ function: { name: 'manage_tasks', arguments: { action: 'list' } } }] : []
          }
        }),
        text: async () => JSON.stringify({ message: { role: 'assistant', content: 'Local response' } })
      };
    }
  }

  // Intercept Cloud (Gemini)
  if (urlStr.includes('generativelanguage.googleapis.com')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Cloud Gemini response' }] } }] })
    };
  }

  // Intercept PC Agent Heartbeat
  if (urlStr.endsWith('/agent/heartbeat')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ received: true })
    };
  }

  return { ok: false, status: 404, text: async () => 'Not found' };
};

// Mock ToolRegistry with 20 dummy tools for testing capability budgeting
const generateMockTools = (count) => {
  const tools = [
    { name: 'manage_tasks', description: 'Tasks domain', parameters: { type: 'OBJECT', properties: {} } },
    { name: 'manage_calendar', description: 'Calendar domain', parameters: { type: 'OBJECT', properties: {} } },
    { name: 'get_wellbeing', description: 'Wellbeing metrics', parameters: { type: 'OBJECT', properties: {} } },
    { name: 'search_knowledge', description: 'Vault search', parameters: { type: 'OBJECT', properties: {} } }
  ];
  for (let i = 5; i <= count; i++) {
    tools.push({
      name: `domain_tool_${i}`,
      description: `Description for tool ${i}`,
      parameters: { type: 'OBJECT', properties: { id: { type: 'STRING' } } }
    });
  }
  return tools;
};

global.ToolRegistry = {
  getGeminiDeclarations: () => generateMockTools(20)
};

// Mock AI module
global.AI = {
  hasKey: () => false,
  getModel: () => 'gemini-1.5-flash',
  chat: async (msg) => `Cloud reply: ${msg}`
};

// Load Modules
require('../js/assistant/ai-router.js');
const { PCAgent } = require('../server/src/agent/pc-agent');

async function runMilestone1Tests() {
  console.log('--- STARTING MARK LVI MILESTONE 1 SUITE: LOCAL OLLAMA CORE ---');

  // -------------------------------------------------------------
  // Test 1: Configurable Host, Model, Timeout & Loopback Boundary
  // -------------------------------------------------------------
  const provider = AIRouter.providers.ollama;
  assert.strictEqual(provider.id, 'ollama_local');
  assert.strictEqual(provider.getHost(), 'http://127.0.0.1:11434');
  assert.strictEqual(provider.getModel(), 'llama3.2:latest');

  // Verify Loopback Classification
  assert.strictEqual(provider.isLoopback('http://127.0.0.1:11434'), true);
  assert.strictEqual(provider.isLoopback('http://localhost:11434'), true);
  assert.strictEqual(provider.isLoopback('http://[::1]:11434'), true);
  assert.strictEqual(provider.isLoopback('http://192.168.1.55:11434'), false);
  assert.strictEqual(provider.isLoopback('https://remote.ollama.cloud'), false);

  assert.strictEqual(provider.classifyEndpoint('http://127.0.0.1:11434'), 'local');
  assert.strictEqual(provider.classifyEndpoint('https://remote.ollama.cloud'), 'remote_online');

  // Custom configuration persistence
  provider.setHost('http://127.0.0.1:11435');
  provider.setModel('qwen2.5:7b');
  provider.setTimeout(45000);
  assert.strictEqual(provider.getHost(), 'http://127.0.0.1:11435');
  assert.strictEqual(provider.getModel(), 'qwen2.5:7b');
  assert.strictEqual(provider.getTimeout(), 45000);

  // Restore defaults
  provider.setHost('http://127.0.0.1:11434');
  provider.setModel('llama3.2:latest');
  provider.setTimeout(30000);
  console.log('✓ Test 1: Configurable host, model, timeout, and loopback security boundary verified');

  // -------------------------------------------------------------
  // Test 2: Connection Health Diagnostics & Model Discovery
  // -------------------------------------------------------------
  // Case A: Daemon Offline (Connection refused)
  mockOllamaResponses = { offline: true };
  const healthOffline = await provider.checkHealth(500);
  assert.strictEqual(healthOffline.ok, false);
  assert.strictEqual(healthOffline.status, 'offline');
  assert(healthOffline.error.includes('Ollama daemon is not running'), 'Must report daemon offline');

  // Case B: Daemon Online, but No Models Pulled
  mockOllamaResponses = { offline: false, models: [] };
  const healthNoModels = await provider.checkHealth(500);
  assert.strictEqual(healthNoModels.ok, true);
  assert.strictEqual(healthNoModels.status, 'no_models');
  assert(healthNoModels.warning.includes('no models are installed'), 'Must report no models installed');

  // Case C: Daemon Online, Models Pulled, but Configured Model Missing
  mockOllamaResponses = {
    offline: false,
    models: [{ name: 'mistral:7b', size: 4000000000 }]
  };
  provider.setModel('llama3.2:latest');
  const healthMissingModel = await provider.checkHealth(500);
  assert.strictEqual(healthMissingModel.ok, true);
  assert.strictEqual(healthMissingModel.status, 'model_missing');
  assert(healthMissingModel.warning.includes('llama3.2:latest'), 'Must warn that configured model is missing');

  // Case D: Ready State (Ollama running, version detected, model installed)
  mockOllamaResponses = {
    offline: false,
    version: '0.4.1',
    models: [{ name: 'llama3.2:latest', size: 2019393152, details: { parameter_size: '3.2B', family: 'llama' } }]
  };
  const healthReady = await provider.checkHealth(500);
  assert.strictEqual(healthReady.ok, true);
  assert.strictEqual(healthReady.status, 'ready');
  assert.strictEqual(healthReady.version, '0.4.1');
  assert.strictEqual(healthReady.models.length, 1);

  // Model list enumeration
  const modelList = await provider.listModels();
  assert.strictEqual(modelList.length, 1);
  assert.strictEqual(modelList[0].name, 'llama3.2:latest');
  assert.strictEqual(modelList[0].parameterSize, '3.2B');
  console.log('✓ Test 2: Connection health diagnostics and model enumeration verified across all states');

  // -------------------------------------------------------------
  // Test 3: Model Capability Profiling & Tool Exposure Budgeting
  // -------------------------------------------------------------
  const compactProfile = provider.getModelProfile('llama3.2:3b');
  assert.strictEqual(compactProfile.tier, 'compact');
  assert.strictEqual(compactProfile.contextBudget, 4096);
  assert.strictEqual(compactProfile.maxTools, 5);

  const standardProfile = provider.getModelProfile('llama3.1:8b');
  assert.strictEqual(standardProfile.tier, 'standard');
  assert.strictEqual(standardProfile.contextBudget, 8192);
  assert.strictEqual(standardProfile.maxTools, 12);

  const largeProfile = provider.getModelProfile('qwen2.5:32b');
  assert.strictEqual(largeProfile.tier, 'large');
  assert.strictEqual(largeProfile.contextBudget, 32768);
  assert.strictEqual(largeProfile.maxTools, 30);

  // Pruning: Out of 20 mock tools, compact model must get only 5 high-priority tools
  const raw20Tools = ToolRegistry.getGeminiDeclarations();
  const prunedTools = provider.pruneToolsForModel(raw20Tools, 'llama3.2:3b');
  assert.strictEqual(prunedTools.length, 5);
  assert.strictEqual(prunedTools[0].name, 'manage_tasks');
  assert.strictEqual(prunedTools[1].name, 'manage_calendar');
  assert.strictEqual(prunedTools[2].name, 'get_wellbeing');
  console.log('✓ Test 3: Capability profiling accurately budgets and trims tool exposures for small models');

  // -------------------------------------------------------------
  // Test 4: Warm-Up Ping Execution
  // -------------------------------------------------------------
  const warmUpRes = await provider.warmUp('llama3.2:latest');
  assert.strictEqual(warmUpRes.ok, true);
  assert.strictEqual(warmUpRes.warmed, true);
  console.log('✓ Test 4: Model warm-up ping preloads weights into local memory');

  // -------------------------------------------------------------
  // Test 5: Local Execution with Internet Disabled (Offline Continuity)
  // -------------------------------------------------------------
  navigator.onLine = false; // Internet DISCONNECTED
  AIRouter.setPrivacyMode('cloud_allowed');
  mockOllamaResponses = {
    offline: false,
    version: '0.4.1',
    models: [{ name: 'llama3.2:latest' }]
  };

  const offlineChatReply = await AIRouter.chat('Add task write documentation');
  assert.strictEqual(offlineChatReply.ok, true);
  assert.strictEqual(offlineChatReply.provider, 'ollama');
  assert(offlineChatReply.text.includes('Local response to: Add task write documentation'));
  console.log('✓ Test 5: TADASHI completes text requests locally when internet is completely disconnected');

  // -------------------------------------------------------------
  // Test 6: Strict `local_only` Zero Cloud Leakage Guarantee
  // -------------------------------------------------------------
  navigator.onLine = true; // Internet is back
  AIRouter.setPrivacyMode('local_only');
  networkAuditLog.length = 0; // Reset audit trail

  // Chat under local_only
  const privacyReply = await AIRouter.chat('My private note about health');
  assert.strictEqual(privacyReply.provider, 'ollama');

  // Verify that ZERO external/cloud calls were made
  const cloudCalls = networkAuditLog.filter(call =>
    !call.url.includes('11434') && !call.url.includes('127.0.0.1') && !call.url.includes('localhost')
  );
  assert.strictEqual(cloudCalls.length, 0, 'Zero cloud calls must be made under local_only privacy mode');

  // Verify that if a remote non-loopback host is configured, local_only refuses to dispatch
  provider.setHost('https://remote.ollama.lan:11434');
  const remoteRoute = await AIRouter.resolveRoute({ privacy: 'local_only' });
  assert.strictEqual(remoteRoute.selectedProvider, null);
  assert.strictEqual(remoteRoute.routeDecision, 'blocked_privacy_remote_host');
  assert(remoteRoute.error.includes('requires a local loopback Ollama host'), 'Must reject remote host under local_only');

  provider.setHost('http://127.0.0.1:11434'); // Restore loopback
  console.log('✓ Test 6: Zero cloud leakage verified; non-loopback hosts strictly blocked in local_only mode');

  // -------------------------------------------------------------
  // Test 7: Streaming Chunk Handling & Cancellation via AbortController
  // -------------------------------------------------------------
  let streamedChunks = [];
  const abortCtrl = new AbortController();

  const streamResult = await provider.generateStream(
    [{ role: 'user', content: 'Tell me a story' }],
    [],
    { signal: abortCtrl.signal },
    (chunk) => {
      streamedChunks.push(chunk.chunk);
    }
  );

  assert.strictEqual(streamResult.ok, true);
  assert.strictEqual(streamResult.text, 'Hello from local Ollama!');
  assert(streamedChunks.length >= 2, 'Must receive streamed tokens incrementally');

  // Verify cancellation with aborted controller
  const preAbortedCtrl = new AbortController();
  preAbortedCtrl.abort();

  await assert.rejects(
    async () => {
      await provider.generateStream([{ role: 'user', content: 'Cancelled prompt' }], [], { signal: preAbortedCtrl.signal });
    },
    (err) => {
      return err.name === 'AbortError' || err.message.includes('aborted');
    },
    'Aborted controller must cancel generation cleanly'
  );
  console.log('✓ Test 7: Streaming chunk assembly and AbortController cancellation verified');

  // -------------------------------------------------------------
  // Test 8: PC Companion Agent Local Query & Chat Routing
  // -------------------------------------------------------------
  const pcAgent = new PCAgent({
    deviceId: 'dev_pc_mark_lvi_test',
    cloudServerUrl: 'http://127.0.0.1:3000',
    sessionToken: 'valid_session_token_123',
    ollamaUrl: 'http://127.0.0.1:11434'
  });

  const discoveredModels = await pcAgent.queryOllamaModels();
  assert.strictEqual(discoveredModels.ok, true);
  assert.strictEqual(discoveredModels.version, '0.4.1');
  assert.strictEqual(discoveredModels.models.length, 1);

  const pcChatResult = await pcAgent.chatWithOllama(
    [{ role: 'user', content: 'Local PC agent test' }],
    [{ name: 'manage_tasks', description: 'Tasks', parameters: {} }]
  );
  assert.strictEqual(pcChatResult.ok, true);
  assert(pcChatResult.text.includes('Local response'));
  assert.strictEqual(pcChatResult.toolCalls.length, 1);
  assert.strictEqual(pcChatResult.toolCalls[0].name, 'manage_tasks');

  // Test Heartbeat Payload with Ollama Telemetry
  networkAuditLog.length = 0;
  const heartbeatRes = await pcAgent.sendHeartbeat();
  assert.strictEqual(heartbeatRes.ok, true);
  const heartbeatPayload = JSON.parse(networkAuditLog.find(c => c.url.endsWith('/agent/heartbeat')).body);
  assert.strictEqual(heartbeatPayload.ollamaOnline, true);
  assert.strictEqual(heartbeatPayload.ollamaVersion, '0.4.1');
  assert.deepStrictEqual(heartbeatPayload.ollamaModels, ['llama3.2:latest']);
  console.log('✓ Test 8: PC Companion Agent successfully queries local Ollama, dispatches chat, and reports heartbeat telemetry');

  console.log('\n=============================================================');
  console.log('ALL 8 TESTS PASSED SUCCESSFULLY! MARK LVI MILESTONE 1 VERIFIED.');
  console.log('=============================================================');
}

runMilestone1Tests().catch(err => {
  console.error('\nTEST SUITE FAILED:', err);
  process.exit(1);
});
