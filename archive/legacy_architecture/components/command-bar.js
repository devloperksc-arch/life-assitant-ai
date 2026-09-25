// ============================================================
// Command Bar Component
// ============================================================

function renderCommandBar() {
  const overlay = document.getElementById('command-overlay');
  overlay.innerHTML = `
    <div id="command-bar">
      <div class="command-input-wrapper">
        <span class="command-input-icon">⚡</span>
        <input type="text" id="command-input" placeholder="Ask TADASHI anything... Plan tomorrow. Fix my week. Log a meal. Show my risks." autocomplete="off" />
        <kbd style="font-size:10px;color:var(--text-muted);background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:4px;padding:2px 6px;font-family:var(--font-mono)">ESC</kbd>
      </div>
      <div class="command-hints">
        <div class="command-hint-title">Quick Commands</div>
        <div class="command-hint-grid">
          ${['Plan tomorrow','Fix my week','What should I do now?','Show my risks','I skipped gym today','Adjust my budget','Study plan for OS exam','What if I start gym at 6 AM?','Show commitment debt','Morning briefing'].map(cmd =>
            `<div class="command-chip" onclick="runCommand('${cmd}')">${cmd}</div>`
          ).join('')}
        </div>
      </div>
    </div>
  `;

  overlay.onclick = (e) => { if(e.target === overlay) overlay.classList.remove('open'); };

  const input = document.getElementById('command-input');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') overlay.classList.remove('open');
    if (e.key === 'Enter' && input.value.trim()) {
      runCommand(input.value.trim());
    }
  });
}

function runCommand(cmd) {
  const overlay = document.getElementById('command-overlay');
  overlay.classList.remove('open');
  Router.navigate('tadashi');
  setTimeout(() => { processTADASHICommand(cmd); }, 200);
}

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const overlay = document.getElementById('command-overlay');
    overlay.classList.toggle('open');
    if (overlay.classList.contains('open')) {
      setTimeout(() => document.getElementById('command-input')?.focus(), 50);
    }
  }
});
