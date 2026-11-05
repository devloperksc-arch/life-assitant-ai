# Test plan and release acceptance

## Quality gates for every PR

1. Existing app startup and domain navigation still work.
2. No uncaught browser console error or server exception on happy path.
3. No secret appears in source, bundle, storage, logs, errors, screenshots or test snapshots.
4. User input and model output are schema-validated and safely rendered.
5. Existing data is read correctly; migration has backup and rollback.
6. Mobile and desktop layouts are tested when UI changes.
7. New behavior has automated tests at service/contract level.
8. Feature claims match end-to-end verified behavior, not just UI mocks.

## Phase acceptance

### Phase 0 — stabilization
- [ ] Evidence-based audit of live code and branches.
- [ ] Confirmed clean baseline with current tests and known failures.
- [ ] Confirmed active files and preserved root AGENTS.md constraints.
- [ ] Secret exposure review and credential-rotation recommendations.
- [ ] Migration plan protects current localStorage/export data.
- [ ] ADRs created for backend, auth, DB, local agent and model gateway.

### Phase 1 — Arc Reactor
- [ ] Reactor mounts globally without breaking current layouts.
- [ ] State transitions are deterministic and accessible.
- [ ] Speech output can be interrupted.
- [ ] Speech input failure falls back to text.
- [ ] Transcript and action history are visible.
- [ ] No mic capture before explicit user action.

### Phase 2 — typed tools
- [ ] Every tool has input schema, risk, scopes and execution service.
- [ ] Unknown/unregistered calls are rejected.
- [ ] No direct arbitrary JS/SQL/shell tool.
- [ ] Approval is server-side and bound to exact proposal version.
- [ ] Idempotency and audit work on retry.
- [ ] Completion message only after verification.

### Phase 3 — scheduling
- [ ] Free/busy calculation covers all test cases.
- [ ] Timezone/DST and recurring event cases are tested.
- [ ] Fixed commitments remain fixed.
- [ ] Candidate schedule respects duration, minimum chunk, deadline and buffers.
- [ ] Proposal is draft-only and stale proposals cannot apply.
- [ ] Rollback supported or clearly marked unavailable.

### Phase 4 — cloud and sync
- [ ] Authentication/device isolation is enforced.
- [ ] PostgreSQL migrations run forward and rollback in test environment.
- [ ] Local IndexedDB outbox survives reload/offline.
- [ ] Duplicate operation is idempotent.
- [ ] Conflict is surfaced and resolved without silent loss.
- [ ] Device revoke disables future sync/API calls.
- [ ] Backup restore is tested.

### Phase 5 — AI routing
- [ ] Same tool schema works with at least one local and one cloud model.
- [ ] Tool-call eval suite scores are recorded.
- [ ] Local-only request never leaks to cloud.
- [ ] Online route obeys privacy policy and budget.
- [ ] Provider failure triggers bounded fallback.
- [ ] No key exposed in browser or log.
- [ ] Ollama port is not internet-reachable.

### Phase 6 — memory and skills
- [ ] Memories can be reviewed, corrected, exported and deleted.
- [ ] Each skill manifest validates.
- [ ] Skill sandbox has deny-by-default boundaries.
- [ ] Failed test blocks installation.
- [ ] Approval bound to skill digest + permissions.
- [ ] Permission expansion asks again.
- [ ] Disable/rollback and audit verified.

### Phase 7 — 24/7 worker/device agents
- [ ] Cloud recurring job runs with devices powered off.
- [ ] Retries bounded; idempotency prevents duplicate effects.
- [ ] Dead-letter/failed-job visibility exists.
- [ ] Pause/cancel/emergency stop works.
- [ ] PC-only job waits when PC agent disconnected.
- [ ] Browser worker is not represented as guaranteed always-on.

## Suggested tests to add

- Unit tests: scheduling interval merge/subtract, timezone conversion, ranking, schema validation, risk policy, idempotency.
- Integration tests: DB transaction + version conflict, sync push/pull, approval/apply flow, Ollama provider adapter, LiteLLM gateway adapter.
- E2E tests: voice text fallback, global command panel, mobile/desktop flows, online/offline transition, rescheduling approval.
- Security tests: XSS payload in every user-controlled text location, prompt injection in imported document, unauthorized device API, forged tool name, stale approval, secret scanning.
- Recovery tests: offline outbox replay, duplicate request, provider outage, job worker restart, DB restore.
