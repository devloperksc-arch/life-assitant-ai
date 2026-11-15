// ============================================================
// TADASHI LifeOS — Free-Only Dual-Gateway Acceptance Test Suite
// Specification: TADASHI_Free_Only_Dual_Gateway_Vercel_Handoff_v2.md (Section 7)
// ============================================================

const assert = require('assert');
const http = require('http');
const { handleAIChat, getGatewayStatus, getAITelemetry, validateFreeModel, isEligibleForFailover, CONFIG } = require('../server/src/ai/router');

// Helper to spin up a mock HTTP server on an ephemeral port
function createMockServer(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        server,
        url: `http://127.0.0.1:${port}/v1`,
        close: () => new Promise(r => server.close(r))
      });
    });
  });
}

async function runDualGatewaySuite() {
  console.log('--- STARTING FREE-ONLY DUAL-GATEWAY TEST SUITE ---');

  // Save original environment
  const origEnv = { ...process.env };

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Model Allowlist Validation (Free-only, paid strictly blocked)
    // ------------------------------------------------------------------------
    console.log('\n[Test 1] Free-model allowlist validation & paid model rejection');
    process.env.AI_ROUTING_MODE = 'free_only';
    process.env.AI_PAID_MODELS_BLOCKED = 'true';
    process.env.AI_FREE_MODEL_ALLOWLIST = 'meta-llama/llama-3.2-3b-instruct:free,meta-llama/llama-3.1-8b-instruct:free,gemini-2.5-flash,qwen/*';

    const allowed1 = validateFreeModel('meta-llama/llama-3.2-3b-instruct:free');
    assert.strictEqual(allowed1.ok, true, 'Llama 3.2 3B free must be allowed');

    const allowedWildcard = validateFreeModel('qwen/qwen-2.5-7b-instruct:free');
    assert.strictEqual(allowedWildcard.ok, true, 'Wildcard qwen/* must allow qwen model');

    const blockedPaid1 = validateFreeModel('gpt-4o');
    assert.strictEqual(blockedPaid1.ok, false, 'gpt-4o must be blocked');
    assert.ok(blockedPaid1.error.includes('allowlist'), 'Error must cite allowlist');

    const blockedPaid2 = validateFreeModel('claude-3-5-sonnet');
    assert.strictEqual(blockedPaid2.ok, false, 'claude-3-5-sonnet must be blocked');

    console.log('✓ Test 1 Passed: Free models allowed; paid models strictly blocked.');

    // ------------------------------------------------------------------------
    // TEST 2: Local-Only Privacy Policy Enforcement
    // ------------------------------------------------------------------------
    console.log('\n[Test 2] Privacy gate: local_only requests strictly rejected on cloud server');
    const localOnlyRes = await handleAIChat(
      { id: 'user_1' },
      { id: 'dev_1' },
      { privacy: 'local_only', messages: [{ role: 'user', content: 'test' }] }
    );
    assert.strictEqual(localOnlyRes.ok, false);
    assert.strictEqual(localOnlyRes.status, 400);
    assert.ok(localOnlyRes.error.includes('local_only'), 'Must explain local_only privacy requirement');
    console.log('✓ Test 2 Passed: local_only request safely blocked from remote cloud server transit.');

    // ------------------------------------------------------------------------
    // TEST 3: Failover Eligibility Logic
    // ------------------------------------------------------------------------
    console.log('\n[Test 3] Failover eligibility validation');
    assert.strictEqual(isEligibleForFailover(0, 'ECONNREFUSED'), true, 'ECONNREFUSED must failover');
    assert.strictEqual(isEligibleForFailover(408, 'timeout'), true, '408 must failover');
    assert.strictEqual(isEligibleForFailover(429, 'Rate limited'), true, '429 must failover');
    assert.strictEqual(isEligibleForFailover(502, 'Bad Gateway'), true, '502 must failover');
    assert.strictEqual(isEligibleForFailover(503, 'Service Unavailable'), true, '503 must failover');

    // Non-failover statuses (client or configuration errors)
    assert.strictEqual(isEligibleForFailover(400, 'Bad Request'), false, '400 must NOT failover');
    assert.strictEqual(isEligibleForFailover(401, 'Unauthorized'), false, '401 must NOT failover');
    assert.strictEqual(isEligibleForFailover(403, 'Forbidden'), false, '403 must NOT failover');
    assert.strictEqual(isEligibleForFailover(422, 'Unprocessable'), false, '422 must NOT failover');
    console.log('✓ Test 3 Passed: Transient network/5xx/429 fail over; 400/401/403 fail immediately.');

    // ------------------------------------------------------------------------
    // TEST 4: Primary Gateway (OmniRoute) Successful Request
    // ------------------------------------------------------------------------
    console.log('\n[Test 4] Primary gateway (OmniRoute) healthy response');
    let omniCallCount = 0;
    const omniMock = await createMockServer((req, res) => {
      omniCallCount++;
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        const parsed = JSON.parse(body);
        assert.strictEqual(req.headers['authorization'], 'Bearer test-omni-key');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          id: 'chatcmpl-omni-123',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'Hello from OmniRoute primary!' }
          }],
          model: parsed.model
        }));
      });
    });

    process.env.OMNIROUTE_BASE_URL = omniMock.url;
    process.env.OMNIROUTE_API_KEY = 'test-omni-key';
    process.env.OMNIROUTE_MODEL = 'meta-llama/llama-3.2-3b-instruct:free';
    process.env.FREELLMAPI_BASE_URL = ''; // No secondary needed for test 4

    const resPrimary = await handleAIChat(
      { id: 'user_1' },
      { id: 'dev_1' },
      { model: 'meta-llama/llama-3.2-3b-instruct:free', messages: [{ role: 'user', content: 'hi' }] }
    );

    assert.strictEqual(resPrimary.ok, true);
    assert.strictEqual(resPrimary.provider, 'omniroute');
    assert.strictEqual(resPrimary.choices[0].message.content, 'Hello from OmniRoute primary!');
    assert.strictEqual(omniCallCount, 1);
    await omniMock.close();
    console.log('✓ Test 4 Passed: Primary gateway invoked and succeeded without secondary call.');

    // ------------------------------------------------------------------------
    // TEST 5: Primary Network Failure triggers Secondary (FreeLLMAPI) Failover
    // ------------------------------------------------------------------------
    console.log('\n[Test 5] Primary network error (ECONNREFUSED) triggers FreeLLMAPI failover');
    let freeCallCount = 0;
    const freeMock = await createMockServer((req, res) => {
      freeCallCount++;
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        const parsed = JSON.parse(body);
        assert.strictEqual(req.headers['authorization'], 'Bearer test-free-key');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          id: 'chatcmpl-free-456',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'Hello from FreeLLMAPI secondary failover!' }
          }],
          model: parsed.model
        }));
      });
    });

    // Dead port for primary to trigger ECONNREFUSED
    process.env.OMNIROUTE_BASE_URL = 'http://127.0.0.1:59999/v1';
    process.env.FREELLMAPI_BASE_URL = freeMock.url;
    process.env.FREELLMAPI_API_KEY = 'test-free-key';
    process.env.FREELLMAPI_MODEL = 'meta-llama/llama-3.2-3b-instruct:free';

    const resFailover = await handleAIChat(
      { id: 'user_1' },
      { id: 'dev_1' },
      { model: 'meta-llama/llama-3.2-3b-instruct:free', messages: [{ role: 'user', content: 'hi' }] }
    );

    assert.strictEqual(resFailover.ok, true);
    assert.strictEqual(resFailover.provider, 'freellmapi');
    assert.strictEqual(resFailover.failoverFrom, 'omniroute');
    assert.strictEqual(resFailover.choices[0].message.content, 'Hello from FreeLLMAPI secondary failover!');
    assert.strictEqual(freeCallCount, 1);
    await freeMock.close();
    console.log('✓ Test 5 Passed: Network failure triggered clean failover to FreeLLMAPI.');

    // ------------------------------------------------------------------------
    // TEST 6: Primary 429 (Rate Limit / Quota) triggers Secondary Failover
    // ------------------------------------------------------------------------
    console.log('\n[Test 6] Primary 429 quota exhaustion triggers FreeLLMAPI failover');
    const omni429Mock = await createMockServer((req, res) => {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Rate limit exceeded on free tier' } }));
    });

    const free2Mock = await createMockServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: 'chatcmpl-free-789',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Fallback from 429 succeeded!' } }]
      }));
    });

    process.env.OMNIROUTE_BASE_URL = omni429Mock.url;
    process.env.FREELLMAPI_BASE_URL = free2Mock.url;

    const res429Failover = await handleAIChat(
      { id: 'user_1' },
      { id: 'dev_1' },
      { model: 'meta-llama/llama-3.2-3b-instruct:free', messages: [{ role: 'user', content: 'hi' }] }
    );

    assert.strictEqual(res429Failover.ok, true);
    assert.strictEqual(res429Failover.provider, 'freellmapi');
    assert.strictEqual(res429Failover.choices[0].message.content, 'Fallback from 429 succeeded!');
    await omni429Mock.close();
    await free2Mock.close();
    console.log('✓ Test 6 Passed: 429 rate limit successfully triggered FreeLLMAPI failover.');

    // ------------------------------------------------------------------------
    // TEST 7: Primary 401 Auth Error does NOT trigger failover (fails immediately)
    // ------------------------------------------------------------------------
    console.log('\n[Test 7] Primary 401 Auth error does NOT failover');
    let freeNeverCalled = 0;
    const omni401Mock = await createMockServer((req, res) => {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Invalid API key provided' } }));
    });
    const freeNeverMock = await createMockServer((req, res) => {
      freeNeverCalled++;
      res.writeHead(200);
      res.end('{}');
    });

    process.env.OMNIROUTE_BASE_URL = omni401Mock.url;
    process.env.FREELLMAPI_BASE_URL = freeNeverMock.url;

    const res401 = await handleAIChat(
      { id: 'user_1' },
      { id: 'dev_1' },
      { model: 'meta-llama/llama-3.2-3b-instruct:free', messages: [{ role: 'user', content: 'hi' }] }
    );

    assert.strictEqual(res401.ok, false);
    assert.strictEqual(res401.status, 401);
    assert.strictEqual(res401.provider, 'omniroute');
    assert.strictEqual(freeNeverCalled, 0, 'Secondary must NOT be called on 401 auth failure');
    await omni401Mock.close();
    await freeNeverMock.close();
    console.log('✓ Test 7 Passed: 401 auth error rejected immediately without blind failover.');

    // ------------------------------------------------------------------------
    // TEST 8: Both Gateways Fail -> Returns NO_FREE_CAPACITY, Zero Paid Spend
    // ------------------------------------------------------------------------
    console.log('\n[Test 8] Both gateways fail -> Fail closed with NO_FREE_CAPACITY');
    const omniFail = await createMockServer((req, res) => {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'OmniRoute overloaded' } }));
    });
    const freeFail = await createMockServer((req, res) => {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'FreeLLMAPI overloaded' } }));
    });

    process.env.OMNIROUTE_BASE_URL = omniFail.url;
    process.env.FREELLMAPI_BASE_URL = freeFail.url;

    const resBothFailed = await handleAIChat(
      { id: 'user_1' },
      { id: 'dev_1' },
      { model: 'meta-llama/llama-3.2-3b-instruct:free', messages: [{ role: 'user', content: 'hi' }] }
    );

    assert.strictEqual(resBothFailed.ok, false);
    assert.strictEqual(resBothFailed.status, 503);
    assert.strictEqual(resBothFailed.code, 'NO_FREE_CAPACITY');
    assert.ok(resBothFailed.error.includes('Free AI capacity unavailable'));
    assert.ok(resBothFailed.error.includes('Paid fallbacks are strictly disabled'));
    await omniFail.close();
    await freeFail.close();
    console.log('✓ Test 8 Passed: Both failed -> NO_FREE_CAPACITY safely returned. Zero paid spend.');

    // ------------------------------------------------------------------------
    // TEST 9: Requested Paid Model Blocked at Entry
    // ------------------------------------------------------------------------
    console.log('\n[Test 9] Browser requesting paid model is rejected with PAID_MODEL_BLOCKED');
    const resPaidBlocked = await handleAIChat(
      { id: 'user_1' },
      { id: 'dev_1' },
      { model: 'claude-3-5-sonnet-20241022', messages: [{ role: 'user', content: 'hi' }] }
    );
    assert.strictEqual(resPaidBlocked.ok, false);
    assert.strictEqual(resPaidBlocked.status, 400);
    assert.strictEqual(resPaidBlocked.code, 'PAID_MODEL_BLOCKED');
    console.log('✓ Test 9 Passed: Paid model blocked with 400 PAID_MODEL_BLOCKED.');

    // ------------------------------------------------------------------------
    // TEST 10: Tool Call Formatting and Multi-Tool Support
    // ------------------------------------------------------------------------
    console.log('\n[Test 10] Tool calling schema & multiple tool call payload support');
    const omniToolMock = await createMockServer((req, res) => {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        const parsed = JSON.parse(body);
        assert.ok(Array.isArray(parsed.tools), 'Tools array must be forwarded');
        assert.strictEqual(parsed.tools.length, 2);
        assert.strictEqual(parsed.tools[0].type, 'function');
        assert.strictEqual(parsed.tools[0].function.name, 'manage_tasks');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: { name: 'manage_tasks', arguments: '{"action":"list","filter":"today"}' }
                },
                {
                  id: 'call_2',
                  type: 'function',
                  function: { name: 'manage_calendar', arguments: '{"action":"list"}' }
                }
              ]
            }
          }]
        }));
      });
    });

    process.env.OMNIROUTE_BASE_URL = omniToolMock.url;
    process.env.FREELLMAPI_BASE_URL = '';

    const resTools = await handleAIChat(
      { id: 'user_1' },
      { id: 'dev_1' },
      {
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        messages: [{ role: 'user', content: 'What is on my schedule today?' }],
        tools: [
          { type: 'function', function: { name: 'manage_tasks', description: 'Tasks' } },
          { type: 'function', function: { name: 'manage_calendar', description: 'Calendar' } }
        ]
      }
    );

    assert.strictEqual(resTools.ok, true);
    const msg = resTools.choices[0].message;
    assert.strictEqual(msg.tool_calls.length, 2);
    assert.strictEqual(msg.tool_calls[0].function.name, 'manage_tasks');
    assert.strictEqual(msg.tool_calls[1].function.name, 'manage_calendar');
    await omniToolMock.close();
    console.log('✓ Test 10 Passed: Multi-tool declarations and response formatting preserved.');

    // ------------------------------------------------------------------------
    // TEST 11: Zero Secret Leakage in Telemetry and Status
    // ------------------------------------------------------------------------
    console.log('\n[Test 11] Zero secret disclosure in telemetry and health status');
    process.env.OMNIROUTE_API_KEY = 'super-secret-omni-key-999';
    process.env.FREELLMAPI_API_KEY = 'super-secret-free-key-888';

    const status = getGatewayStatus();
    assert.strictEqual(status.primary.configured, true);
    assert.strictEqual(status.secondary.configured, false); // base url was empty in test 10
    // Check that no secret keys appear in status object
    const statusJson = JSON.stringify(status);
    assert.strictEqual(statusJson.includes('super-secret'), false, 'Status must not contain API keys');
    assert.strictEqual(statusJson.includes('OMNIROUTE_API_KEY'), false);

    // Check telemetry
    const telemetry = getAITelemetry();
    const telemetryJson = JSON.stringify(telemetry);
    assert.strictEqual(telemetryJson.includes('super-secret'), false, 'Telemetry must not contain API keys');
    assert.strictEqual(telemetryJson.includes('Bearer'), false, 'Telemetry must not contain auth headers');
    console.log('✓ Test 11 Passed: Zero credentials in telemetry or health check.');

    // ------------------------------------------------------------------------
    // TEST 12: Request Timeout Handling
    // ------------------------------------------------------------------------
    console.log('\n[Test 12] Request timeout honors AI_REQUEST_TIMEOUT_MS');
    const hangMock = await createMockServer((req, res) => {
      // Deliberately do not answer to test timeout
    });

    process.env.AI_REQUEST_TIMEOUT_MS = '200'; // 200ms quick timeout
    process.env.OMNIROUTE_BASE_URL = hangMock.url;
    process.env.FREELLMAPI_BASE_URL = '';

    const resTimeout = await handleAIChat(
      { id: 'user_1' },
      { id: 'dev_1' },
      { model: 'meta-llama/llama-3.2-3b-instruct:free', messages: [{ role: 'user', content: 'hi' }] }
    );

    assert.strictEqual(resTimeout.ok, false);
    assert.strictEqual(resTimeout.status, 408);
    assert.ok(resTimeout.error.includes('timed out'));
    await hangMock.close();
    console.log('✓ Test 12 Passed: Request timeout aborts cleanly with HTTP 408.');

    console.log('\n======================================================');
    console.log('ALL 12 ACCEPTANCE TESTS PASSED! DUAL-GATEWAY FULLY VERIFIED.');
    console.log('======================================================\n');

  } finally {
    // Restore original env
    for (const k of Object.keys(process.env)) {
      if (!(k in origEnv)) delete process.env[k];
    }
    Object.assign(process.env, origEnv);
  }
}

runDualGatewaySuite().catch(err => {
  console.error('\n✗ TEST FAILED WITH EXCEPTION:', err);
  process.exit(1);
});
