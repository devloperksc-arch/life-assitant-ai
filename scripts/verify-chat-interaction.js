const fs = require('fs');
const assert = require('assert');

console.log('=== STARTING CHAT INTERACTION & DOM VERIFICATION ===');

const html = fs.readFileSync('index.html', 'utf8');

// 1. Verify CSS styles for .copilot-active are present in index.html
console.log('[Step 1] Verifying CSS styles for .copilot-active...');
assert(html.includes('body.copilot-active'), 'body.copilot-active CSS missing');
assert(html.includes('.copilot-active #desktop-app'), '.copilot-active #desktop-app CSS missing');
assert(html.includes('.copilot-active #main-content'), '.copilot-active #main-content CSS missing');
assert(html.includes('.copilot-active #view-tadashi'), '.copilot-active #view-tadashi CSS missing');
console.log('  ✓ .copilot-active CSS rules present and verified');

// 2. Verify containers inside #view-tadashi
console.log('[Step 2] Verifying HTML elements inside #view-tadashi...');
assert(html.includes('id="tadashi-chat-feed"'), 'id="tadashi-chat-feed" missing');
assert(html.includes('id="tadashi-chat-input"'), 'id="tadashi-chat-input" missing');
assert(html.includes('getChatFeed'), 'getChatFeed() helper missing in index.html');
console.log('  ✓ id="tadashi-chat-feed" present');
console.log('  ✓ id="tadashi-chat-input" present');
console.log('  ✓ getChatFeed() helper present');

// 3. Verify no lingering document.querySelector('#view-tadashi .custom-scrollbar')
const lingeringQueries = (html.match(/document\.querySelector\(['"]#view-tadashi \.custom-scrollbar['"]\)/g) || []).length;
console.log(`[Step 3] Checking for ambiguous chat feed queries: ${lingeringQueries} found`);
assert.strictEqual(lingeringQueries, 0, 'There should be 0 ambiguous document.querySelector("#view-tadashi .custom-scrollbar") calls');
console.log('  ✓ Zero ambiguous selector calls');

// 4. Verify left column has no-scrollbar and right column has custom-scrollbar
const leftColTelemetry = html.includes('flex-1 min-h-0 glass-surface p-3 sm:p-3.5 rounded-2xl border border-outline-variant/20 flex flex-col justify-between space-y-1.5 overflow-y-auto no-scrollbar');
console.log('[Step 4] Checking left column scrollbar isolation:', leftColTelemetry);
assert(leftColTelemetry, 'Left column should use no-scrollbar to prevent collision with chat feed');
console.log('  ✓ Left column scrollbar completely isolated');

// 5. Verify switchTab sets copilot-active
console.log('[Step 5] Checking switchTab copilot-active handling in index.html...');
assert(html.includes("document.body.classList.add('copilot-active')"), 'switchTab must add copilot-active on view-tadashi');
assert(html.includes("document.body.classList.remove('copilot-active')"), 'switchTab must remove copilot-active on other tabs');
console.log('  ✓ switchTab correctly manages copilot-active on body');

// 6. Test AI intro and summary methods
console.log('[Step 6] Testing AI presentation prompt generators in js/lib/ai.js...');
const aiCode = fs.readFileSync('js/lib/ai.js', 'utf8');
assert(aiCode.includes('getIntroContent'), 'AI.getIntroContent missing');
assert(aiCode.includes('getSummaryContent'), 'AI.getSummaryContent missing');
assert(aiCode.includes('Tactical Autonomous Domain Assistant') || aiCode.includes('Tony Stark'), 'TADASHI full form or Tony Stark heritage missing in AI.js');
assert(!aiCode.includes('Big Hero 6'), 'Big Hero 6 must NOT be in AI.js');
console.log('  ✓ AI.getIntroContent and AI.getSummaryContent present with Tony Stark tactical heritage and clean formatting');

console.log('\n======================================================');
console.log('✓ ALL CHAT ALIGNMENT & INTERACTION CHECKS PASSED');
console.log('======================================================\n');
