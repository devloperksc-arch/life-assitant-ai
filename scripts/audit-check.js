const fs = require('fs');

const indexHtml = fs.readFileSync('index.html', 'utf8');
console.log('Total characters in index.html:', indexHtml.length);

const ids = [
  'desktop-app', 'mobile-app', 'main-content', 'view-workspace',
  'view-tadashi', 'view-manage', 'view-briefings', 'view-schedule',
  'view-domain-page', 'api-key-modal'
];

ids.forEach(id => {
  const count = (indexHtml.match(new RegExp('id=["\']' + id + '["\']', 'g')) || []).length;
  console.log(`ID ${id}: ${count}`);
});

const scripts = (indexHtml.match(/<script[\s>]/gi) || []).length;
const endScripts = (indexHtml.match(/<\/script>/gi) || []).length;
console.log(`Script tags: ${scripts} open, ${endScripts} close`);

// Check CRLF on index.html and domain-pages.js
console.log('index.html CRLF:', indexHtml.includes('\r\n'));
const domainPages = fs.readFileSync('js/domain-pages.js', 'utf8');
console.log('domain-pages.js CRLF:', domainPages.includes('\r\n'));

// Extract all inline script blocks in index.html and check for syntax errors
const scriptBlocks = [];
const scriptRegex = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
let match;
while ((match = scriptRegex.exec(indexHtml)) !== null) {
  scriptBlocks.push(match[1]);
}
console.log(`Found ${scriptBlocks.length} inline script blocks.`);

scriptBlocks.forEach((code, idx) => {
  try {
    new Function(code);
    console.log(`Inline script #${idx + 1}: Syntax OK (${code.length} chars)`);
  } catch (err) {
    console.error(`Inline script #${idx + 1} SYNTAX ERROR:`, err.message);
  }
});
