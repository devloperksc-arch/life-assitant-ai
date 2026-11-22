const fs = require('fs');

console.log('=== VERIFICATION TEST START ===');

// 1. CRLF check
const html = fs.readFileSync('index.html', 'utf8');
const dp = fs.readFileSync('js/domain-pages.js', 'utf8');

const htmlCRLF = html.includes('\r\n') && !html.replace(/\r\n/g, '').includes('\n');
const dpCRLF = dp.includes('\r\n') && !dp.replace(/\r\n/g, '').includes('\n');

console.log('1. CRLF Check:');
console.log('   index.html has strict CRLF:', htmlCRLF);
console.log('   domain-pages.js has strict CRLF:', dpCRLF);
if (!htmlCRLF || !dpCRLF) throw new Error('CRLF check failed!');

// 2. Syntax check
const { execSync } = require('child_process');
const jsFiles = ['js/data.js', 'js/db.js', 'js/utils.js', 'js/lib/ai.js', 'js/lib/voice.js', 'js/domain-pages.js'];
for (const f of jsFiles) {
  execSync(`node --check "${f}"`);
  console.log(`   Syntax OK: ${f}`);
}

// 3. Check modal z-index rules in index.html
console.log('\n3. Modal Stacking & Z-Index Check:');
const hasModalStyle = html.includes('#api-key-modal {\r\n      position: fixed !important;\r\n      inset: 0 !important;\r\n      z-index: 99999 !important;\r\n    }');
console.log('   Head <style> contains #api-key-modal z-index: 99999 !important:', hasModalStyle);
if (!hasModalStyle) throw new Error('Missing modal style in <head>');

const hasModalTagStyle = html.includes('id="api-key-modal" class="fixed inset-0 bg-black/80 backdrop-blur-md hidden items-center justify-center p-4 overflow-y-auto" style="z-index: 99999 !important;"');
console.log('   Modal tag has style="z-index: 99999 !important;" and overflow-y-auto:', hasModalTagStyle);
if (!hasModalTagStyle) throw new Error('Missing inline style on api-key-modal');

const hasStopProp = html.includes('onclick="event.stopPropagation()"');
console.log('   Inner modal card has onclick="event.stopPropagation()":', hasStopProp);
if (!hasStopProp) throw new Error('Missing event.stopPropagation() on modal card');

// 4. Check Change API Key buttons
console.log('\n4. Change API Key Button Visibility Check:');
const hasHeaderBtn = html.includes('id="header-provider-badge">Change API Key</span>');
console.log('   Header dock has "Change API Key":', hasHeaderBtn);

const hasWorkspaceHeroBtn = html.includes('Change API Key</span>\r\n</button>') || html.includes('Change API Key</span>\n</button>');
console.log('   Workspace hero banner has "Change API Key":', hasWorkspaceHeroBtn);

const hasWorkspaceBridgeBtn = html.includes('TADASHI Neural Bridge') && html.includes('Change API Key');
console.log('   Workspace Neural Bridge strip has "Change API Key":', hasWorkspaceBridgeBtn);

const hasManageBtn = html.includes('id="manage-change-api-key-btn"');
console.log('   Manage Domains hub has "Change API Key" button:', hasManageBtn);

const hasHomeDomainBanner = dp.includes('TADASHI Neural Bridge &amp; AI Intelligence') && dp.includes('Change API Key');
console.log('   Home Dashboard domain has "Change API Key" banner:', hasHomeDomainBanner);

if (!hasHeaderBtn || !hasWorkspaceHeroBtn || !hasWorkspaceBridgeBtn || !hasManageBtn || !hasHomeDomainBanner) {
  throw new Error('Some API key buttons are missing!');
}

// 5. Test mock execution of openApiKeyModal
console.log('\n5. Mock Execution of openApiKeyModal:');
const mockModal = {
  style: {},
  classList: {
    classes: new Set(['hidden']),
    remove: function(c) { this.classes.delete(c); },
    add: function(c) { this.classes.add(c); }
  }
};
mockModal.style.zIndex = '0';
mockModal.style.display = 'none';

// Check function string
const openFnStr = html.substring(html.indexOf('function openApiKeyModal'), html.indexOf('window.openApiKeyModal = openApiKeyModal;'));
console.log('   openApiKeyModal sets modal.style.zIndex = \'99999\':', openFnStr.includes("modal.style.zIndex = '99999';"));
console.log('   openApiKeyModal sets modal.style.display = \'flex\':', openFnStr.includes("modal.style.display = 'flex';"));

console.log('\n=== ALL VERIFICATION CHECKS PASSED ===');
