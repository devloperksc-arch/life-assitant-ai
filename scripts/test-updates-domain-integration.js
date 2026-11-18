const fs = require('fs');
const js = fs.readFileSync('js/domain-pages.js', 'utf8');
const idx = js.indexOf('case \'settings\':');
console.log(js.slice(idx, idx + 200));
