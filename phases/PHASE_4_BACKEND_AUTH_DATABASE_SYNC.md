# Phase 4 — backend, identity, PostgreSQL and offline sync

Precondition: Owner has approved hosting/auth/DB decisions and completed the non-code setup needed for a development/staging environment. Read `docs/04_DATA_MODEL_AND_SYNC.md`, `docs/08_NON_CODE_SETUP_CHECKLIST.md` and deployment runbook.

Build a separate backend while preserving the existing frontend and current user data.

Recommended stack: Node.js LTS + TypeScript + Fastify; PostgreSQL; IndexedDB for browser data/outbox. Use an established auth/OIDC integration rather than inventing password storage.

Requirements:
- Add isolated backend package, migrations, request validation, API contracts and tests.
- Implement authentication/session, device registry and user/device authorization.
- Migrate existing browser data with an explicit opt-in/export/backup path. No silent destructive migration.
- Preserve compatibility with existing storage until migration is verified and reversible.
- Add IndexedDB local cache and durable outbox; sync push/pull with idempotent operation IDs and cursors.
- Use version checks; show conflicts rather than silently overwriting important concurrent changes.
- Add PostgreSQL backup/restore instructions and a tested staging restore.
- Keep secrets in environment/secret manager; do not ship secrets to browser.
- Do not deploy production or touch real user data in this phase.

Tests:
- auth and device isolation;
- migration from legacy export/local state;
- outbox survives reload/offline;
- duplicate push returns original result;
- version conflict surfaced;
- sync pull cursor works;
- user/device revoke;
- backup and restore test.
