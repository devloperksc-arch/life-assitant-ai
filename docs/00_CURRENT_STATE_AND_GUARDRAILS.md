# Current repository state and guardrails

**Evidence snapshot:** uploaded `Tadashi.zip`, extracted for the 5 November 2026 planning conversation. The ZIP appears to represent a local checkout snapshot dated around 3 October 2026. This is not a verified statement about the latest GitHub HEAD. Antigravity must re-check the live checkout and replace any outdated finding below with evidence and commit hash.

## Known repository structure from the supplied snapshot

The repository is primarily a vanilla HTML/CSS/JavaScript app with no visible package.json/build pipeline in the supplied root. `index.html` loads shared scripts. Its root `AGENTS.md` describes the actual live architecture as:

1. `js/data.js` — initial seed data (`DATA`).
2. `js/db.js` — `DB` namespace and localStorage persistence.
3. `js/utils.js` — shared helpers.
4. `js/lib/ai.js` — Gemini client and tool/function definitions.
5. `js/lib/voice.js` — browser speech input/output.
6. `js/domain-pages.js` — domain page rendering.
7. Inline scripts in `index.html` — UI, calendar, chat, voice modal and quick-add behavior.

The existing root `AGENTS.md` says several directories such as `css/`, `js/app.js`, `js/router.js`, `js/pages/`, `js/components/`, `stitch_*` and `archive/` are not loaded by the current HTML entry point. **Do not assume this remains true:** inspect references in the actual checkout before editing.

## Existing design constraints to preserve

- Do not change current storage keys without a tested migration and rollback.
- All data writes must pass through the DB/domain service rather than mutating getter copies or writing raw localStorage from UI code.
- Do not reorder current script tags without understanding dependencies.
- Preserve inline `window.*` handler names unless all call sites are updated.
- Escape user/imported/AI-controlled text before rendering in HTML strings.
- Keep current line endings when editing legacy files; avoid noisy whole-file format changes.
- Test both 375px mobile and 1280px desktop.
- Preserve export/import/reset/undo/snapshot behavior.
- Check old saved data, not just fresh seed state.

These are from the supplied repository's AGENTS.md. They must be verified against the live root AGENTS.md before use.

## Findings from the prior snapshot that need verification

- Main app uses `localStorage` as its persistence layer and does not yet have cross-device sync.
- AI is coupled to Gemini in frontend code; provider credentials were configured client-side.
- Voice uses browser-native speech APIs; offline speech recognition is not guaranteed.
- Existing calendar functionality is not sufficient for constraint-aware free-time search and rescheduling.
- Android/desktop branch names do not prove complete native, offline or shared-backend capability.
- A credential-like value appeared in Git configuration inside the uploaded ZIP. Inspect remote config without printing it. If a real token was exposed, revoke/rotate immediately and check Git history.
- A syntax error in `js/data.js` was reported during the prior review. Re-run parser/static checks on the live checkout before treating it as an active bug.

## Antigravity audit deliverable

Create `docs/PHASE_0_AUDIT_REPORT.md` with an evidence table:

| Area | Verified status | Evidence (file/line/command/commit) | Risk | Action |
|---|---|---|---|---|

At minimum audit: live entrypoints, branches, startup/runtime, persistence and migrations, AI credentials, voice, calendar, action approvals, XSS/input validation, dependencies, offline/PWA setup, deployment and tests.

Do not include secret values, full remote URLs if they contain credentials, personal records or real API responses in the audit artifact.
