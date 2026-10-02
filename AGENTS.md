# AGENTS.md — TADASHI LifeOS

Instructions for AI coding agents working in this repo. Read fully before editing.
Everything below was taken from the actual code. If the code disagrees with this file, trust the code, then fix this file.

---

## 1. What this project is

A single-page, **vanilla HTML/CSS/JS** personal "life OS" with 22 domains (tasks, fitness, finance, etc.) and a Gemini-powered assistant. No framework, no bundler, no package.json. It runs by opening `index.html`; all data lives in the browser's `localStorage`.

Tailwind is loaded from the **Play CDN** in `index.html` (`<script src="https://cdn.tailwindcss.com…">`), with its config inline.

## 2. File map (what is live and what is dead)

**LIVE.** Script load order is fixed in `index.html` and must not change:

| Order | File | Exposes | Role |
|---|---|---|---|
| 1 | `js/data.js` | `const DATA` | Seed data for first launch |
| 2 | `js/db.js` | `const DB` (IIFE) | localStorage database, undo, listeners. Calls `api.init()` itself at the bottom. |
| 3 | `js/utils.js` | `const Utils` | Helpers (`escapeHtml`, `md`, `daysUntil`, `animateNumber`, `arc`, …) |
| 4 | `js/lib/ai.js` | `const AI` | Gemini client, function calling |
| 5 | `js/lib/voice.js` | `const Voice` | Speech in/out |
| 6 | `js/domain-pages.js?v=5.1` | `window.*` functions | Renders all domain pages. Wrapped in `(function(window){ 'use strict'; … })(window)` |
| inline | `<script>` in `index.html` | globals | `DOMAINS`, `switchTab`, `showToast`, calendar engine, chat, voice modal, quick-add |

`index.html` (~2,800 lines) holds **both** layouts: `#desktop-app` (≥1024px) and `#mobile-app` (<1024px). CSS hides one; both are in the DOM.

**DEAD — do not edit, do not "fix", do not import:**
`css/main.css`, `css/components.css`, `js/app.js`, `js/router.js`, `js/pages/*`, `js/components/*`, `all_pages_skeleton.html`, `index.backup.html`, `stitch_*/`, `archive/**`.
None are referenced by `index.html`. Editing them changes nothing and wastes effort. If a task seems to need them, you are probably in the wrong file.

## 3. Hard rules (violating any of these breaks the app)

1. **Line endings.** `index.html` and `js/domain-pages.js` use **CRLF**. Other files use LF. Match the file you edit. Never convert a whole file's endings in a feature commit (it makes the diff unreadable). When using search/replace tools, match `\r\n` exactly or the edit will fail silently.
2. **No new dependencies, no build step, no ES modules** unless the task explicitly says so. Do not add `import`/`export`, npm packages, or a bundler. Scripts share globals through plain `<script>` tags.
3. **Never reorder or remove the `<script>` tags** at the end of `<head>`. `db.js` needs `DATA`; `domain-pages.js` needs `DB`, `Utils`, `AI`.
4. **Never hard-code secrets.** The Gemini key is read only from `localStorage['tadashi_gemini_key']` via `AI.getKey()`. Never put a key in source, a URL, a log, or a commit. The request sends it in the `x-goog-api-key` header; keep it that way.
5. **Do not touch the storage keys.** Renaming them silently wipes users' data:
   - `tadashi_lifeos_db` (main DB)
   - `tadashi_pre_reset_backup`, `tadashi_pre_import_backup` (safety snapshots)
   - `tadashi_gemini_key`, `tadashi_gemini_model`
   - `tadashi_voice_output`, `tadashi_voice_speed`, `tadashi_voice_pitch`, `tadashi_selected_voice`
6. **All data writes go through `DB.<domain>.<method>()`.** Never mutate the object returned by a getter (they return deep copies, so the mutation is lost) and never write `localStorage['tadashi_lifeos_db']` directly.
7. **Never remove the confirmation or snapshot logic** for destructive actions (delete, reset, import). Add confirmation to any new destructive action.
8. **Escape user-controlled text** before putting it into `innerHTML` (see §6). This is the most likely source of real bugs here.
9. **Keep the `window.*` function names** that inline `onclick="…"` handlers call (e.g. `toggleTaskItem`, `deleteTaskItem`, `quickDomainAIHelp`, `returnToDomainsHub`, `switchTab`, `showToast`). Renaming one without updating every `onclick` that references it causes a silent runtime error on click. Search with grep before renaming.
10. **Do not add `localStorage` reads/writes that throw.** Wrap in try/catch (storage can be full or blocked).

