// scripts/headless-all-pages.js
// Captures headless screenshots of all major TADASHI pages
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.join(__dirname, '..', 'screenshots');
fs.mkdirSync(outDir, { recursive: true });

const pages = [
  { name: 'workspace',    hash: '' },
  { name: 'manage',       hash: '#manage' },
  { name: 'tasks',        hash: '#tasks' },
  { name: 'fitness',      hash: '#fitness' },
  { name: 'finance',      hash: '#finance' },
  { name: 'goals',        hash: '#goals' },
  { name: 'nutrition',    hash: '#nutrition' },
  { name: 'wellbeing',    hash: '#wellbeing' },
  { name: 'shopping',     hash: '#shopping' },
  { name: 'relationships',hash: '#relationships' },
  { name: 'calendar',     hash: '#calendar' },
  { name: 'study',        hash: '#study' },
  { name: 'home-module',  hash: '#home-module' },
  { name: 'vehicle',      hash: '#vehicle' },
  { name: 'travel',       hash: '#travel' },
  { name: 'entertainment',hash: '#entertainment' },
  { name: 'documents',    hash: '#documents' },
  { name: 'knowledge',    hash: '#knowledge' },
  { name: 'routines',     hash: '#routines' },
  { name: 'digital-life', hash: '#digital-life' },
  { name: 'analytics',    hash: '#analytics' },
  { name: 'settings',     hash: '#settings' },
  { name: 'updates',      hash: '#updates' },
];

let passed = 0, failed = 0;
const results = [];

for (const page of pages) {
  const url = `http://127.0.0.1:8000/${page.hash}`;
  const tmpDir = path.join(require('os').tmpdir(), 'tadashi_hless_' + page.name + '_' + Date.now());
  const screenshot = path.join(outDir, `${page.name}.png`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const cmd = `"${chromePath}" --headless=new --disable-gpu --no-sandbox --disable-setuid-sandbox --user-data-dir="${tmpDir}" --window-size=1280,800 --screenshot="${screenshot}" "${url}"`;
  try {
    execSync(cmd, { timeout: 15000, stdio: 'ignore' });
    const size = fs.statSync(screenshot).size;
    const status = size > 10000 ? 'LOADED' : 'BLANK';
    if (status === 'LOADED') passed++; else failed++;
    results.push({ name: page.name, url, status, size });
  } catch (e) {
    failed++;
    results.push({ name: page.name, url, status: 'ERROR', size: 0, error: e.message.slice(0, 60) });
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch(e) {}
  }
}

console.log('\n=== TADASHI PAGE LOAD RESULTS ===\n');
console.log('Domain                 | Status  | Screenshot Size');
console.log('-----------------------|---------|-----------------');
for (const r of results) {
  const statusIcon = r.status === 'LOADED' ? '✓' : r.status === 'BLANK' ? '?' : '✗';
  console.log(`${statusIcon} ${r.name.padEnd(22)}| ${r.status.padEnd(8)}| ${r.size.toLocaleString()} bytes`);
}
console.log(`\nTotal: ${results.length} pages | LOADED: ${passed} | ISSUES: ${failed}`);
console.log(`Screenshots saved to: ${outDir}`);
