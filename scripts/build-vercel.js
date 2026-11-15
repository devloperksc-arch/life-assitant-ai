// scripts/build-vercel.js
// Assembles the production-ready dist/ bundle for Vercel deployment

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('--- STARTING TADASHI VERCEL PRODUCTION BUILD ---');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

// 1. Determine Build ID (Git commit SHA or timestamp)
let buildId = 'release';
try {
  buildId = execSync('git rev-parse --short HEAD', { cwd: ROOT_DIR, encoding: 'utf8' }).trim();
} catch (e) {
  buildId = 'b' + Date.now().toString(36);
}
console.log(`[1] Build Identifier: ${buildId}`);

// 2. Clean and create dist directory
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DIST_DIR, { recursive: true });
console.log('[2] Prepared clean dist/ directory');

// 3. Ensure static css/tailwind.css exists
const cssPath = path.join(ROOT_DIR, 'css', 'tailwind.css');
if (!fs.existsSync(cssPath)) {
  console.log('[3] Compiling Tailwind CSS...');
  execSync('npx tailwindcss -i src/input.css -o css/tailwind.css --minify', { cwd: ROOT_DIR, stdio: 'inherit' });
} else {
  console.log('[3] Verified static css/tailwind.css present');
}

// Helper to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 4. Copy runtime asset directories
console.log('[4] Copying css/, js/, assets/ directories...');
copyDir(path.join(ROOT_DIR, 'css'), path.join(DIST_DIR, 'css'));
copyDir(path.join(ROOT_DIR, 'js'), path.join(DIST_DIR, 'js'));
copyDir(path.join(ROOT_DIR, 'assets'), path.join(DIST_DIR, 'assets'));

// 5. Stamp and copy index.html
console.log('[5] Stamping index.html...');
let indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
indexHtml = indexHtml.replace(/__BUILD_ID__/g, buildId);
fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexHtml, 'utf8');

// 6. Stamp and copy sw.js
console.log('[6] Stamping sw.js...');
let swJs = fs.readFileSync(path.join(ROOT_DIR, 'sw.js'), 'utf8');
swJs = swJs.replace(/__BUILD_ID__/g, buildId);
fs.writeFileSync(path.join(DIST_DIR, 'sw.js'), swJs, 'utf8');

// 7. Copy metadata files
console.log('[7] Copying manifest.json, favicons...');
const singleFiles = ['manifest.json', 'favicon.svg', 'favicon.png'];
for (const file of singleFiles) {
  const filePath = path.join(ROOT_DIR, file);
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, path.join(DIST_DIR, file));
  }
}

// 8. Verify dist output
const requiredDistFiles = [
  'index.html',
  'sw.js',
  'manifest.json',
  'css/tailwind.css',
  'js/data.js',
  'js/db.js',
  'js/utils.js',
  'js/lib/ai.js',
  'js/domain-pages.js'
];

let missing = 0;
for (const req of requiredDistFiles) {
  if (!fs.existsSync(path.join(DIST_DIR, req))) {
    console.error(`  ✗ Missing expected file in dist/: ${req}`);
    missing++;
  }
}

if (missing === 0) {
  console.log('\n======================================================');
  console.log(`✓ TADASHI LIFEOS VERCEL BUILD COMPLETED SUCCESSFULLY (Build: ${buildId})`);
  console.log('  Output directory: dist/');
  console.log('======================================================');
} else {
  console.error(`\n✗ Build failed with ${missing} missing files.`);
  process.exit(1);
}