## 4. Architecture you must understand

### Data layer (`js/db.js`)
- Domain namespaces on `DB`: `user`, `lifeState`, `tasks`, `goals`, `calendar`, `study`, `fitness`, `nutrition`, `finance`, `wellbeing`, `shopping`, `relationships`, `homeModule`, `vehicle`, `travel`, `entertainment`, `documents`, `knowledge`, `routines`, `digitalLife`, `analytics`.
- Note the naming mismatch: UI domain id `home-module` ↔ `DB.homeModule`; `digital-life` ↔ `DB.digitalLife`. Convert explicitly; do not assume ids equal property names.
- Top level: `DB.init()`, `DB.reset()`, `DB.undo()`, `DB.onChange(fn)`, `DB.getAll()`, `DB.importState(obj)`, `DB.restorePreResetBackup()`, `DB.hasPreResetBackup()`, `DB.buildAISummary()`.
- Every write pushes an undo snapshot (max 20), saves, and emits `{domain, action, payload}` to `onChange` listeners.
- `DB.onChange` listeners are **append-only** (no unsubscribe). Register once at startup, never inside a render function, or listeners accumulate and re-render repeatedly.
- IDs come from `Date.now()`-based counter (`_nextId`). Compare with `==` when an id may be a string from the DOM (the existing code does this).
- Before adding a field to `DATA` in `data.js`, remember existing users already have a saved copy: **new fields will be `undefined` for them.** Read defensively (`s.x?.y ?? default`) or add a migration in `_load()`.

### Rendering (`js/domain-pages.js`)
- `openDomainPage(id)` → `renderDomainPage(id)` → `getDomainSpecificHtml(domainId, domain)` → one `render<Name>Domain(state)` function per domain. The result is written with `container.innerHTML = …` into `#view-domain-page`.
- **Every action re-renders the whole domain page** (`renderDomainPage('tasks')`). This resets scroll position, focus, and any animation in progress. Preserve `scrollTop` and re-focus if you add inputs.
- Domain id aliases live in `ALIAS_MAP` (`homecare→home-module`, `vault→documents`, `digital→digital-life`, `workspace→home`). Always pass ids through `normalizeDomainId`.
- Adding a domain page = (1) add an entry to the domain registry, (2) add `render<Name>Domain`, (3) add the case in `getDomainSpecificHtml`, (4) add a DB namespace and seed data. Skipping any step gives a blank page.

### Duplicate registries (known trap)
`DOMAINS` is defined in **two places**: the inline script in `index.html` and `DOMAINS_REGISTRY` in `domain-pages.js` (which then sets `window.DOMAINS = DOMAINS_REGISTRY`). They already differ (e.g. the fitness `tag`). **Edit both**, or better, remove one and keep a single source.

### View switching (inline script)
- `switchTab(viewId)` toggles the class `.panel-hidden` (`display:none !important`) on `.view-panel` elements, restyles `.nav-btn` by **overwriting `className` strings**, and sets `#view-title` / `#view-subtitle`.
- `openDomainPage` additionally sets `style.display` directly on panels. Mixing the class and the inline style is fragile: if you hide/show a panel, clear both.
- Panel ids: `view-workspace`, `view-tadashi`, `view-manage`, `view-briefings`, `view-schedule`, `view-domain-page`.
- Because `switchTab` rewrites `className`, **any class you add to a nav button by hand is erased** on the next tab change. Add state classes inside `switchTab`.

### AI (`js/lib/ai.js`)
- Model comes from `AI.getModel()` (localStorage override, else `DEFAULT_MODEL`). Don't hard-code model names elsewhere.
- Errors are mapped to friendly messages in `_call`. Keep user-facing errors free of keys and raw response bodies.
- AI "tool calls" mutate data through `DB`; keep that path, and keep the Approve / Edit / Reject cards in front of anything destructive.

## 5. Styling rules

