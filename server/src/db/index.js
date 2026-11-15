// ============================================================
// TADASHI LifeOS — Backend Database Adapter (Phase 4)
// Connects to PostgreSQL via 'pg' pool when DATABASE_URL is set,
// or provides in-memory transactional storage for tests & development.
// ============================================================

const fs = require('fs');
const path = require('path');

class MemoryStorage {
  constructor() {
    this.users = new Map();
    this.devices = new Map();
    this.records = new Map(); // key: `${userId}:${domain}:${entityId}`
    this.syncOps = new Map(); // key: opId
    this.syncCursors = new Map(); // key: `${userId}:${deviceId}`
    this.conflicts = new Map(); // key: conflictId
  }

  reset() {
    this.users.clear();
    this.devices.clear();
    this.records.clear();
    this.syncOps.clear();
    this.syncCursors.clear();
    this.conflicts.clear();
  }
}

const memoryStore = new MemoryStorage();

// Seed initial developer user
memoryStore.users.set('user_krishna', {
  id: 'user_krishna',
  auth_subject: 'auth0|krishna_singh',
  email: 'krishna@tadashi.os',
  timezone: 'Asia/Kolkata',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

let pgPool = null;

async function getClient() {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && !pgPool) {
    try {
      const { Pool } = require('pg');
      pgPool = new Pool({ connectionString: dbUrl });
    } catch(e) {
      console.warn('pg driver not installed or failed to connect; using MemoryStorage engine.');
    }
  }
  return { pool: pgPool, mem: memoryStore };
}

// User repository
const userRepo = {
  async getById(id) {
    const { pool, mem } = await getClient();
    if (pool) {
      const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    return mem.users.get(id) || null;
  },
  async create(user) {
    const { pool, mem } = await getClient();
    const now = new Date().toISOString();
    const u = {
      id: user.id || `user_${Date.now()}`,
      auth_subject: user.auth_subject,
      email: user.email || '',
      timezone: user.timezone || 'Asia/Kolkata',
      created_at: now,
      updated_at: now
    };
    if (pool) {
      const q = 'INSERT INTO users (id, auth_subject, email, timezone, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *';
      const res = await pool.query(q, [u.id, u.auth_subject, u.email, u.timezone, u.created_at, u.updated_at]);
      return res.rows[0];
    }
    mem.users.set(u.id, u);
    return u;
  }
};

// Device repository
const deviceRepo = {
  async getById(id) {
    const { pool, mem } = await getClient();
    if (pool) {
      const res = await pool.query('SELECT * FROM devices WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    return mem.devices.get(id) || null;
  },
  async register(device) {
    const { pool, mem } = await getClient();
    const now = new Date().toISOString();
    const d = {
      id: device.id || `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      user_id: device.user_id,
      name: device.name || 'Unnamed Device',
      platform: device.platform || 'web',
      capability_json: device.capability_json || {},
      last_seen_at: now,
      revoked_at: null,
      created_at: now
    };
    if (pool) {
      const q = `
        INSERT INTO devices (id, user_id, name, platform, capability_json, last_seen_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at
        RETURNING *
      `;
      const res = await pool.query(q, [d.id, d.user_id, d.name, d.platform, JSON.stringify(d.capability_json), d.last_seen_at, d.created_at]);
      return res.rows[0];
    }
    mem.devices.set(d.id, d);
    return d;
  },
  async revoke(id) {
    const { pool, mem } = await getClient();
    const now = new Date().toISOString();
    if (pool) {
      await pool.query('UPDATE devices SET revoked_at = $1 WHERE id = $2', [now, id]);
      return true;
    }
    const d = mem.devices.get(id);
    if (d) {
      d.revoked_at = now;
      return true;
    }
    return false;
  }
};

// LifeOS Record repository
const recordRepo = {
  async get(userId, domain, entityId) {
    const { pool, mem } = await getClient();
    const compositeKey = `${userId}:${domain}:${entityId}`;
    if (pool) {
      const res = await pool.query('SELECT * FROM lifeos_records WHERE user_id = $1 AND domain = $2 AND entity_id = $3', [userId, domain, entityId]);
      return res.rows[0] || null;
    }
    return mem.records.get(compositeKey) || null;
  },
  async upsert(record) {
    const { pool, mem } = await getClient();
    const now = new Date().toISOString();
    const compositeKey = `${record.user_id}:${record.domain}:${record.entity_id}`;
    const id = `${record.domain}:${record.entity_id}`;

    if (pool) {
      const q = `
        INSERT INTO lifeos_records (id, user_id, domain, entity_id, payload, version, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, domain, entity_id) DO UPDATE
          SET payload = EXCLUDED.payload, version = EXCLUDED.version, updated_at = EXCLUDED.updated_at
        RETURNING *
      `;
      const res = await pool.query(q, [id, record.user_id, record.domain, record.entity_id, JSON.stringify(record.payload), record.version || 1, now]);
      return res.rows[0];
    }

    const existing = mem.records.get(compositeKey);
    const newVersion = record.version !== undefined ? record.version : (existing ? existing.version + 1 : 1);
    const saved = {
      id,
      user_id: record.user_id,
      domain: record.domain,
      entity_id: record.entity_id,
      payload: record.payload,
      version: newVersion,
      deleted_at: record.deleted_at || null,
      created_at: existing ? existing.created_at : now,
      updated_at: now
    };
    mem.records.set(compositeKey, saved);
    return saved;
  },
  async listModifiedSince(userId, sinceIso) {
    const { pool, mem } = await getClient();
    if (pool) {
      const res = await pool.query('SELECT * FROM lifeos_records WHERE user_id = $1 AND updated_at > $2 ORDER BY updated_at ASC', [userId, sinceIso || '1970-01-01T00:00:00Z']);
      return res.rows;
    }
    const list = [];
    const sinceDate = new Date(sinceIso || 0);
    for (const rec of mem.records.values()) {
      if (rec.user_id === userId && new Date(rec.updated_at) > sinceDate) {
        list.push({ ...rec });
      }
    }
    return list.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
  }
};

// Sync Operations repository
const syncOpRepo = {
  async getByOpId(opId) {
    const { pool, mem } = await getClient();
    if (pool) {
      const res = await pool.query('SELECT * FROM sync_operations WHERE op_id = $1', [opId]);
      return res.rows[0] || null;
    }
    return mem.syncOps.get(opId) || null;
  },
  async record(op) {
    const { pool, mem } = await getClient();
    const processedAt = new Date().toISOString();
    const saved = {
      op_id: op.op_id || op.opId,
      user_id: op.user_id,
      device_id: op.device_id || op.deviceId,
      entity_type: op.entity_type || op.entityType,
      entity_id: op.entity_id || op.entityId,
      operation: op.operation,
      base_version: op.base_version !== undefined ? op.base_version : op.baseVersion,
      payload: op.payload || {},
      created_at: op.created_at || op.createdAt || processedAt,
      processed_at: processedAt,
      status: op.status || 'applied',
      result: op.result || {}
    };

    if (pool) {
      const q = `
        INSERT INTO sync_operations (op_id, user_id, device_id, entity_type, entity_id, operation, base_version, payload, created_at, processed_at, status, result)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      const res = await pool.query(q, [saved.op_id, saved.user_id, saved.device_id, saved.entity_type, saved.entity_id, saved.operation, saved.base_version, JSON.stringify(saved.payload), saved.created_at, saved.processed_at, saved.status, JSON.stringify(saved.result)]);
      return res.rows[0];
    }

    mem.syncOps.set(saved.op_id, saved);
    return saved;
  }
};

// Sync Conflict repository
const conflictRepo = {
  async create(conflict) {
    const { pool, mem } = await getClient();
    const now = new Date().toISOString();
    const c = {
      id: conflict.id || `conf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      user_id: conflict.user_id,
      op_id: conflict.op_id,
      entity_id: conflict.entity_id,
      server_version: conflict.server_version,
      client_base_version: conflict.client_base_version,
      status: 'unresolved',
      conflict_details: conflict.conflict_details || {},
      created_at: now
    };
    if (pool) {
      const q = 'INSERT INTO sync_conflicts (id, user_id, op_id, entity_id, server_version, client_base_version, status, conflict_details, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *';
      const res = await pool.query(q, [c.id, c.user_id, c.op_id, c.entity_id, c.server_version, c.client_base_version, c.status, JSON.stringify(c.conflict_details), c.created_at]);
      return res.rows[0];
    }
    mem.conflicts.set(c.id, c);
    return c;
  },
  async listUnresolved(userId) {
    const { pool, mem } = await getClient();
    if (pool) {
      const res = await pool.query('SELECT * FROM sync_conflicts WHERE user_id = $1 AND status = $2', [userId, 'unresolved']);
      return res.rows;
    }
    return Array.from(mem.conflicts.values()).filter(c => c.user_id === userId && c.status === 'unresolved');
  }
};

module.exports = {
  getClient,
  userRepo,
  deviceRepo,
  recordRepo,
  syncOpRepo,
  conflictRepo,
  _memoryStore: memoryStore
};
