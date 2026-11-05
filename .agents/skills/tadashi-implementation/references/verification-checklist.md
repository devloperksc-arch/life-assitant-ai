# Verification checklist

## Existing app and data
- [ ] App loads with no uncaught console errors.
- [ ] Existing localStorage keys/data remain readable.
- [ ] Existing user data is tested; do not test only with fresh seed data.
- [ ] Export/import/reset/undo/restore paths still work.
- [ ] Mobile layout at 375px and desktop layout at 1280px.
- [ ] No broken inline event handlers or changed global function names.
- [ ] Dynamic/user/AI text is safely rendered; no stored XSS regressions.

## Arc Reactor and voice
- [ ] Idle/listening/transcribing/thinking/speaking/planning/approval/executing/offline/error states are visible.
- [ ] Push-to-talk works; transcript is visible and correctable.
- [ ] User can interrupt TTS immediately.
- [ ] Microphone denied/unavailable does not break text chat.
- [ ] Text and keyboard-only accessibility remains possible.
- [ ] No microphone capture without clear user action/indicator.

## Tools and scheduling
- [ ] Unknown tool names and invalid arguments are rejected.
- [ ] Read/navigation vs reversible/external/destructive risk policy is enforced server-side.
- [ ] Approval bound to user, request, proposal version and exact changes.
- [ ] Tool execution is idempotent and audited.
- [ ] Success message follows persisted-result verification.
- [ ] Free/busy handles timezone, recurring events, buffers, deadlines and overlaps.
- [ ] No live calendar mutation before required approval.
- [ ] Stale proposals fail safely after concurrent edits.

## Cloud/offline and models
- [ ] Provider keys never appear in client bundles, browser storage, logs or API responses.
- [ ] Local Ollama can run without internet once model is present.
- [ ] Cloud model route is only used when online and permitted.
- [ ] Model timeout/failure triggers bounded, tested fallback.
- [ ] No public unauthenticated Ollama or LiteLLM admin endpoint.
- [ ] Outbox operations replay once; duplicate submissions are idempotent.
- [ ] Conflicts are visible; no silent last-write-wins for important fields.

## Skills and background jobs
- [ ] Skill manifest validates; permissions are least privilege.
- [ ] Skill tests pass in a sandbox before install.
- [ ] Network/files/secrets denied unless specifically granted.
- [ ] Install and permission expansion require approval.
- [ ] Disable/rollback works and executions are audited.
- [ ] Cloud worker continues while PC/phone are off.
- [ ] Device-local tasks wait if the local device is offline.
