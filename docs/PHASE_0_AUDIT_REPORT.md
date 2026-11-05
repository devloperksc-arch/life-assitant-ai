# TADASHI Phase 0 — Audit Report

**Branch inspected:** `phase/0-audit-and-baseline`  
**HEAD commit at audit:** `0d842c1` (docs: add AGENTS.md instructions and workspace rules for AI agents)  
**Audit date:** 2026-11-05  
**Auditor:** Antigravity (AI coding agent)

> Remote URLs contain embedded tokens. All remote output has been redacted. The owner must verify the remote URL and **revoke/rotate any GitHub PAT that was embedded in the remote URL** immediately if it is a real credential. Run `git remote -v` locally (not in shared output) and use `git remote set-url origin https://github.com/devloperksc-arch/life-assitant-ai.git` to remove the embedded token.

---

## Branch inventory

| Branch | Commits ahead of main | Summary |
|---|---|---|
| `main` | — | Canonical branch. Full-featured vanilla LifeOS. 6 commits. |
| `android` | 1 | PWA manifest + mobile-optimised `index.html` (stripped down, 1193-line net reduction). **Do not merge blindly — 1,126 lines removed.** |
| `desktop` | 1 | Desktop-only command palette / hotkeys, 736-line index.html variant. **Do not merge blindly — 506 lines removed.** |
| `bharki` | diverges from main | Removes root AGENTS.md and .gitignore. Likely a personal workspace branch. Do not merge. |
| `gharki` | diverges from main | Same pattern — removes AGENTS.md and .gitignore. Do not merge. |

**Recommendation:** Keep `main` as canonical. Cherry-pick the PWA manifest and icon from `android`; ignore the stripped index.html. Archive `bharki`/`gharki`. Do not auto-merge any branch.

---

## Live file map (confirmed by `index.html` script tag inspection)

| Order | File | Load evidence | Lines | Status |
|---|---|---|---|---|
| 1 | `js/data.js` | `<script src="js/data.js">` | 475 | ✅ Live — **HAD SYNTAX ERROR** (now fixed) |
| 2 | `js/db.js` | `<script src="js/db.js">` | ~830 | ✅ Live |
| 3 | `js/utils.js` | `<script src="js/utils.js">` | 140 | ✅ Live |
| 4 | `js/lib/ai.js` | `<script src="js/lib/ai.js">` | 636 | ✅ Live |
| 5 | `js/lib/voice.js` | `<script src="js/lib/voice.js">` | 261 | ✅ Live |
| 6 | `js/domain-pages.js` | `<script src="js/domain-pages.js?v=5.1">` | 3,514 | ✅ Live |
| inline | `<script>` in `index.html` | Inline tag | 2,878 total | ✅ Live |

**Dead / not loaded (confirmed not referenced by index.html):**
`css/main.css`, `css/components.css`, `js/app.js`, `js/router.js`, `js/pages/*`, `js/components/*`, `all_pages_skeleton.html`, `index.backup.html`, `stitch_*/`, `archive/**`

---

## Audit findings

