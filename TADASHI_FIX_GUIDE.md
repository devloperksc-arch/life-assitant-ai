# TADASHI LifeOS — Production Fix & Deployment Guide

This guide documents the root causes, architecture changes, and exact **Before** and **After** code modifications applied to TADASHI LifeOS to eliminate performance bottlenecks, remove the Tailwind Play CDN, fix AI function-calling and routing, coalesce rendering, and make the application completely production-ready and deployable to Vercel.

---

## Table of Contents
1. [Issue 1: Tailwind Play CDN Replaced with Static Build](#issue-1-tailwind-play-cdn-replaced-with-static-build)
2. [Issue 2: Non-Blocking Script Loading](#issue-2-non-blocking-script-loading)
3. [Issue 3: Render Coalescing & Container Isolation](#issue-3-render-coalescing--container-isolation)
4. [Issue 4: High-Performance Database Operations](#issue-4-high-performance-database-operations)
5. [Issue 5: Visual Effects & Animation Optimization](#issue-5-visual-effects--animation-optimization)
6. [Issue 6: Production Service Worker & Valid PWA Icons](#issue-6-production-service-worker--valid-pwa-icons)
7. [Issue 7: AI Model Upgrade, Timeout & Multi-Tool Calling](#issue-7-ai-model-upgrade-timeout--multi-tool-calling)
8. [Issue 8: Route Sync, Escaping & General Polish](#issue-8-route-sync-escaping--general-polish)
9. [Vercel Deployment Guide](#vercel-deployment-guide)

---

## Issue 1: Tailwind Play CDN Replaced with Static Build

### Root Cause
`index.html` loaded `https://cdn.tailwindcss.com?plugins=forms,container-queries` synchronously in `<head>`. At runtime:
- If the CDN was blocked or slow, the entire dashboard rendered unstyled or blank.
- The browser spent 200–500ms evaluating the runtime compiler, scanning the DOM on every mutation.
- `.gitignore` contained `css/tailwind.css`, which prevented committing a compiled stylesheet.

### Fix
1. Extracted all custom design tokens, dark palette, shadows, and fonts into `tailwind.config.js`.
2. Created `src/input.css` with `@tailwind base; @tailwind components; @tailwind utilities;`.
3. Compiled a 64 KB standalone minified CSS bundle: `css/tailwind.css`.
4. Removed `css/tailwind.css` from `.gitignore`.
5. Linked `css/tailwind.css` immediately after the inline `<style>` block in `index.html`.

#### Before (`index.html`)
```html
<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script id="tailwind-config">
  tailwind.config = {
    darkMode: "class",
    theme: {
      extend: {
        colors: { ... },
        boxShadow: { ... }
      }
    }
  };
</script>
```

#### After (`index.html`)
```html
<!-- Compiled Tailwind CSS (Phase 8: Offline static bundle) -->
<link rel="stylesheet" href="css/tailwind.css" />
```

---

## Issue 2: Non-Blocking Script Loading

### Root Cause
13 engine scripts were loaded synchronously in `<head>`, blocking DOM parsing and initial paint until ~600KB of JavaScript finished parsing.

### Fix
Added the `defer` attribute to all 13 engine scripts in `<head>`. Deferred scripts download in parallel without blocking HTML parsing and execute in their exact document order just prior to `DOMContentLoaded`.

#### Before (`index.html`)
```html
<script src="js/data.js?v=5.8"></script>
<script src="js/db.js?v=5.8"></script>
<script src="js/utils.js?v=5.8"></script>
<script src="js/lib/ai.js?v=5.8"></script>
<script src="js/lib/voice.js?v=5.8"></script>
<script src="js/domain-pages.js?v=5.8"></script>
<script src="js/assistant/reactor-ui.js?v=5.8"></script>
<script src="js/assistant/ai-router.js?v=5.8"></script>
<script src="js/assistant/scheduler.js?v=5.8"></script>
<script src="js/assistant/sync-engine.js?v=5.8"></script>
<script src="js/assistant/memory.js?v=5.8"></script>
<script src="js/assistant/skill-runtime.js?v=5.8"></script>
<script src="js/assistant/tool-registry.js?v=5.8"></script>
```

#### After (`index.html`)
```html
<script defer src="js/data.js?v=5.8"></script>
<script defer src="js/db.js?v=5.8"></script>
<script defer src="js/utils.js?v=5.8"></script>
<script defer src="js/lib/ai.js?v=5.8"></script>
<script defer src="js/lib/voice.js?v=5.8"></script>
<script defer src="js/domain-pages.js?v=5.8"></script>
<script defer src="js/assistant/reactor-ui.js?v=5.8"></script>
<script defer src="js/assistant/ai-router.js?v=5.8"></script>
<script defer src="js/assistant/scheduler.js?v=5.8"></script>
<script defer src="js/assistant/sync-engine.js?v=5.8"></script>
<script defer src="js/assistant/memory.js?v=5.8"></script>
<script defer src="js/assistant/skill-runtime.js?v=5.8"></script>
<script defer src="js/assistant/tool-registry.js?v=5.8"></script>
```

---

## Issue 3: Render Coalescing & Container Isolation

### Root Cause
1. `DB.onChange` triggered a complete `renderDomainPage(id)` re-render on every single write, while domain click handlers called `renderDomainPage` again manually, causing duplicate re-renders back-to-back.
2. In `domain-pages.js`, `mobileContainer.innerHTML = container.innerHTML` copied all rendered elements into a second container, duplicating all DOM IDs (e.g., `domain-ai-prompt-${id}`). On mobile, inputs read the hidden desktop element instead of the mobile input.
3. Every re-render wiped input text and reset the page scroll position.

### Fix
1. Coalesced `renderDomainPage` using `requestAnimationFrame`. Multiple synchronous DB writes now batch into a single paint frame.
2. Isolated mobile vs desktop rendering: when mobile is active (<1024px), it renders only into `#mobile-domain-view-content` and clears the desktop container. When desktop is active, it renders only into `#view-domain-page` and clears mobile.
3. Preserved scroll position (`window.scrollY`) and active input state (`id`, `value`, and selection range) across re-renders.

#### Before (`js/domain-pages.js`)
```javascript
function renderDomainPage(id) {
  const container = document.getElementById('view-domain-page');
  if (!container) return;
  const contentHtml = getDomainSpecificHtml(domainId, domain);
  container.innerHTML = `...`;

  const mobileContainer = document.getElementById('mobile-domain-view-content');
  if (mobileContainer) {
    mobileContainer.innerHTML = container.innerHTML;
  }
}
```

#### After (`js/domain-pages.js`)
```javascript
let _renderRaf = null;
let _pendingDomainId = null;

function renderDomainPage(id) {
  _pendingDomainId = id || currentDomainId;
  if (_renderRaf) return;
  if (typeof requestAnimationFrame === 'function') {
    _renderRaf = requestAnimationFrame(() => {
      _renderRaf = null;
      if (_pendingDomainId) _doRenderDomainPage(_pendingDomainId);
    });
  } else {
    if (_pendingDomainId) _doRenderDomainPage(_pendingDomainId);
  }
}

function _doRenderDomainPage(id) {
  // 1. Save scroll position & active input state
  let activeInputId = null;
  let activeInputValue = null;
  let activeSelectionStart = null;
  let activeSelectionEnd = null;
  if (typeof document !== 'undefined' && document.activeElement && document.activeElement.tagName === 'INPUT') {
    activeInputId = document.activeElement.id;
    activeInputValue = document.activeElement.value;
    try {
      activeSelectionStart = document.activeElement.selectionStart;
      activeSelectionEnd = document.activeElement.selectionEnd;
    } catch(e) {}
  }
  const prevScrollY = (typeof window !== 'undefined') ? window.scrollY : 0;

  // 2. Build HTML
  const contentHtml = getDomainSpecificHtml(domainId, domain);
  const renderedHtml = `...`;

  // 3. Render into active layout container only (prevents duplicate IDs)
  let isMobile = false;
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try { isMobile = window.matchMedia('(max-width: 1023px)').matches; } catch(e) {}
  }

  if (isMobile && mobileContainer) {
    mobileContainer.innerHTML = renderedHtml;
    if (container) container.innerHTML = '';
  } else if (container) {
    container.innerHTML = renderedHtml;
    if (mobileContainer) mobileContainer.innerHTML = '';
  }

  // 4. Restore scroll & active input focus/value
  if (typeof window !== 'undefined' && prevScrollY > 0) window.scrollTo(0, prevScrollY);
  if (activeInputId) {
    const inputEl = document.getElementById(activeInputId);
    if (inputEl) {
      if (activeInputValue !== null) inputEl.value = activeInputValue;
      try {
        inputEl.focus();
        if (activeSelectionStart !== null) inputEl.setSelectionRange(activeSelectionStart, activeSelectionEnd);
      } catch(e) {}
    }
  }
}
```

---

## Issue 4: High-Performance Database Operations

### Root Cause
1. `_pushUndo()` performed `JSON.parse(JSON.stringify(_state))` on every single write (66 call sites), deep-cloning hundreds of KB synchronously.
2. `_save()` wrote directly to `localStorage` synchronously on every mutation (69 call sites), blocking the main thread.
3. Domain getters (`list()`, `get()`) called `JSON.parse(JSON.stringify(...))` on every read (33 call sites).

### Fix
1. Stored undo snapshots as JSON strings directly: `_undoStack.push(JSON.stringify(_state))`. Only parse when `undo()` is actually called.
2. Debounced `_save()` writes with a 150ms trailing timer, flushing synchronously on `pagehide`, `beforeunload`, `visibilitychange`, and in `reset()` / `importState()`.
3. Created a `_clone` helper utilizing native `structuredClone` (with fallback to `JSON.parse(JSON.stringify)`) for fast non-blocking reads.

#### Before (`js/db.js`)
```javascript
function _save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_state)); }
  catch(e) { console.warn('TADASHI DB: localStorage write failed', e); }
}

function _pushUndo() {
  _undoStack.push(JSON.parse(JSON.stringify(_state)));
  if (_undoStack.length > 20) _undoStack.shift();
}

function undo() {
  if (!_undoStack.length) return false;
  _state = _undoStack.pop();
  _save();
  _emit('all','undo',null);
  return true;
}
```

#### After (`js/db.js`)
```javascript
const _clone = typeof structuredClone === 'function'
  ? (obj) => (obj === undefined ? undefined : structuredClone(obj))
  : (obj) => (obj === undefined ? undefined : JSON.parse(JSON.stringify(obj)));

let _saveTimer = null;
function _flushSave() {
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_state)); }
  catch(e) { console.warn('TADASHI DB: localStorage write failed', e); }
}

function _save() {
  if (!_saveTimer) {
    _saveTimer = setTimeout(() => {
      _saveTimer = null;
      _flushSave();
    }, 150);
  }
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('pagehide', _flushSave);
  window.addEventListener('beforeunload', _flushSave);
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') _flushSave();
    });
  }
}

function _pushUndo() {
  _undoStack.push(JSON.stringify(_state));
  if (_undoStack.length > 20) _undoStack.shift();
}

function undo() {
  if (!_undoStack.length) return false;
  const raw = _undoStack.pop();
  try {
    _state = JSON.parse(raw);
    _flushSave();
    _emit('all','undo',null);
    return true;
  } catch(e) { return false; }
}
```

---

## Issue 5: Visual Effects & Animation Optimization

### Root Cause
1. Three fixed background elements used `blur-[80px]`, forcing large software canvas blur redraws on scrolling.
2. `.glass-surface` applied `backdrop-filter: blur(8px)` to all 22 domain cards, causing heavy multi-layer GPU compositing.
3. Reactor SVG had `filter="url(#reactorBloom)"` applied to `g.reactor-ring-outer`, which continuously rotates (`reactor-spin-cw 26s linear infinite`), forcing an SVG Gaussian blur re-rasterization on every frame.
4. Tab switching triggered `window.scrollTo({ top: 0, behavior: 'smooth' })`, causing perceived lag.

### Fix
1. Replaced background blur layers with CSS `radial-gradient` backgrounds.
2. Removed `backdrop-filter` from repeating `.glass-surface` cards, setting a clean dark alpha background `rgba(14, 18, 30, 0.92)` with crisp 1px borders.
3. Removed `filter="url(#reactorBloom)"` from the rotating SVG ring.
4. Made tab transitions scroll instantaneously: `window.scrollTo(0, 0)`.

#### Before (`index.html` & `reactor-ui.js`)
```html
<!-- Background Ambient Lighting Grid & Orbs -->
<div class="fixed inset-0 pointer-events-none z-0 overflow-hidden">
  <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[280px] bg-primary-container/8 rounded-full blur-[80px]"></div>
  <div class="absolute top-1/3 -left-48 w-[400px] h-[400px] bg-secondary-container/8 rounded-full blur-[80px]"></div>
  <div class="absolute top-2/3 -right-48 w-[500px] h-[400px] bg-tertiary/4 rounded-full blur-[80px]"></div>
</div>

<!-- Rotating SVG ring in reactor-ui.js -->
<circle cx="100" cy="100" r="74" fill="none" stroke="#00d4ff" stroke-width="2.5"
        stroke-dasharray="16 8 4 8 28 12" stroke-linecap="round" opacity="0.85" filter="url(#reactorBloom)" />
```

#### After (`index.html` & `reactor-ui.js`)
```html
<!-- Hardware-accelerated radial background gradient -->
<div class="fixed inset-0 pointer-events-none z-0 overflow-hidden" 
     style="background: radial-gradient(700px 280px at 50% 0%, rgba(0, 212, 255, 0.08), transparent 70%), radial-gradient(400px 400px at 0% 35%, rgba(87, 27, 193, 0.08), transparent 70%), radial-gradient(500px 400px at 100% 70%, rgba(106, 247, 186, 0.04), transparent 70%);">
</div>

<!-- Crisp vector rotation without per-frame SVG filter blur -->
<circle cx="100" cy="100" r="74" fill="none" stroke="#00d4ff" stroke-width="2.5"
        stroke-dasharray="16 8 4 8 28 12" stroke-linecap="round" opacity="0.85" />
```

---

## Issue 6: Production Service Worker & Valid PWA Icons

### Root Cause
1. `sw.js` had a hardcoded precache for `js/domain-pages.js?v=5.2` while `index.html` loaded `?v=5.8`, so the precache never matched.
2. Fetch strategy for navigation requests was Cache-First with no network fallback. Deploying updates caused users to see old HTML indefinitely.
3. `manifest.json` and `sw.js` referenced `favicon.ico`, which did not exist in the repository.

### Fix
1. Updated `sw.js` to use **Network-First** for navigation and HTML documents, ensuring new releases are fetched immediately, with fallback to cache when offline.
2. Implemented `__BUILD_ID__` cache stamping so every build creates an isolated cache and purges obsolete caches on activate.
3. Created `favicon.svg`, `favicon.png`, `assets/icon-192.png`, and `assets/icon-512.png` with official TADASHI branding.
4. Configured `manifest.json` with correct SVG and PNG icons.

#### After (`sw.js`)
```javascript
const BUILD_ID = '__BUILD_ID__';
const CACHE_NAME = `tadashi-shell-${BUILD_ID}`;

// Network-first for navigation/HTML documents
if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match('./index.html'))
  );
  return;
}
```

---

## Issue 7: AI Model Upgrade, Timeout & Multi-Tool Calling

### Root Cause
1. `DEFAULT_MODEL` was `gemini-1.5-flash`. Google retired 1.5 and 2.0 experimental endpoints, returning 404 errors.
2. The Gemini `fetch` had no timeout, allowing the chat UI to hang indefinitely if a request stalled.
3. When Gemini returned multiple function calls in one candidate turn (`parts.filter(p => p.functionCall)`), TADASHI only handled `parts.find(...)` and responded with one `functionResponse`. Gemini rejected the subsequent request with a 400 error because responses were missing for the other function calls.
4. `AIRouter.resolveRoute()` unconditionally executed `await OllamaProvider.isAvailable(1000)` on every chat turn, causing a 1-second delay and mixed-content security blocks on HTTPS/Vercel even when a Gemini cloud key was configured.

### Fix
1. Updated `DEFAULT_MODEL` to `'gemini-flash-latest'` (official alias) and added `gemini-2.5-flash` and `gemini-2.5-pro` to `MODELS`.
2. Added auto-migration in `getModel()`: any saved setting referencing `1.5` or `2.0` automatically migrates to `'gemini-flash-latest'`.
3. Added a 30-second timeout via `AbortController` in `AI._call()`.
4. Handled multiple function calls per turn by executing each tool and appending all `functionResponse` parts in the return turn.
5. Made Ollama health probing lazy in `AIRouter`: when online with a configured Gemini key, zero time is spent probing `http://127.0.0.1:11434`.

#### After (`js/lib/ai.js`)
```javascript
// Function calling loop handling multiple tool calls in a single candidate turn
const parts = candidate?.content?.parts || [];
const fnCalls = parts.filter(p => p.functionCall);
if (!fnCalls.length) break;

const responseParts = [];
for (const call of fnCalls) {
  const { name, args } = call.functionCall;
  let toolResult = await window.ToolRegistry.execute(name, args, ...);
  responseParts.push({
    functionResponse: {
      name,
      response: { content: JSON.stringify(toolResult.result ?? toolResult.error ?? toolResult) }
    }
  });
}
turns.push({ role: 'model', parts });
turns.push({ role: 'user',  parts: responseParts });
```

---

## Issue 8: Route Sync, Escaping & General Polish

### Root Cause
1. `popstate` and `hashchange` both fired during browser back/forward navigation, executing `syncRouteFromHash` twice.
2. On initial page load, `DOMContentLoaded`, `load`, and `domain-pages.js` all called `syncRouteFromHash` or `openDomainPage`.
3. Speech recognition transcripts were interpolated into `innerHTML` without escaping.
4. Mojibake `â€”` was present in `openDomainModal`.
5. `chatHistory` was declared with `let chatHistory = []` in the inline script scope, leaving `window.chatHistory` undefined so domain AI prompts lost context.
6. Two conflicting `<meta name="theme-color">` tags existed (`#06080e` and `#00d4ff`).
7. Material Symbols font requested full axes ranges (`opsz 20..48, wght 100..700, FILL 0..1, GRAD -50..200`), downloading a multi-megabyte variable font.

### Fix
1. Added `_lastSyncedHash` and `_popstateActive` flags to coalesce route synchronizations to exactly once per navigation.
2. Escaped all speech recognition transcripts using `Utils.escapeHtml()`.
3. Fixed mojibake `â€”` to an em-dash `—`.
4. Explicitly bound `window.chatHistory = chatHistory`.
5. Removed duplicate theme-color meta tag, preserving `#06080e`.
6. Streamlined Material Symbols font URL to `opsz,wght,FILL,GRAD@20..24,300..600,0..1,0`.

---

## Vercel Deployment Guide

### Deployment Architecture
- **Root source**: Preserves vanilla HTML/CSS/JS architecture for local development and test runners.
- **Production output**: Assembled by `scripts/build-vercel.js` into `dist/`.
- **Cache headers**: `sw.js` is served with `Cache-Control: no-cache, no-store, must-revalidate`. Static assets in `/css` and `/assets` receive immutable 1-year cache headers.

### Deployment Steps

#### Option A: Deploy via Vercel CLI
```bash
# 1. Install dependencies (optional if dist already built)
npm install

# 2. Build production distribution
npm run build

# 3. Deploy to Vercel
npx vercel --prod
```

#### Option B: Deploy via Git (GitHub / GitLab / Bitbucket)
1. Push repository commits to GitHub:
   ```bash
   git push origin main
   ```
2. In your Vercel Dashboard, import the repository.
3. Vercel automatically detects `vercel.json`:
   - **Framework Preset**: Other
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Click **Deploy**.

#### Option C: Instant Deployment via Pre-built Zip
The repository includes `Tadashi-deployable.zip` containing the complete codebase with pre-compiled CSS, assets, and the `dist/` directory ready for deployment.
1. Extract `Tadashi-deployable.zip`.
2. Run `npx vercel` inside the extracted folder.
