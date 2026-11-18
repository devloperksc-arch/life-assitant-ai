// ============================================================
// TADASHI LifeOS — Localhost Server & Domain Page Loading Verification
// Validates HTTP 200 on all assets, verifies all 22 domain page renderers,
// and ensures zero missing elements or runtime exceptions.
// ============================================================

const assert = require('assert');
const http = require('http');

function fetchHttp(urlStr) {
  return new Promise((resolve, reject) => {
    http.get(urlStr, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          text: () => Promise.resolve(data)
        });
      });
    }).on('error', reject);
  });
}

async function verifyPageLoading() {
  console.log('--- VERIFYING TADASHI LOCALHOST & PAGE LOADING ---');

  const BASE_URL = 'http://127.0.0.1:8000';

  // 1. Fetch index.html
  console.log(`\n[Step 1] Fetching ${BASE_URL}/index.html...`);
  let html;
  try {
    const res = await fetchHttp(`${BASE_URL}/index.html`);
    assert.strictEqual(res.status, 200, `Expected status 200, got ${res.status}`);
    html = await res.text();
    console.log(`✓ index.html loaded successfully (${html.length} bytes)`);
  } catch (err) {
    console.error(`✗ Failed to connect to ${BASE_URL}:`, err.message);
    process.exit(1);
  }

  // 2. Check all local script and stylesheet tags
  console.log('\n[Step 2] Validating local asset URLs...');
  const scriptRegex = /<script\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
  const linkRegex = /<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;

  const localAssets = [];
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    const src = match[1];
    if (!src.startsWith('http://') && !src.startsWith('https://')) {
      localAssets.push(src);
    }
  }
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('data:')) {
      localAssets.push(href);
    }
  }

  console.log(`Found ${localAssets.length} local assets referenced in index.html:`);
  let failedAssets = 0;
  for (const asset of localAssets) {
    try {
      const res = await fetchHttp(`${BASE_URL}/${asset}`);
      if (res.status === 200) {
        const body = await res.text();
        console.log(`  ✓ [200 OK] ${asset} (${body.length} bytes)`);
      } else {
        console.error(`  ✗ [${res.status} FAIL] ${asset}`);
        failedAssets++;
      }
    } catch (e) {
      console.error(`  ✗ [ERROR] ${asset}: ${e.message}`);
      failedAssets++;
    }
  }
  assert.strictEqual(failedAssets, 0, `${failedAssets} assets failed to load`);

  // 3. Verify DOM and Domain Renderers
  console.log('\n[Step 3] Initializing browser runtime and verifying all domain renderers...');

  let containerHtml = '';
  const mockContainer = {
    id: 'view-domain-page',
    get innerHTML() { return containerHtml; },
    set innerHTML(val) { containerHtml = val; },
    textContent: '',
    value: '',
    style: {},
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; }
    },
    setAttribute() {},
    removeAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    appendChild() {},
    querySelectorAll() { return []; },
    querySelector() { return null; }
  };

  global.window = global;
  global.document = {
    title: '',
    getElementById(id) {
      if (id === 'view-domain-page') return mockContainer;
      return {
        id,
        innerHTML: '',
        textContent: '',
        value: '',
        style: {},
        classList: {
          add() {},
          remove() {},
          toggle() {},
          contains() { return false; }
        },
        setAttribute() {},
        removeAttribute() {},
        addEventListener() {},
        removeEventListener() {},
        appendChild() {},
        querySelectorAll() { return []; },
        querySelector() { return null; }
      };
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() {
      return {
        style: {},
        classList: { add() {}, remove() {}, contains() { return false; } },
        addEventListener() {},
        appendChild() {},
        setAttribute() {},
        removeAttribute() {}
      };
    },
    addEventListener() {}
  };

  const localStorageStore = new Map();
  global.localStorage = {
    getItem(k) { return localStorageStore.has(k) ? localStorageStore.get(k) : null; },
    setItem(k, v) { localStorageStore.set(k, String(v)); },
    removeItem(k) { localStorageStore.delete(k); },
    clear() { localStorageStore.clear(); }
  };

  // Load core files in strict AGENTS.md order
  require('../js/data.js');
  require('../js/db.js');
  require('../js/utils.js');
  require('../js/lib/ai.js');
  require('../js/lib/voice.js');
  require('../js/domain-pages.js');

  assert(global.DOMAINS, 'DOMAINS registry must be defined');
  const domainList = Array.isArray(global.DOMAINS) ? global.DOMAINS : Object.values(global.DOMAINS);
  console.log(`\nTesting rendering across ${domainList.length} domains in registry:`);

  let renderedCount = 0;
  for (const d of domainList) {
    const dId = d.id;
    try {
      containerHtml = '';
      global.renderDomainPage(dId);
      assert(containerHtml.length > 50, `Rendered HTML for "${dId}" was unexpectedly empty (len=${containerHtml.length})`);
      renderedCount++;
      console.log(`  ✓ Domain [${d.num || '??'}] "${d.name || dId}" rendered cleanly (${containerHtml.length} chars generated)`);
    } catch (err) {
      console.error(`  ✗ Domain "${dId}" failed to render:`, err.message);
      throw err;
    }
  }

  assert.strictEqual(renderedCount, domainList.length, 'All domains must render successfully');

  // Verify critical DOM container IDs exist in index.html
  console.log('\n[Step 4] Checking essential viewport containers in index.html...');
  const expectedContainers = [
    'desktop-app',
    'mobile-app',
    'view-domain-page',
    'view-workspace',
    'view-tadashi',
    'view-manage',
    'view-briefings',
    'view-schedule',
    'shared-voice-modal'
  ];

  for (const cid of expectedContainers) {
    const hasId = html.includes(`id="${cid}"`) || html.includes(`id='${cid}'`);
    assert(hasId, `Critical element id="${cid}" must exist in index.html`);
    console.log(`  ✓ Element id="${cid}" present`);
  }

  // Verify DOM panel hierarchy and sibling structure
  console.log('\n[Step 5] Checking view-panel hierarchy and Manage hub cards...');
  const mainContentIndex = html.indexOf('id="main-content"');
  const mainContentEnd = html.indexOf('</main>', mainContentIndex);
  assert(mainContentIndex !== -1 && mainContentEnd !== -1, 'main#main-content must exist');

  const mainChunk = html.substring(mainContentIndex, mainContentEnd);

  // Ensure each panel is an independent sibling, not nested inside another panel
  const panels = ['view-workspace', 'view-tadashi', 'view-manage', 'view-briefings', 'view-schedule', 'view-domain-page'];
  for (const pid of panels) {
    const pIdx = mainChunk.indexOf(`id="${pid}"`);
    assert(pIdx !== -1, `Panel "${pid}" must exist inside #main-content`);
  }

  // Ensure view-manage is not nested inside view-tadashi
  const tadashiIdx = mainChunk.indexOf('id="view-tadashi"');
  const manageIdx = mainChunk.indexOf('id="view-manage"');
  assert(manageIdx > tadashiIdx, 'view-manage must be after view-tadashi');

  // Verify that between tadashiIdx and manageIdx, all opened divs inside view-tadashi are closed
  const tadashiChunk = mainChunk.substring(tadashiIdx, manageIdx);
  const tadashiOpens = (tadashiChunk.match(/<div(\s|>)/g) || []).length;
  const tadashiCloses = (tadashiChunk.match(/<\/div>/g) || []).length;
  assert.strictEqual(tadashiOpens, tadashiCloses, `view-tadashi must be fully closed before view-manage (opens: ${tadashiOpens}, closes: ${tadashiCloses})`);
  console.log(`  ✓ view-tadashi is cleanly closed before view-manage (${tadashiOpens} divs balanced)`);

  // Count 23 domain cards in view-manage
  const briefingsIdx = mainChunk.indexOf('id="view-briefings"');
  const manageChunk = mainChunk.substring(manageIdx, briefingsIdx);
  const cardMatches = manageChunk.match(/class="[^"]*domain-card[^"]*"/g) || [];
  assert.strictEqual(cardMatches.length, 23, `view-manage must contain exactly 23 domain cards, found ${cardMatches.length}`);
  console.log(`  ✓ view-manage contains all 23 domain cards in #domains-grid`);

  console.log('\n======================================================');
  console.log(`ALL ASSETS, CONTAINERS, AND ${renderedCount} DOMAIN PAGES LOADED CLEANLY`);
  console.log(`Local Web Server: ${BASE_URL}`);
  console.log('======================================================\n');
}

verifyPageLoading().catch(err => {
  console.error('\nPAGE LOADING VERIFICATION FAILED:', err);
  process.exit(1);
});