- Tailwind classes only inside HTML strings. Config tokens (colors like `primary-container`, `surface-container`, `outline`, `tertiary`) are defined in the inline `tailwind.config`. Use them; don't invent hex values when a token exists.
- **Dynamic Tailwind class names must be full literal strings.** The Play CDN scans the DOM at runtime so ``text-${c}-500`` happens to work today, but it breaks the day a CLI build is introduced. Write `{cyan:'text-primary-container', …}[c]` lookup maps instead.
- **CSS variables `--accent-cyan`, `--accent-red`, `--accent-amber` are NOT defined** in the live app. They only exist in the dead `css/main.css`. `Utils.deadlineColor()`, `Utils.arc()`, `Utils.miniChart()` and `Utils.md()` code-spans use them, so they currently resolve to nothing. When touching those helpers, replace with real values (`#00d4ff`, `#f43f5e`, `#f59e0b`) or define the variables on `:root` in the inline `<style>`. Never "fix" it by linking `main.css`; that file will restyle the whole page.
- Palette: bg `#06080e`, cyan `#00d4ff`, emerald/tertiary `#6af7ba`, amber `#f59e0b`, violet `#d0bcff`, rose `#f43f5e`. Fonts: Inter (UI), JetBrains Mono (labels/numbers).
- Minimum text size 11px for anything meaningful. Don't add more `text-[8px]`/`text-[9px]`/`text-[10px]`.
- `backdrop-filter` is expensive. Don't add more than the existing `.glass-*` classes; keep blur ≤ 12px.

## 6. Security: escaping user text (do this every time)

`domain-pages.js` currently has **zero** calls to `Utils.escapeHtml`, yet it interpolates stored/user/AI text into `innerHTML` (task titles, event titles, notes, contact names…). Stored data can come from the import feature or from AI output, so this is a stored-XSS path.

Rules for new or edited code:
- Any `${…}` inside an HTML template that holds user, imported, or AI-generated text → `${Utils.escapeHtml(value)}`.
- Values placed in **attributes** (`title="…"`, `value="…"`) must also be escaped.
- Values placed in **inline handlers** (`onclick="fn('${name}')"`) are the worst case: an apostrophe breaks the handler or injects code. Don't interpolate text into handlers. Use a `data-id` with the numeric id and look the item up, or pass `encodeURIComponent(name)` and decode inside the handler.
- Use `textContent` instead of `innerHTML` whenever no markup is needed.
- `Utils.md()` already escapes before formatting. Use it for AI replies, never raw `innerHTML = reply`.
- Numbers from the DB should still be coerced (`Number(x) || 0`) before use in styles like `width:${pct}%`.

Known existing instances to fix when you're nearby: `showToast(\`Added "${title}" …\`)` is OK (toast escapes), but the calendar renderer, task lists, and most `render*Domain` templates are not.

## 7. Coding conventions

- Match the surrounding style: 2-space indent, single quotes in JS, semicolons, `const`/`let` (no `var` in new code; the old calendar code uses it, leave it).
- Optional-chain DB reads: saved data may lack newer fields.
- Dates: `Utils.today()` returns UTC `YYYY-MM-DD` (from `toISOString`). Near midnight in IST (UTC+5:30) this can be yesterday's date. For "today" comparisons in new code use a local-date helper (`new Date().toLocaleDateString('en-CA')`) and don't mix the two in one comparison.
- Currency is `₹`, locale `en-IN`. Use `Utils.fmtCurrency` / `Utils.fmt`.
- `Utils.animateNumber(el, from, to, duration, suffix)` **already exists** (integer rounding, no formatting, no reduced-motion check). Extend it instead of creating a second function with a different signature. Do not break its current call signature.
- Timers: store the interval id and clear it. Existing intervals: clock (30 s, `index.html`), progress timer (`index.html` ~2339), Heavy rest timer (`domain-pages.js` `hs.timerInterval`). Never start a timer in a render function without clearing the previous one.
- Toasts: `window.showToast(msg)`. It removes the previous toast first. Always guard with `typeof window.showToast === 'function'` as existing code does.
- Don't use `alert`/`prompt` in new code (14 exist). Use the in-app modal pattern or a `<dialog>`.
- Comments explain *why*, not *what*. Don't leave commented-out code or `console.log` in commits.

## 8. Accessibility and motion (required for all new UI)

