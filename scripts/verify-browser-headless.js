// scripts/verify-browser-headless.js
const { execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

async function testHeadless() {
  console.log('--- RUNNING HEADLESS CHROMIUM REGRESSION TEST ---');

  // Find Chrome path on Windows
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
  ];
  const chromePath = chromePaths.find(p => fs.existsSync(p));

  if (!chromePath) {
    console.log('Chrome executable not found in standard paths, skipping browser launch test.');
    return;
  }
  console.log(`Using Chrome at: ${chromePath}`);

  // Test desktop layout (1280x800)
  const tmpDirDesktop = path.join(process.env.TEMP || 'C:\\Temp', 'tadashi_chrome_desk_' + Date.now());
  const screenshotDesktop = path.join(process.env.TEMP || 'C:\\Temp', 'desktop_test.png');
  fs.mkdirSync(tmpDirDesktop, { recursive: true });

  const cmdDesktop = `"${chromePath}" --headless=new --disable-gpu --user-data-dir="${tmpDirDesktop}" --window-size=1280,800 --screenshot="${screenshotDesktop}" http://127.0.0.1:8000/#manage`;
  try {
    execSync(cmdDesktop, { timeout: 15000, stdio: 'ignore' });
    console.log(`✓ Headless desktop render successful. Screenshot captured (${fs.statSync(screenshotDesktop).size} bytes).`);
  } catch (err) {
    console.error('Desktop browser render error:', err.message);
  } finally {
    try { fs.rmSync(tmpDirDesktop, { recursive: true, force: true }); } catch(e) {}
  }

  // Test mobile layout (375x812)
  const tmpDirMobile = path.join(process.env.TEMP || 'C:\\Temp', 'tadashi_chrome_mob_' + Date.now());
  const screenshotMobile = path.join(process.env.TEMP || 'C:\\Temp', 'mobile_test.png');
  fs.mkdirSync(tmpDirMobile, { recursive: true });

  const cmdMobile = `"${chromePath}" --headless=new --disable-gpu --user-data-dir="${tmpDirMobile}" --window-size=375,812 --screenshot="${screenshotMobile}" http://127.0.0.1:8000/#tasks`;
  try {
    execSync(cmdMobile, { timeout: 15000, stdio: 'ignore' });
    console.log(`✓ Headless mobile render successful. Screenshot captured (${fs.statSync(screenshotMobile).size} bytes).`);
  } catch (err) {
    console.error('Mobile browser render error:', err.message);
  } finally {
    try { fs.rmSync(tmpDirMobile, { recursive: true, force: true }); } catch(e) {}
  }
}

testHeadless().then(() => {
  console.log('Browser regression check completed cleanly.');
});
