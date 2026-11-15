// scripts/test-vercel-endpoints.js
// Tests all Vercel Serverless Function entrypoints in api/ directly using mock req/res

const assert = require('assert');

// Mock request / response builder simulating Vercel Serverless Function runtime
function createMockReqRes({ method = 'GET', url = '/', headers = {}, body = null }) {
  const resHeaders = {};
  let resStatus = 200;
  let resBody = null;
  let ended = false;

  const req = {
    method,
    url,
    headers: { host: 'tadashi.vercel.app', ...headers },
    body
  };

  const res = {
    statusCode: 200,
    setHeader(name, val) { resHeaders[name.toLowerCase()] = val; return res; },
    getHeader(name) { return resHeaders[name.toLowerCase()]; },
    writeHead(status, headers = {}) {
      resStatus = status;
      this.statusCode = status;
      for (const [k, v] of Object.entries(headers)) {
        resHeaders[k.toLowerCase()] = v;
      }
      return res;
    },
    status(code) {
      resStatus = code;
      this.statusCode = code;
      return res;
    },
    json(data) {
      resBody = data;
      ended = true;
      return res;
    },
    end(data) {
      if (data && !resBody) {
        try { resBody = JSON.parse(data); } catch(e) { resBody = data; }
      }
      ended = true;
      return res;
    },
    get _status() { return resStatus; },
    get _headers() { return resHeaders; },
    get _body() { return resBody; },
    get _ended() { return ended; }
  };

  return { req, res };
}

