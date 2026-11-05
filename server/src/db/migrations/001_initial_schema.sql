-- ============================================================
-- TADASHI LifeOS — Initial PostgreSQL Schema (Phase 4)
-- Core tables for Identity, Devices, LifeOS Records, and Sync Engine
-- ============================================================

-- Users / Account Identity
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  auth_subject VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255),
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Registered Devices (Laptop / Android / Web)
CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  platform VARCHAR(32) NOT NULL, -- 'web', 'laptop', 'android'
  capability_json JSONB NOT NULL DEFAULT '{}',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);

-- Canonical LifeOS Records Across 22 Domains
CREATE TABLE IF NOT EXISTS lifeos_records (
  id VARCHAR(128) PRIMARY KEY, -- composite: domain:entityId
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain VARCHAR(64) NOT NULL,
  entity_id VARCHAR(128) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  version INT NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_domain_entity UNIQUE (user_id, domain, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_records_user_domain ON lifeos_records(user_id, domain);
CREATE INDEX IF NOT EXISTS idx_records_updated ON lifeos_records(updated_at);

-- Sync Operations (Idempotent client outbox/inbox processing)
CREATE TABLE IF NOT EXISTS sync_operations (
  op_id UUID PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(128) NOT NULL REFERENCES devices(id),
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(128) NOT NULL,
  operation VARCHAR(32) NOT NULL, -- 'create', 'update', 'archive', 'delete'
  base_version INT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(32) NOT NULL, -- 'applied', 'duplicate', 'conflict', 'rejected'
  result JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_sync_ops_user_device ON sync_operations(user_id, device_id);

-- Per-Device Sync Pull Cursors
CREATE TABLE IF NOT EXISTS sync_cursors (
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(128) NOT NULL REFERENCES devices(id),
  cursor_position BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, device_id)
);

-- Concurrency Conflict Queue (Explicit non-destructive resolution)
CREATE TABLE IF NOT EXISTS sync_conflicts (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  op_id UUID NOT NULL REFERENCES sync_operations(op_id),
  entity_id VARCHAR(128) NOT NULL,
  server_version INT NOT NULL,
  client_base_version INT,
  status VARCHAR(32) NOT NULL DEFAULT 'unresolved', -- 'unresolved', 'resolved_client', 'resolved_server'
  conflict_details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conflicts_user ON sync_conflicts(user_id, status);
