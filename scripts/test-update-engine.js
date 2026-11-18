// scripts/test-update-engine.js
// Unit and integration tests for UpdateEngine

const assert = require('assert');
const fs = require('fs');

// Mock browser globals for Node test environment
global.window = global;
global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};
global.Blob = class {
  constructor(parts) {
    this.size = parts.reduce((acc, p) => acc + (typeof p === 'string' ? Buffer.byteLength(p) : 0), 0);
  }
};
global.document = {
  head: {
    appendChild(el) { this._children = this._children || []; this._children.push(el); }
  },
  createElement(tag) {
    return {
      tagName: tag,
      setAttribute(k, v) { this[k] = v; },
      remove() {},
      textContent: ''
    };
  },
  getElementById(id) {
    return null;
  },
  querySelectorAll(sel) {
    return [];
  }
};

require('../js/assistant/update-engine');

async function testUpdateEngine() {
  console.log('--- STARTING UPDATE ENGINE TESTS ---');

  const engine = global.UpdateEngine;
  assert.ok(engine, 'UpdateEngine must be loaded on global');

  // Test 1: Invalid manifest without version
  console.log('\n[Test 1] Reject manifest without version');
  const res1 = engine.validate({});
  assert.strictEqual(res1.ok, false);
  assert.ok(res1.errors.some(e => e.includes('version')));
  console.log('✓ Rejected manifest missing version');

  // Test 2: Path traversal security check
  console.log('\n[Test 2] Security check: block path traversal');
  const res2 = engine.validate({
    version: '1.0.0',
    files: [
      { path: '../../server/src/server.js', content: 'console.log("bad");' }
    ]
  });
  assert.strictEqual(res2.ok, false);
  assert.ok(res2.errors.some(e => e.includes('Security violation') || e.includes('traversal')));
  console.log('✓ Blocked directory traversal attack');

  // Test 3: JavaScript syntax validation before applying
  console.log('\n[Test 3] Syntax pre-validation on JS files');
  const res3 = engine.validate({
    version: '1.0.0',
    files: [
      { path: 'js/test.js', content: 'function broken( { syntax error' }
    ]
  });
  assert.strictEqual(res3.ok, false);
  assert.ok(res3.errors.some(e => e.includes('syntax error')));
  console.log('✓ Pre-validated JS syntax and caught syntax error');

  // Test 4: Valid manifest validation & risk assessment
  console.log('\n[Test 4] Valid manifest analysis & risk scoring');
  const res4 = engine.validate({
    version: '5.9.1',
    description: 'Minor CSS and template update',
    author: 'Krishna',
    files: [
      { path: 'css/tailwind.css', content: '.new-class { color: cyan; }' },
      { path: 'js/domain-pages.js', content: 'console.log("updated");' }
    ]
  });
  assert.strictEqual(res4.ok, true);
  assert.strictEqual(res4.files.length, 2);
  assert.strictEqual(res4.stats.fileCount, 2);
  console.log(`✓ Valid manifest passed (Risk Level: ${res4.stats.riskLevel}, Files: ${res4.files.length})`);

  // Test 5: Apply live update and check active patches
  console.log('\n[Test 5] Live update execution & persistence');
  const applyRes = await engine.apply({
    version: '5.9.1',
    description: 'Test live patch',
    files: [
      { path: 'css/custom.css', content: 'body { margin: 0; }' }
    ]
  });
  assert.strictEqual(applyRes.ok, true);
  assert.strictEqual(applyRes.version, '5.9.1');
  const active = engine.getActivePatches();
  assert.ok(active.some(p => p.path === 'css/custom.css'));
  console.log('✓ Live update applied and registered in active patches');

  // Test 6: Rollback verification
  console.log('\n[Test 6] Rollback restoring pre-update state');
  assert.strictEqual(engine.hasPreUpdateBackup(), true);
  const rollbackRes = await engine.rollback();
  assert.strictEqual(rollbackRes.ok, true);
  console.log('✓ Rollback executed cleanly');

  console.log('\n======================================================');
  console.log('ALL UPDATE ENGINE TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

testUpdateEngine().catch(err => {
  console.error('✗ UPDATE ENGINE TEST FAILED:', err);
  process.exit(1);
});
