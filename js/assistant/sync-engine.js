// ============================================================
// TADASHI LifeOS — Offline Sync Engine & Durable Outbox (Phase 4)
// Uses browser IndexedDB to persist mutations offline, manage stable
// device identity, push idempotent outbox batches, and pull updates.
// ============================================================

(function(window) {
  'use strict';

  const DB_NAME = 'tadashi_offline_db';
  const DB_VERSION = 1;
  const DEVICE_STORAGE_KEY = 'tadashi_device_id';
  const TOKEN_STORAGE_KEY = 'tadashi_session_token';
  const SERVER_URL_STORAGE_KEY = 'tadashi_sync_server_url';
  const DEFAULT_SERVER_URL = 'http://127.0.0.1:3000';

  let idbInstance = null;

  // Simple UUID generator for browser / node
  function generateUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Stable Device Identification
  function getDeviceId() {
    try {
      let id = localStorage.getItem(DEVICE_STORAGE_KEY);
      if (!id) {
        id = `dev_${window.innerWidth < 1024 ? 'android' : 'laptop'}_${generateUUID().slice(0, 8)}`;
        localStorage.setItem(DEVICE_STORAGE_KEY, id);
      }
      return id;
    } catch(e) {
      return 'dev_ephemeral_client';
    }
  }

  // Session Token Storage
  function getSessionToken() {
    try { return localStorage.getItem(TOKEN_STORAGE_KEY) || ''; } catch(e) { return ''; }
  }

  function setSessionToken(token) {
    try { localStorage.setItem(TOKEN_STORAGE_KEY, (token || '').trim()); } catch(e) {}
  }

  function getServerUrl() {
    try { return localStorage.getItem(SERVER_URL_STORAGE_KEY) || DEFAULT_SERVER_URL; } catch(e) { return DEFAULT_SERVER_URL; }
  }

  function setServerUrl(url) {
    try { localStorage.setItem(SERVER_URL_STORAGE_KEY, (url || '').trim()); } catch(e) {}
  }

  // Open / Initialize IndexedDB
  function openDatabase() {
    if (idbInstance) return Promise.resolve(idbInstance);

    return new Promise((resolve, reject) => {
      // In headless environments where indexedDB is not available, provide fallback
      if (typeof indexedDB === 'undefined') {
        const memOutbox = new Map();
        const memState = new Map();
        idbInstance = {
          _isMock: true,
          memOutbox,
          memState
        };
        return resolve(idbInstance);
      }

      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('outbox')) {
          db.createObjectStore('outbox', { keyPath: 'opId' });
        }
        if (!db.objectStoreNames.contains('syncState')) {
          db.createObjectStore('syncState', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('cachedRecords')) {
          db.createObjectStore('cachedRecords', { keyPath: 'id' });
        }
      };

      req.onsuccess = (e) => {
        idbInstance = e.target.result;
        resolve(idbInstance);
      };

      req.onerror = (e) => reject(e.target.error);
    });
  }

  // Queue an Outbox Mutation Operation
  async function queueOperation(entityType, entityId, operation, payload, baseVersion) {
    const db = await openDatabase();
    const op = {
      opId: generateUUID(),
      deviceId: getDeviceId(),
      entityType,
      entityId: String(entityId),
      operation: operation || 'update',
      baseVersion: baseVersion !== undefined ? baseVersion : null,
      createdAt: new Date().toISOString(),
      payload: payload || {},
      status: 'pending_sync'
    };

    if (db._isMock) {
      db.memOutbox.set(op.opId, op);
      return op;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['outbox'], 'readwrite');
      const store = tx.objectStore('outbox');
      const req = store.put(op);
      req.onsuccess = () => resolve(op);
      req.onerror = () => reject(req.error);
    });
  }

  // Get Pending Outbox Operations
  async function getPendingOperations() {
    const db = await openDatabase();
    if (db._isMock) {
      return Array.from(db.memOutbox.values());
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['outbox'], 'readonly');
      const store = tx.objectStore('outbox');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // Clear Processed Operation from Outbox
  async function removeOutboxOperation(opId) {
    const db = await openDatabase();
    if (db._isMock) {
      db.memOutbox.delete(opId);
      return true;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['outbox'], 'readwrite');
      const store = tx.objectStore('outbox');
      const req = store.delete(opId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  // Sync State Getter/Setter
  async function getSyncState(key) {
    const db = await openDatabase();
    if (db._isMock) {
      return db.memState.get(key) || null;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['syncState'], 'readonly');
      const store = tx.objectStore('syncState');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => reject(req.error);
    });
  }

  async function setSyncState(key, value) {
    const db = await openDatabase();
    if (db._isMock) {
      db.memState.set(key, value);
      return value;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['syncState'], 'readwrite');
      const store = tx.objectStore('syncState');
      const req = store.put({ key, value });
      req.onsuccess = () => resolve(value);
      req.onerror = () => reject(req.error);
    });
  }

  // Network Sync: Push Outbox Batch
  async function push(serverUrl, token) {
    const sUrl = serverUrl || getServerUrl();
    const sToken = token || getSessionToken();
    const pendingOps = await getPendingOperations();

    if (pendingOps.length === 0) {
      return { ok: true, pushed: 0, message: 'Outbox is empty' };
    }

    if (!sToken) {
      return { ok: false, error: 'No session token configured. Please register device.' };
    }

    const res = await fetch(`${sUrl}/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sToken}`
      },
      body: JSON.stringify({ operations: pendingOps })
    });

    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, status: res.status, error: errText };
    }

    const data = await res.json();

    // Clean up successfully applied or duplicate operations from outbox
    if (Array.isArray(data.processed)) {
      for (const p of data.processed) {
        if (p.status === 'applied' || p.status === 'duplicate') {
          await removeOutboxOperation(p.opId);
        }
      }
    }

    await setSyncState('lastSyncAt', new Date().toISOString());
    return { ok: true, result: data };
  }

  // Network Sync: Pull Updates
  async function pull(serverUrl, token) {
    const sUrl = serverUrl || getServerUrl();
    const sToken = token || getSessionToken();
    const cursor = (await getSyncState('cursor')) || null;

    if (!sToken) {
      return { ok: false, error: 'No session token configured' };
    }

    const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    const res = await fetch(`${sUrl}/sync/pull${q}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sToken}`
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, status: res.status, error: errText };
    }

    const data = await res.json();
    if (data.cursor) {
      await setSyncState('cursor', data.cursor);
    }
    await setSyncState('lastSyncAt', new Date().toISOString());

    return { ok: true, result: data };
  }

  // Full Sync Cycle (Push Outbox + Pull Changes)
  async function syncAll(serverUrl, token) {
    const pushResult = await push(serverUrl, token);
    const pullResult = await pull(serverUrl, token);
    return {
      ok: pushResult.ok && pullResult.ok,
      push: pushResult,
      pull: pullResult,
      lastSyncAt: new Date().toISOString()
    };
  }

  // Non-Destructive Legacy Data Migration
  async function migrateLegacyToCloud(serverUrl, token) {
    if (!window.DB || typeof window.DB.getAll !== 'function') {
      return { ok: false, error: 'Local database not loaded' };
    }

    const sUrl = serverUrl || getServerUrl();
    const sToken = token || getSessionToken();

    // 1. Safety Snapshot
    const snapshot = window.DB.getAll();
    try {
      localStorage.setItem('tadashi_pre_migration_backup', JSON.stringify(snapshot));
    } catch(e) {}

    // 2. Upload to Cloud Migration Endpoint
    const res = await fetch(`${sUrl}/sync/migrate-legacy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sToken}`
      },
      body: JSON.stringify(snapshot)
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: err };
    }

    const data = await res.json();
    await setSyncState('migratedToCloud', true);
    await setSyncState('lastSyncAt', new Date().toISOString());

    return { ok: true, result: data };
  }

  // Status Summary
  async function getStatus() {
    const pending = await getPendingOperations();
    const lastSyncAt = await getSyncState('lastSyncAt');
    const token = getSessionToken();
    const deviceId = getDeviceId();

    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      deviceId,
      hasSessionToken: !!token,
      serverUrl: getServerUrl(),
      pendingOutboxCount: pending.length,
      lastSyncAt: lastSyncAt || 'Never',
      isConfigured: !!token
    };
  }

  // Public Interface
  const SyncEngine = {
    init: openDatabase,
    getDeviceId,
    getSessionToken,
    setSessionToken,
    getServerUrl,
    setServerUrl,
    queueOperation,
    getPendingOperations,
    removeOutboxOperation,
    getSyncState,
    setSyncState,
    push,
    pull,
    syncAll,
    migrateLegacyToCloud,
    getStatus
  };

  window.SyncEngine = SyncEngine;

})(typeof window !== 'undefined' ? window : global);
