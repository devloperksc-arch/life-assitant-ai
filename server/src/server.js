// ============================================================
// TADASHI LifeOS — Backend HTTP API Server (Phase 4)
// Native Fastify/HTTP microservice providing Identity,
// Device Registration, Sync Push/Pull, and Migration APIs.
// ============================================================

const http = require('http');
const url = require('url');
const { authenticateRequest, registerDevice, revokeDevice } = require('./auth');
const { handleSyncPush, handleSyncPull, handleLegacyMigration } = require('./sync');
const { handleAIChat, getAITelemetry, getGatewayStatus } = require('./ai/router');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '127.0.0.1';
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:8000,http://127.0.0.1:8000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// CORS headers helper (strictly validates origin against configured allowlist in production)
function setCorsHeaders(res, req) {
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*') || process.env.NODE_ENV !== 'production')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

// JSON body parser helper (supports raw streams and Vercel pre-parsed bodies)
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    // If body was already parsed by a serverless runtime (e.g. Vercel)
    if (req.body !== undefined && req.body !== null) {
      if (typeof req.body === 'object') return resolve(req.body);
      if (typeof req.body === 'string') {
        if (!req.body.trim()) return resolve({});
        try {
          return resolve(JSON.parse(req.body));
        } catch(e) {
          return reject(new Error('Invalid JSON'));
        }
      }
    }

    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 10 * 1024 * 1024) { // 10MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch(e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, body) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(body);
  }
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

// Main HTTP Request Router
async function requestHandler(req, res) {
  setCorsHeaders(res, req);

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') {
      return res.status(204).end();
    }
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  // Normalize path: supports both /path and /api/path seamlessly
  let path = parsedUrl.pathname || '/';
  if (path.startsWith('/api/') || path === '/api') {
    path = path.replace(/^\/api(?=\/|$)/, '') || '/';
  }
  const method = req.method;

  try {
    // 1. Healthcheck
    if (method === 'GET' && path === '/health') {
      return sendJson(res, 200, {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0-phase4',
        service: 'tadashi-backend'
      });
    }

    // Safe AI Gateway Status Check (Never discloses API keys or raw endpoints)
    if (method === 'GET' && path === '/ai/health') {
      return sendJson(res, 200, {
        ok: true,
        status: 'online',
        service: 'tadashi-ai-gateway-router',
        ...getGatewayStatus()
      });
    }

    // 2. Device Registration (Public / Pre-authenticated by onboarding)
    if (method === 'POST' && path === '/auth/register-device') {
      const body = await parseJsonBody(req);
      const userId = body.userId || 'user_krishna'; // Default demo/owner subject
      const result = await registerDevice(userId, body);
      return sendJson(res, 200, { ok: true, ...result });
    }

    // Authenticated endpoints below:
    const auth = await authenticateRequest(req.headers);
    if (!auth.ok) {
      return sendJson(res, auth.status || 401, { ok: false, error: auth.error });
    }

    const { user, device } = auth;

    // 3. Device Revocation
    if (method === 'POST' && path === '/auth/revoke-device') {
      const body = await parseJsonBody(req);
      const deviceIdToRevoke = body.deviceId || device.id;
      await revokeDevice(deviceIdToRevoke);
      return sendJson(res, 200, { ok: true, revokedDeviceId: deviceIdToRevoke });
    }

    // 4. Sync Push Outbox Batch
    if (method === 'POST' && path === '/sync/push') {
      const body = await parseJsonBody(req);
      const operations = Array.isArray(body) ? body : (body.operations || []);
      const result = await handleSyncPush(user, device, operations);
      return sendJson(res, 200, result);
    }

    // 5. Sync Pull
    if (method === 'GET' && path === '/sync/pull') {
      const cursor = parsedUrl.query.cursor || null;
      const result = await handleSyncPull(user, device, cursor);
      return sendJson(res, 200, result);
    }

    // 6. Legacy Data Migration
    if (method === 'POST' && path === '/sync/migrate-legacy') {
      const body = await parseJsonBody(req);
      const result = await handleLegacyMigration(user, device, body);
      return sendJson(res, 200, result);
    }

    // 7. AI Chat (Server-side LiteLLM / Gateway)
    if (method === 'POST' && path === '/ai/chat') {
      const body = await parseJsonBody(req);
      const result = await handleAIChat(user, device, body);
      return sendJson(res, result.status || 200, result);
    }

    // 8. AI Telemetry
    if (method === 'GET' && path === '/ai/telemetry') {
      const result = getAITelemetry(user.id);
      return sendJson(res, 200, { ok: true, telemetry: result });
    }

    // 9. PC Agent Heartbeat
    if (method === 'POST' && path === '/agent/heartbeat') {
      const body = await parseJsonBody(req);
      return sendJson(res, 200, {
        ok: true,
        acknowledged: true,
        deviceId: device.id,
        serverTime: new Date().toISOString()
      });
    }

    // Not found
    return sendJson(res, 404, { ok: false, error: `Route not found: ${method} ${path}` });

  } catch(err) {
    console.error('Server request error:', err);
    return sendJson(res, 500, { ok: false, error: err.message || 'Internal Server Error' });
  }
}

function startServer(port = PORT, host = HOST) {
  const server = http.createServer(requestHandler);
  return new Promise((resolve, reject) => {
    server.listen(port, host, () => {
      console.log(`TADASHI Backend listening at http://${host}:${port}`);
      resolve(server);
    });
    server.on('error', reject);
  });
}

// Auto-start if executed directly
if (require.main === module) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = {
  startServer,
  requestHandler
};
