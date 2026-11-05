# Deployment and operations runbook (draft)

Do not use this as a command-by-command production deployment guide until the actual host, database and secrets manager have been selected. Antigravity should turn it into a provider-specific runbook only after owner approval.

## Environments

- **Local development:** fake/test credentials, local PostgreSQL or disposable test DB, local Ollama optional.
- **Preview/staging:** isolated database, OAuth test app/users, non-production keys, synthetic test data.
- **Production:** protected secrets, backups, monitoring, rate limits, domain/TLS and explicit release approval.

Never point a development app at the real user database.

## Service responsibilities

| Service | Responsibility | Must survive device shutdown? |
|---|---|---|
| Web frontend | LifeOS UI and Arc Reactor | Hosted web shell stays available |
| TADASHI API | Auth, domain service, tools, proposals, sync | Yes |
| PostgreSQL | Canonical synced data and job state | Yes |
| Worker | Reminders, schedules, durable tasks | Yes |
| LiteLLM gateway | Hosted model routing (if used) | Yes when cloud models are enabled |
| PC Local Agent | PC-local Ollama and approved PC actions | No; PC must be on |
| Ollama | Local model inference on PC | No; PC must be on |

## Release gates

1. All tests pass in CI.
2. DB migration is reviewed and has a tested rollback/backup.
3. Secrets are present only in the secret manager/environment.
4. Staging smoke test passes.
5. Security review checks auth, scopes, CORS/CSRF, SSRF, rate limits, logs and tool policy.
6. Owner approves production deploy.
7. Post-deploy health, worker queue, sync and error metrics are checked.
8. Rollback procedure is available.

## Worker reliability

- Use durable jobs, leases/heartbeats, bounded retries with backoff and dead-letter queue.
- Give every job an idempotency key and explicit owner/device target.
- Store execution status and last error category, not raw secrets.
- Provide pause-all, pause-by-user, cancel-job and retry controls.
- Do not run device-only jobs on cloud; wait for the PC Local Agent/device to reconnect.
- Avoid duplicate notifications after worker restart.

## Backup and recovery

- Back up PostgreSQL on a defined schedule.
- Encrypt backups and restrict access.
- Test restore into a separate environment.
- Back up skill manifests/artifacts and audit metadata; avoid backing up secrets in plaintext.
- Confirm user export/delete behavior and retention policy.
- Keep versioned application releases and a rollback path.
