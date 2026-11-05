# Phase 0 — audit and migration plan only

Use this prompt after adding the kit to the repository.

Read the repository root `AGENTS.md` and all current source entrypoints. Use `docs/00_CURRENT_STATE_AND_GUARDRAILS.md` as a checklist, not unquestioned truth.

**Do not implement new product features in this phase.** Do not merge branches, push, deploy, create external resources, modify production data, rotate credentials on the owner's behalf, run destructive migrations or overwrite the root `AGENTS.md`.

Tasks:
1. Verify current git status, branch, HEAD commit, remotes (redact tokens), tags and all local/remote branches.
2. Compare `main`, `android`, `desktop` and other branches by actual diff and commit ancestry. Recommend cherry-pick/rebuild/archive per branch; do not merge.
3. Trace `index.html` and all imported script/style/module references to map live code.
4. Run available syntax checks, tests and smoke tests. If no test harness exists, document a minimal repeatable baseline procedure without introducing dependencies yet.
5. Inspect data schemas/storage keys, export/import/reset/undo, XSS surfaces, AI key handling, voice, calendar, current approvals, PWA/service worker and existing deployment workflows.
6. Report secret exposure without printing any value or credential-bearing URL. Advise the owner where/what to rotate.
7. Produce `docs/PHASE_0_AUDIT_REPORT.md` and `docs/PHASE_0_IMPLEMENTATION_PLAN.md`.
8. Create draft ADRs for frontend preservation, backend stack, identity, DB/sync, Ollama/LiteLLM and calendar provider where useful. Mark unconfirmed decisions as proposed, not approved.
9. Recommend a single small first PR and list exact acceptance tests.

Finish by summarizing verified findings, unknowns, blockers, changed files (ideally docs only), commands run and the next owner decision. Stop for review.
