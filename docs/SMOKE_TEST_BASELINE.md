# TADASHI — Manual Smoke Test Baseline

Run these tests after every change before committing. No automated test harness exists yet. Add one in Phase 2/4.

## Setup

1. `python3 -m http.server 8000` from the repo root (or any static server).
2. Open `http://localhost:8000` in Chrome or Edge.
3. Open DevTools → Console. Zero red errors is the pass condition for each test.

---

## 0. Pre-flight

- [ ] `node --check js/data.js js/db.js js/utils.js js/lib/ai.js js/lib/voice.js js/domain-pages.js` — all pass.
- [ ] No `.env` file or API key in any committed file (grep `tadashi_gemini_key` in source — must not appear as a literal value).

## 1. Load and layout

- [ ] App opens at `http://localhost:8000` — no red console errors.
- [ ] Desktop layout (1280px): header dock, nav tabs, workspace view visible.
- [ ] Mobile layout (375px DevTools): bottom nav visible, desktop nav hidden.
- [ ] Live clock ticks in the header.
- [ ] "TADASHI AI" tab opens the chat panel.
- [ ] "Manage" tab shows all 22 domain cards.
- [ ] All 22 domain cards open their dedicated page without errors.

## 2. Data persistence

- [ ] Add a task via the TADASHI AI chat (requires Gemini API key set in Settings).
- [ ] Reload the page — task persists.
- [ ] Settings → Export JSON — downloads a file with current data.
- [ ] Settings → Reset All Data (confirm dialog required).
- [ ] Settings → Restore pre-reset backup — data returns.
- [ ] Undo button in chat — reverses last DB change.

## 3. AI and voice

- [ ] Set Gemini API key in Settings → Key accepted (green indicator).
- [ ] Send "List my tasks" in TADASHI AI — response arrives, no tool error.
- [ ] Send "Add task: test smoke" — task appears in Tasks domain.
- [ ] Voice Link button opens the voice modal.
- [ ] Mic permission denied → voice modal shows an error message, text chat still works.
- [ ] End Call closes the modal and returns to previous view.

## 4. Visuals (Phase 0 specific)

- [ ] Progress arc rings in domain pages render in cyan (not invisible). Confirms `--accent-cyan` fix.
- [ ] Overdue items show red colour (not invisible). Confirms `deadlineColor()` fix.
- [ ] AI reply code-spans render in cyan. Confirms `Utils.md()` fix.

## 5. Security smoke checks

- [ ] DevTools → Application → Local Storage: `tadashi_lifeos_db` present; `tadashi_gemini_key` present if key was set. No other sensitive data visible.
- [ ] DevTools → Network: API request to Gemini uses `x-goog-api-key` header (expected); key is NOT in the URL query string.
- [ ] No `console.log` with key content visible in Console.

---

## Known failures (do not treat as regressions)

- Mobile header shows a fixed "84/100" LifeScore — not computed from DB (known issue per AGENTS.md §11).
- Hard-coded calendar events in workspace view (known issue per AGENTS.md §11).
- Some domain pages have unescaped user text in innerHTML — tracked in Phase 0 task 0.6.

