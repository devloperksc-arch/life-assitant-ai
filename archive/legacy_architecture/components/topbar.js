// ============================================================
// Topbar Component
// ============================================================

function renderTopbar() {
  const topbar = document.getElementById('topbar');
  const unread = DATA.notifications.filter(n => n.unread).length;
  topbar.innerHTML = `
    <span id="topbar-page-title" class="topbar-title">Home</span>
    <div class="topbar-search" onclick="document.getElementById('command-overlay').classList.add('open');document.getElementById('command-input').focus()">
      <span>🔍</span>
      <span>Search or ask TADASHI...</span>
      <kbd>Ctrl+K</kbd>
    </div>
    <div class="topbar-actions">
      <div class="topbar-life-score">
        <span class="score-label">Life Score</span>
        <span class="score-value">${DATA.user.lifeScore}</span>
      </div>
      <span class="topbar-date">${Utils.dateNow()}</span>
      <button class="topbar-btn" id="notif-btn" onclick="toggleNotifPanel()" title="Notifications">
        🔔
        ${unread ? `<span class="badge">${unread}</span>` : ''}
      </button>
      <button class="topbar-btn" onclick="toggleDrawer()" title="Context drawer">◨</button>
    </div>
  `;
}

// Notification panel
let notifOpen = false;
function toggleNotifPanel() {
  notifOpen = !notifOpen;
  let panel = document.getElementById('notif-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'notif-panel';
    panel.className = 'notif-panel';
    panel.innerHTML = `
      <div class="notif-panel-header">
        <span class="notif-panel-title">Notifications</span>
        <span class="notif-panel-clear" onclick="clearNotifs()">Mark all read</span>
      </div>
      <div class="notif-panel-body">
        ${DATA.notifications.map(n => `
          <div class="notif-item ${n.unread?'unread':''}">
            <div class="notif-item-icon" style="background:${n.iconBg}">${n.icon}</div>
            <div class="notif-item-body">
              <div class="notif-item-title">${n.title}</div>
              <div class="notif-item-desc">${n.desc}</div>
              <div class="notif-item-time">${n.time}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    document.getElementById('main-area').style.position = 'relative';
    document.getElementById('main-area').appendChild(panel);
  }
  panel.style.display = notifOpen ? 'block' : 'none';
}

function clearNotifs() {
  DATA.notifications.forEach(n => n.unread = false);
  renderTopbar();
  const panel = document.getElementById('notif-panel');
  if (panel) panel.remove();
  notifOpen = false;
}
