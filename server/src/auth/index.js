// ============================================================
// TADASHI LifeOS — Authentication & Device Registry (Phase 4)
// Authorizes user and device identity; derives security context;
// blocks revoked devices; provides session tokens.
// ============================================================

const crypto = require('crypto');
const { deviceRepo, userRepo } = require('../db');

// Simple HMAC secret for development / staging session tokens
const SESSION_SECRET = process.env.SESSION_SECRET || 'tadashi_dev_session_secret_change_in_prod';

function createToken(userId, deviceId) {
  const payload = `${userId}:${deviceId}:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64url');
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const parts = raw.split(':');
    if (parts.length !== 4) return null;
    const [userId, deviceId, timestamp, receivedHmac] = parts;
    const payload = `${userId}:${deviceId}:${timestamp}`;
    const expectedHmac = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
    if (crypto.timingSafeEqual(Buffer.from(receivedHmac), Buffer.from(expectedHmac))) {
      return { userId, deviceId, timestamp: parseInt(timestamp, 10) };
    }
  } catch(e) {
    return null;
  }
  return null;
}

// Device registration
async function registerDevice(userId, deviceData) {
  const user = await userRepo.getById(userId);
  if (!user) throw new Error(`User not found: ${userId}`);

  const device = await deviceRepo.register({
    id: deviceData.deviceId || deviceData.id,
    user_id: userId,
    name: deviceData.name || 'Personal Device',
    platform: deviceData.platform || 'web',
    capability_json: deviceData.capabilities || {}
  });

  const sessionToken = createToken(userId, device.id);
  return { device, sessionToken };
}

// Device revocation
async function revokeDevice(deviceId) {
  return deviceRepo.revoke(deviceId);
}

// Request Authenticator Middleware / Handler
async function authenticateRequest(headers) {
  const authHeader = headers?.authorization || headers?.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Missing or malformed Authorization header' };
  }

  const token = authHeader.slice(7).trim();
  const session = verifyToken(token);
  if (!session) {
    return { ok: false, status: 401, error: 'Invalid or expired session token' };
  }

  // Verify device is still registered and NOT revoked
  const device = await deviceRepo.getById(session.deviceId);
  if (!device) {
    return { ok: false, status: 403, error: 'Device not registered' };
  }
  if (device.revoked_at) {
    return { ok: false, status: 403, error: 'Device has been revoked. Sync blocked.' };
  }

  // Update last_seen_at
  device.last_seen_at = new Date().toISOString();

  return {
    ok: true,
    user: { id: session.userId },
    device: { id: session.deviceId, name: device.name, platform: device.platform }
  };
}

module.exports = {
  createToken,
  verifyToken,
  registerDevice,
  revokeDevice,
  authenticateRequest
};
