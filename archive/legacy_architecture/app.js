// ============================================================
// TADASHI — Main App Bootstrap
// ============================================================

(function() {
  function init() {
    const root = document.getElementById('app-root');
    if (!root) return;

    // Build app shell
    root.innerHTML = `
      <div id="sidebar"></div>
      <div id="main-area">
        <div id="topbar"></div>
        <div style="display:flex;flex:1;overflow:hidden">
          <div id="page-content" style="flex:1;overflow-y:auto;overflow-x:hidden;padding:24px"></div>
          <div id="context-drawer"></div>
        </div>
      </div>
      <!-- Command overlay -->
      <div id="command-overlay"></div>
      <!-- Universal FAB -->
      <button id="universal-fab" title="Quick action (create, schedule, ask)" onclick="document.getElementById('command-overlay').classList.add('open');setTimeout(()=>document.getElementById('command-input')?.focus(),50)">+</button>
      <!-- TADASHI status -->
      <div class="tadashi-status">
        <div class="status-dot green"></div>
        <span>TADASHI active</span>
      </div>
    `;

    // Initialize components
    renderSidebar();
    renderTopbar();
    renderCommandBar();

    // Navigate to home
    Router.navigate('home');

    // Update time every minute
    setInterval(() => {
      const dateEl = document.querySelector('.topbar-date');
      if (dateEl) dateEl.textContent = Utils.dateNow();
    }, 60000);

    // Close notification panel on outside click
    document.addEventListener('click', (e) => {
      const panel = document.getElementById('notif-panel');
      const btn = document.getElementById('notif-btn');
      if (panel && !panel.contains(e.target) && !btn?.contains(e.target)) {
        panel.style.display = 'none';
        notifOpen = false;
      }
    });

    console.log('%c🧠 TADASHI — LifeOS Initialized', 'color:#00d4ff;font-size:14px;font-weight:bold');
    console.log('%cTotal AI for Dynamic Assistance, Scheduling and Human Intelligence', 'color:#7c3aed;font-size:11px');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