- Icon-only buttons need `aria-label`. Modals need `role="dialog"`, `aria-modal="true"`, a label, `Esc` to close, and focus return.
- Interactive things are `<button>` or `<a href>`, not clickable `<div>`.
- Provide a visible `:focus-visible` style; never `outline: none` without a replacement.
- Animate **only `transform` and `opacity`**. Never animate `width`, `height`, `top`, `left`, `box-shadow`, or `filter` in a loop.
- Every new animation must be disabled under `@media (prefers-reduced-motion: reduce)`. Infinite animations must pause when `document.hidden`.
- Don't add `will-change` permanently; set it only for the duration of an animation.
- Progressive enhancement: feature-check `document.startViewTransition`, `animation-timeline`, and `@starting-style`; content must be fully usable without them.
- See `TADASHI_FIXES.md` (Priority 2) for the planned motion system and its tokens.

## 9. Workflow for every change

1. **Locate the live code.** `grep -rn "<thing>" index.html js/ --include=*.js --include=index.html`. Make sure you are not in `archive/`, `js/pages/`, `js/components/`, or `css/`.
2. **Make the smallest change that solves the task.** Don't refactor unrelated code in the same change.
3. **Check syntax** (no browser needed):
   ```bash
   for f in js/data.js js/db.js js/utils.js js/lib/ai.js js/lib/voice.js js/domain-pages.js; do node --check "$f" || echo "FAIL $f"; done
   # inline scripts in index.html:
   python3 - <<'PY'
   import re
   h = open('index.html', encoding='utf8').read()
   open('/tmp/inline.js', 'w').write('\n'.join(re.findall(r'<script>(.*?)</script>', h, re.S)))
   PY
   node --check /tmp/inline.js
   ```
4. **Check references.** If you renamed or removed a `window.*` function or an element id, grep for every `onclick=`/`getElementById` that uses it. Element ids must stay unique (currently 57 ids, no duplicates).
5. **Run it.** Serve statically (`python3 -m http.server 8000`) and open the page. Verify:
   - No red errors in the console on load, and after opening the domain you changed.
   - Test at **375px** (mobile layout) and **1280px** (desktop layout). They are different DOM trees; a fix in one is not a fix in the other.
   - Reload the page: data persists. Then test with **existing saved data** (don't only test after a reset), since migrations are the usual failure.
   - Settings → export JSON, reset, undo/restore still work.
6. **Bump the cache-buster** `?v=` on `domain-pages.js` in `index.html` when you change that file, or users will keep the cached version.
7. **Commit** with a conventional message (`fix:`, `feat:`, `perf:`, `a11y:`, `chore:`), one logical change per commit.

## 10. Do / Don't quick list

| Do | Don't |
|---|---|
| Edit `index.html`, `js/*.js`, `js/lib/*.js` | Edit `css/`, `archive/`, `js/pages/`, `js/components/`, `stitch_*` |
| Escape user text in templates | Put raw titles/notes in `innerHTML` or inline handlers |
| Use `DB.<domain>.*` for writes | Mutate getter results or write localStorage directly |
| Read new fields defensively | Assume saved data has fields added after launch |
| Update both `DOMAINS` registries | Change only one of them |
| Test mobile **and** desktop layouts | Assume one layout covers the other |
| Match CRLF/LF per file | Re-save whole files with different line endings |
| Keep script order and `window.*` names | Rename globals used by `onclick` without grepping |
| Respect reduced motion | Add infinite or layout-animating effects |
| Ask when requirements conflict | Guess and add a dependency or build step |

## 11. Known issues (so you don't mistake them for your regressions)

- `--accent-*` CSS variables undefined in the live app (see §5).
- No escaping in `domain-pages.js` templates (see §6).
- `DOMAINS` defined twice with drift (see §4).
- Header/status text such as "Exam in 6d", "LifeScore 84", "Mom Bday 23:15" and the calendar events are **hard-coded or generated**, not computed from `DB`.
- Mobile header shows a fixed "84/100".
- `README` says "zero build step"; the Tailwind Play CDN is a production warning in the console.
- `Utils.today()` is UTC-based (see §7).
- Native `confirm/alert/prompt` still in use.

Fix these only when a task asks for them, or when your change touches the same lines.

## 12. When unsure

Stop and ask rather than guess if a task would: change a storage key or data shape, add a dependency or build tool, delete a domain, alter script order, or remove a confirmation/safety snapshot.
