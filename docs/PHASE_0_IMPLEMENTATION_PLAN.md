# TADASHI Phase 0 — Implementation Plan

**Status:** In progress on branch `phase/0-audit-and-baseline`  
**Goal:** Stabilise the existing app — fix syntax/runtime blockers, harden security surface, establish repeatable smoke-test baseline.

> Phase 0 does **not** introduce new product features. It makes the existing app verifiably safe and testable before Phase 1 begins.

---

## Scope

| # | Task | File(s) | Status |
|---|---|---|---|
| 0.1 | Fix `data.js` syntax error (double `},` closing travel object) | `js/data.js` | ✅ Done |
| 0.2 | Define `--accent-cyan/red/amber` on `:root` in `index.html` | `index.html` | ✅ Done |
| 0.3 | Fix `Utils.deadlineColor`, `Utils.arc`, `Utils.miniChart`, `Utils.md` to use real hex instead of broken CSS vars | `js/utils.js` | ✅ Done |
| 0.4 | Install implementation kit (`docs/`, `phases/`, `schemas/`, `infra/`, `.agents/skills/`, `.agents/rules/tadashi-migration.md`) | repo root | ✅ Done |
| 0.5 | Produce `docs/PHASE_0_AUDIT_REPORT.md` | `docs/` | ✅ Done |
| 0.6 | Add `Utils.escapeHtml()` to highest-impact domain render templates | `js/domain-pages.js` | 🔄 In progress |
| 0.7 | Add inline comment to both `DOMAINS` registries noting the drift and single-source plan | `index.html`, `js/domain-pages.js` | ⬜ Planned |
| 0.8 | Add `.gitattributes` to lock CRLF/LF per file explicitly | `.gitattributes` | ⬜ Planned |
| 0.9 | Add manual smoke-test baseline checklist document | `docs/SMOKE_TEST_BASELINE.md` | ⬜ Planned |
| 0.10 | Commit Phase 0 on feature branch; write completion report | — | ⬜ Planned |

---

## What is NOT in Phase 0

- No Arc Reactor UI (Phase 1)
- No typed tool registry refactor (Phase 2)
- No scheduling intelligence (Phase 3)
- No backend, cloud database, or sync (Phase 4)
- No Ollama/LiteLLM routing (Phase 5)
- No skills or memory system (Phase 6)
- No cloud worker (Phase 7)
- No new npm/node dependencies
- No framework migration

---

## First PR recommendation: `fix/phase-0-baseline`

Exact files changed:
- `js/data.js` — fix syntax error (1 line removed)
- `js/utils.js` — fix 4 broken CSS var defaults to real hex values
- `index.html` — add `:root` CSS variable definitions
- `js/domain-pages.js` — add `Utils.escapeHtml()` to top render templates
- `docs/PHASE_0_AUDIT_REPORT.md` — new
- `docs/PHASE_0_IMPLEMENTATION_PLAN.md` — new
- `docs/SMOKE_TEST_BASELINE.md` — new
- `.gitattributes` — new
- `.agents/`, `phases/`, `schemas/`, `infra/` — kit files

**Acceptance tests for this PR:**
1. `node --check` passes on all 6 live JS files.
2. App opens in browser — no red console errors on load.
3. All 22 domain pages open without console errors.
4. Task add/edit/delete via AI chat works (tool call executes, DB confirms).
5. Settings → Export JSON → Reset → Restore works.
6. Undo (DB.undo()) works after a data mutation.
7. App loads at 375px and 1280px without layout breakage.
8. `Utils.arc()` renders a visible cyan SVG ring (confirms CSS var fix).
9. `Utils.deadlineColor()` returns `#f43f5e` for a past date (confirms fix).

---

## Owner decisions needed before Phase 1

1. **Approve Phase 0 PR** — review the 9 files above.
2. **Revoke/rotate the GitHub PAT** embedded in the Git remote URL (confirmed present, value redacted).
3. **Confirm canonical branch** — `main` is assumed; confirm before enabling branch protection.
4. Optionally enable GitHub secret scanning and push protection on the repo.

---

## Rollback plan

All Phase 0 changes are reversible:
- `git revert` the data.js fix restores the syntax error (not useful, but safe)
- `git stash` or `git checkout -- <file>` for any file
- The kit docs/schemas/infra files are additive; deleting them has no runtime effect
- No DB migrations, no localStorage key changes, no dependency additions

---

## ADR index (draft — mark as proposed, not approved)

| ADR | Decision | Status |
|---|---|---|
| DEC-001 | Keep vanilla HTML/CSS/JS frontend during Phases 0–3 | Proposed — matches AGENTS.md |
| DEC-002 | Backend: Node.js + TypeScript + Fastify (Phase 4) | Proposed — pending owner approval |
| DEC-003 | PostgreSQL canonical + IndexedDB local (Phase 4) | Proposed — pending owner approval |
| DEC-004 | LiteLLM as cloud gateway + Ollama for local PC (Phase 5) | Proposed — pending owner approval |
| DEC-005 | Server-side typed tool registry (Phase 2/4) | Proposed |
| DEC-006 | Sandboxed skill manifests with approval gate (Phase 6) | Proposed |
| DEC-007 | PWA first; native Android shell only if required (Phase 7) | Proposed |