async function runVercelEndpointsTest() {
  console.log('--- TESTING ALL VERCEL SERVERLESS FUNCTION ENDPOINTS ---');

  // 1. Test GET /api/health (api/health.js)
  console.log('\n[1] Testing api/health.js (GET /health)...');
  const healthHandler = require('../api/health');
  const { req: req1, res: res1 } = createMockReqRes({ method: 'GET', url: '/api/health' });
  await healthHandler(req1, res1);
  assert.strictEqual(res1._status, 200);
  assert.strictEqual(res1._body.status, 'healthy');
  assert.strictEqual(res1._body.service, 'tadashi-backend');
  console.log('✓ api/health.js returned 200 healthy');

  // 2. Test GET /api/ai/health (api/ai/health.js)
  console.log('\n[2] Testing api/ai/health.js (GET /ai/health)...');
  const aiHealthHandler = require('../api/ai/health');
  const { req: req2, res: res2 } = createMockReqRes({ method: 'GET', url: '/api/ai/health' });
  await aiHealthHandler(req2, res2);
  assert.strictEqual(res2._status, 200);
  assert.strictEqual(res2._body.ok, true);
  assert.strictEqual(res2._body.service, 'tadashi-ai-gateway-router');
  assert.strictEqual(res2._body.routingMode, 'free_only');
  console.log('✓ api/ai/health.js returned 200 with gateway status & free-tier allowlist');

  // 3. Test POST /api/auth/register-device (api/auth/register-device.js)
  console.log('\n[3] Testing api/auth/register-device.js...');
  const registerHandler = require('../api/auth/register-device');
  const { req: req3, res: res3 } = createMockReqRes({
    method: 'POST',
    url: '/api/auth/register-device',
    body: { deviceName: 'Vercel Test Device', platform: 'browser' }
  });
  await registerHandler(req3, res3);
  assert.strictEqual(res3._status, 200);
  assert.strictEqual(res3._body.ok, true);
  assert.ok(res3._body.device && res3._body.device.id, 'Must return device ID');
  assert.ok(res3._body.sessionToken, 'Must return sessionToken');
  const sessionToken = res3._body.sessionToken;
  const deviceId = res3._body.device.id;
  console.log(`✓ api/auth/register-device.js registered device (${deviceId}) and minted sessionToken`);

  // 4. Test POST /api/ai/chat without auth -> 401 Unauthorized
  console.log('\n[4] Testing api/ai/chat.js unauthorized check...');
  const chatHandler = require('../api/ai/chat');
  const { req: req4, res: res4 } = createMockReqRes({
    method: 'POST',
    url: '/api/ai/chat',
    body: { messages: [{ role: 'user', content: 'test' }] }
  });
  await chatHandler(req4, res4);
  assert.strictEqual(res4._status, 401);
  assert.strictEqual(res4._body.ok, false);
  console.log('✓ api/ai/chat.js strictly rejects unauthenticated requests with 401');

  // 5. Test POST /api/ai/chat with valid auth & paid model block
  console.log('\n[5] Testing api/ai/chat.js with auth & paid model blocking...');
  const { req: req5, res: res5 } = createMockReqRes({
    method: 'POST',
    url: '/api/ai/chat',
    headers: { authorization: `Bearer ${sessionToken}`, 'x-device-id': deviceId },
    body: { model: 'gpt-4o', messages: [{ role: 'user', content: 'hello' }] }
  });
  await chatHandler(req5, res5);
  assert.strictEqual(res5._status, 400);
  assert.strictEqual(res5._body.code, 'PAID_MODEL_BLOCKED');
  console.log('✓ api/ai/chat.js authenticated successfully and blocked paid model gpt-4o (400 PAID_MODEL_BLOCKED)');

  // 6. Test POST /api/sync/push (api/sync/push.js)
  console.log('\n[6] Testing api/sync/push.js...');
  const syncPushHandler = require('../api/sync/push');
  const { req: req6, res: res6 } = createMockReqRes({
    method: 'POST',
    url: '/api/sync/push',
    headers: { authorization: `Bearer ${sessionToken}`, 'x-device-id': deviceId },
    body: {
      operations: [
        {
          id: 'op_vercel_test_1',
          type: 'create',
          domain: 'tasks',
          recordId: 'task_v1',
          data: { title: 'Test Task from Vercel' },
          clientTimestamp: new Date().toISOString()
        }
      ]
    }
  });
  await syncPushHandler(req6, res6);
  assert.strictEqual(res6._status, 200);
  assert.strictEqual(res6._body.ok, true);
  console.log('✓ api/sync/push.js accepted and processed outbox push batch');

  // 7. Test GET /api/sync/pull (api/sync/pull.js)
  console.log('\n[7] Testing api/sync/pull.js...');
  const syncPullHandler = require('../api/sync/pull');
  const { req: req7, res: res7 } = createMockReqRes({
    method: 'GET',
    url: '/api/sync/pull',
    headers: { authorization: `Bearer ${sessionToken}`, 'x-device-id': deviceId }
  });
  await syncPullHandler(req7, res7);
  assert.strictEqual(res7._status, 200);
  assert.strictEqual(res7._body.ok, true);
  assert.ok(Array.isArray(res7._body.records), 'Must return records array');
  console.log(`✓ api/sync/pull.js returned synced records (${res7._body.records.length} records)`);

  // 8. Test Universal Fallback Catch-all api/[...slug].js
  console.log('\n[8] Testing api/[...slug].js catch-all router...');
  const slugHandler = require('../api/[...slug]');
  const { req: req8, res: res8 } = createMockReqRes({ method: 'GET', url: '/api/health' });
  await slugHandler(req8, res8);
  assert.strictEqual(res8._status, 200);
  assert.strictEqual(res8._body.status, 'healthy');
  console.log('✓ api/[...slug].js routed correctly through requestHandler');

  // 9. Test OPTIONS Preflight CORS handling across endpoints
  console.log('\n[9] Testing OPTIONS preflight CORS headers...');
  const { req: req9, res: res9 } = createMockReqRes({
    method: 'OPTIONS',
    url: '/api/ai/chat',
    headers: { origin: 'https://tadashi.vercel.app' }
  });
  await chatHandler(req9, res9);
  assert.strictEqual(res9._status, 204);
  assert.ok(res9._headers['access-control-allow-origin']);
  console.log('✓ OPTIONS preflight returned 204 with CORS allow headers');

  console.log('\n======================================================');
  console.log('ALL VERCEL SERVERLESS FUNCTION ENDPOINTS FULLY VERIFIED!');
  console.log('======================================================\n');
}

runVercelEndpointsTest().catch(err => {
  console.error('✗ VERCEL ENDPOINTS TEST FAILED:', err);
  process.exit(1);
});