| Area | Status | Evidence | Risk | Required action |
|---|---|---|---|---|
| **Syntax — data.js** | ⚠️ BUG FOUND & FIXED | `node --check js/data.js` → `SyntaxError: Missing initializer in const declaration` at line 382 — double `},` closing `travel` object | HIGH — app would silently fail to seed on first load | Fixed: removed duplicate `},` on line 380 |
| **Syntax — all other JS** | ✅ Pass | `node --check` on all 6 live files passes after fix | — | — |
| **CSS accent variables** | ⚠️ MISSING | `--accent-cyan`, `--accent-red`, `--accent-amber` referenced in `Utils.deadlineColor`, `Utils.arc`, `Utils.miniChart`, `Utils.md` but not defined in live app | MEDIUM — colors render as empty string | Fixed: defined on `:root` in `index.html <style>` |
| **Utils accent color defaults** | ⚠️ BROKEN | `arc()`, `miniChart()` default to `var(--accent-cyan)` which resolved to nothing | MEDIUM | Fixed: defaults changed to `#00d4ff` / `#f43f5e` / `#f59e0b` |
| **XSS / escaping** | ⚠️ RISK | `domain-pages.js` has 3,514 lines of `innerHTML` templates with no `Utils.escapeHtml()` calls on user/AI/imported text | HIGH — stored-XSS via import or AI tool output | Phase 0: add escaping to highest-traffic render functions. Document all sites. |
| **Gemini API key** | ⚠️ CLIENT-SIDE | Key stored in `localStorage['tadashi_gemini_key']` and sent in browser fetch request; visible to same-origin JS and browser extensions | HIGH | Phase 4 (backend auth) moves keys server-side. For now: document clearly in settings UI that the key is stored locally. |
| **Git remote token** | ⚠️ CREDENTIALS | Remote URL embeds a credential-like token (redacted in this report) | CRITICAL | Owner must revoke/rotate the PAT and update the remote URL to remove the token. |
| **DOMAINS dual registry** | ⚠️ DRIFT | `DOMAINS` defined in `index.html` (line 1908) AND `DOMAINS_REGISTRY` in `domain-pages.js` (line 19). The fitness tag differs between them. `domain-pages.js` overrides with `window.DOMAINS = DOMAINS_REGISTRY` if the inline one has fewer entries — currently same count so both run. | MEDIUM — silent divergence risk | Phase 0: add a comment; Phase 1: consolidate to single source |
| **data.js double `},`** | ✅ FIXED | Removed stray duplicate closing brace at original line 380 | — | Done |
| **PWA manifest** | ❌ Missing on main | `manifest.json` exists only on `android` branch | LOW for now | Cherry-pick from android branch if PWA is desired |
| **No test harness** | ⚠️ GAP | No `package.json`, no test runner, no CI | MEDIUM | Phase 0: establish a manual smoke-test baseline checklist |
| **offline / SW** | ❌ None on main | No service worker on main branch | LOW for Phase 0 | Phase 4/7 |
| **localStorage size** | ⚠️ Potential | No try/catch on all localStorage writes in db.js | LOW | Per AGENTS.md §3.10 — wrap in try/catch |
| **Voice — always-listening** | ✅ OK | Push-to-talk only; mic not opened on page load | — | — |
| **Undo/reset/import** | ✅ Present | DB.undo(), DB.reset(), DB.importState() with snapshot logic confirmed in db.js | — | — |
| **Line endings** | ⚠️ Watch | index.html and domain-pages.js are CRLF; other JS files are LF. Git may convert on stash/pop (warning observed). | LOW | Use `--check` before commits; set `.gitattributes` for explicit handling |

---

## Syntax check results (post-fix)

```
js/data.js       — PASS (after removing duplicate },)
js/db.js         — PASS
js/utils.js      — PASS (after replacing var(--accent-*) defaults with real hex)
js/lib/ai.js     — PASS
js/lib/voice.js  — PASS
js/domain-pages.js — PASS
```

---

## Security summary (no secrets printed)

1. **Git remote embeds a credential** — owner action required: revoke, rotate, update remote URL.
2. **Gemini key in localStorage** — acceptable short-term; must move to server-side in Phase 4.
3. **XSS risk in domain-pages.js** — highest priority code fix for Phase 0.
4. No `.env` files found in the repo root on `main`. Good.
5. No hardcoded API keys found in source files. The key is loaded at runtime from localStorage.

---

## Branch recommendation

```
main       → keep as canonical; work on feature branches from here
android    → cherry-pick only: manifest.json, assets/icons/icon.svg
desktop    → review for hotkey logic only; do not merge index.html changes
bharki     → archive / delete — removes safety files
gharki     → archive / delete — removes safety files
```

