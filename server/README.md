# TADASHI LifeOS — Backend Service

The centralized backend service coordinating identity, canonical PostgreSQL storage, device authorization, and durable offline sync for TADASHI LifeOS.

## Quick Start

### 1. Requirements
- Node.js LTS (v20+ or v24+)
- PostgreSQL 15+ (optional for local testing; memory engine used by default if `DATABASE_URL` is unset)

### 2. Run the Service
```bash
cd server
node src/server.js
```
The server will bind to `http://127.0.0.1:3000`.

### 3. Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Healthcheck and service version |
| `POST` | `/auth/register-device` | Register a new client device and receive a session token |
| `POST` | `/auth/revoke-device` | Revoke a compromised or lost device |
| `POST` | `/sync/push` | Idempotently process an outbox batch with version checks |
| `GET` | `/sync/pull` | Pull modified records since a cursor timestamp |
| `POST` | `/sync/migrate-legacy` | Explicit opt-in migration of browser localStorage state |

### 4. Running Migrations on PostgreSQL
```bash
psql $DATABASE_URL -f src/db/migrations/001_initial_schema.sql
```
