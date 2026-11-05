# Data model and offline synchronization

## Core entities (recommended)

| Entity | Important fields | Purpose |
|---|---|---|
| `users` | id, auth_subject, timezone, created_at | Account identity and timezone |
| `devices` | id, user_id, name, platform, capability_json, last_seen_at, revoked_at | Phone/PC identity and device permissions |
| `lifeos_records` or domain tables | id, user_id, domain, payload/schema fields, version, created_at, updated_at, deleted_at | Cloud canonical LifeOS data; domain normalization is an implementation decision |
| `sync_operations` | op_id, user_id, device_id, entity_type, entity_id, operation, base_version, payload, created_at, processed_at, result | Idempotent client outbox/inbox processing |
| `sync_cursors` | user_id, device_id, cursor | Per-device pull position |
| `sync_conflicts` | id, user_id, op_id, entity_id, server_version, client_base_version, status, resolution | Recoverable conflict queue |
| `assistant_conversations` | id, user_id, device_id, created_at | Conversation grouping |
| `assistant_messages` | id, conversation_id, role, content, metadata, created_at | Messages; keep sensitive content retention configurable |
| `action_proposals` | id, user_id, kind, status, version, proposal_json, expires_at, approved_at | Reviewable agent actions |
| `action_audit_events` | id, user_id, device_id, request_id, action_id, tool_name, status, safe_metadata, created_at | Audit trail without secrets |
| `memory_items` | id, user_id, memory_type, content, source_ref, confidence, status, updated_at | User-visible editable memory |
| `skills` | id, owner_id, slug, version, manifest_json, artifact_digest, status, installed_at | Versioned capability metadata |
| `skill_runs` | id, skill_id, version, user_id, input_summary, output_ref, status, permission_snapshot, created_at | Skill execution history |
| `scheduled_jobs` | id, user_id, kind, payload, run_at, timezone, status, idempotency_key | Persistent scheduler state |

Do not put all domains in a generic JSON blob by default without checking queryability, validation, migration and concurrent-update needs. A hybrid approach may preserve existing domain payloads while adding typed metadata/version columns. Record the final design in an ADR.

## Local browser storage

Use IndexedDB for:
- local copies of allowed LifeOS entities;
- cached read models for offline UI;
- the durable outbox of offline mutations;
- sync cursor and conflict status;
- app-shell metadata.

Use localStorage only for small non-sensitive UI preferences where necessary. Do not put provider keys, OAuth secrets or long-lived bearer tokens in localStorage.

## Operation envelope

```json
{
  "opId": "uuid-generated-on-device",
  "deviceId": "registered-device-id",
  "entityType": "calendar_event",
  "entityId": "event-123",
  "operation": "update",
  "baseVersion": 7,
  "createdAt": "2026-11-05T07:00:00Z",
  "payload": {"startAt": "2026-11-06T05:00:00Z", "endAt": "2026-11-06T06:30:00Z"}
}
```

The server derives user identity from the authenticated device/session; never accept user ID in the operation payload as authorization.

## Sync protocol

1. Local write is validated and committed atomically to IndexedDB with a stable `opId` in the outbox.
2. UI updates optimistically and marks the record `pending_sync`.
3. On reconnect, client sends bounded batches to `/sync/push`.
4. Server verifies user/device authorization, schema, idempotency and `baseVersion`.
5. Server applies valid changes in a transaction and records processed `opId` exactly once.
6. Stale updates become explicit conflict records; do not silently overwrite important fields.
7. Client pulls server changes after its cursor and applies them transactionally.
8. User sees pending count, last successful sync and conflicts that need attention.

## Conflict policy

- Same operation resent: return the original processed result (idempotent).
- Two edits to separate non-overlapping fields: merge only if the schema explicitly marks those fields merge-safe and tests cover it.
- Same field edited by multiple devices: create a conflict and let the user choose or show a clear safe resolution.
- Delete vs edit: conflict; do not silently resurrect or erase.
- External calendar update: treat provider event version/ETag as another concurrency boundary.
- Never assume last-write-wins is safe for schedules, finance, documents, relationships or destructive actions.

## Device and cloud responsibilities

| Capability | Phone offline | PC offline | Cloud online |
|---|---|---|---|
| View cached tasks/routines/calendar | Yes, if previously synced | Yes, if previously synced | Yes |
| Add basic task/log entry | Queue locally | Queue locally | Accept and reconcile |
| Read local knowledge cache | Limited to downloaded items | Limited to downloaded items | Search authorized cloud index |
| Run AI model | Optional on-device runtime later; not guaranteed | Ollama if running locally | Hosted models through gateway |
| Device OS control | Native app + permissions only | PC agent + explicit scopes | Cloud worker cannot act on local device while disconnected |
| Run scheduled reminders | Best-effort notifications; OS dependent | Best-effort local agent | Durable cloud worker |

## Data protection requirements

- Encrypt transport; use managed encryption at rest for DB and backups.
- Define retention, export and deletion behavior before syncing personal data to cloud.
- Back up PostgreSQL and test restores.
- Keep sensitive data out of unnecessary model context; use per-domain context selection.
- Provide device revocation and session revocation.
