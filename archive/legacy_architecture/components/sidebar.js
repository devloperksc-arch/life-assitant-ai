// ============================================================
// Sidebar Component
// ============================================================

function renderSidebar() {
  const navSections = [
    {
      label: 'INTELLIGENCE',
      items: [
        { page:'home', icon:'🏠', label:'Home', badge: null },
        { page:'tadashi', icon:'🧠', label:'TADASHI', badge: DATA.notifications.filter(n=>n.unread).length || null },
        { page:'analytics', icon:'📊', label:'Analytics', badge: null },
      ]
    },
    {
      label: 'PRODUCTIVITY',
      items: [
        { page:'calendar', icon:'📅', label:'Calendar', badge: null },
        { page:'tasks', icon:'✅', label:'Tasks', badge: DATA.tasks.filter(t=>t.status!=='done').length },
        { page:'goals', icon:'🎯', label:'Goals', badge: null },
        { page:'study', icon:'📚', label:'Study', badge: null },
      ]
    },
    {
      label: 'HEALTH',
      items: [
        { page:'fitness', icon:'💪', label:'Fitness', badge: null },
        { page:'nutrition', icon:'🥗', label:'Nutrition', badge: null },
        { page:'routines', icon:'🌅', label:'Routines', badge: null },
        { page:'wellbeing', icon:'🧘', label:'Wellbeing', badge: null },
      ]
    },
    {
      label: 'LIFE',
      items: [
        { page:'finance', icon:'💰', label:'Finance', badge: null },
        { page:'shopping', icon:'🛒', label:'Shopping', badge: null },
        { page:'relationships', icon:'👥', label:'Relationships', badge: null },
        { page:'home-module', icon:'🏡', label:'Home', badge: null },
        { page:'vehicle', icon:'🏍️', label:'Vehicle', badge: null },
        { page:'travel', icon:'✈️', label:'Travel', badge: null },
        { page:'digital-life', icon:'💻', label:'Digital Life', badge: null },
        { page:'entertainment', icon:'🎭', label:'Entertainment', badge: null },
      ]
    },
    {
      label: 'KNOWLEDGE',
      items: [
        { page:'documents', icon:'📁', label:'Documents', badge: null },
        { page:'knowledge', icon:'💡', label:'Knowledge', badge: null },
      ]
    },
    {
      label: 'SYSTEM',
      items: [
        { page:'settings', icon:'⚙️', label:'Settings', badge: null },
      ]
    }
  ];

  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">T</div>
      <div class="sidebar-logo-text">
        <span class="logo-title">TADASHI</span>
        <span class="logo-subtitle">LifeOS Intelligence</span>
      </div>
    </div>
    <div class="sidebar-nav" id="sidebar-nav">
      <div class="sidebar-tadashi-strip" onclick="document.getElementById('command-overlay').classList.add('open');document.getElementById('command-input').focus()">
        <span class="strip-icon">⚡</span>
        <div class="strip-text">
          <div class="strip-label">Ask TADASHI</div>
          <div class="strip-hint">Ctrl+K • natural language</div>
        </div>
      </div>
      ${navSections.map(section => `
        <div class="sidebar-section-label">${section.label}</div>
        ${section.items.map(item => `
          <div class="nav-item ${Router.getCurrent()===item.page?'active':''}" data-page="${item.page}" onclick="Router.navigate('${item.page}')">
            <span class="nav-icon">${item.icon}</span>
            <span class="nav-label">${item.label}</span>
            ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
          </div>
        `).join('')}
      `).join('')}
    </div>
    <div class="sidebar-footer">
      <div class="sidebar-avatar" onclick="Router.navigate('settings')">${DATA.user.initials}</div>
      <div class="sidebar-user-info">
        <div class="user-name">${DATA.user.name}</div>
        <div class="user-role">Life Score: ${DATA.user.lifeScore}/100</div>
      </div>
      <button class="sidebar-collapse-btn" id="sidebar-collapse-btn" onclick="toggleSidebar()" title="Collapse sidebar">◀</button>
    </div>
  `;
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed');
  const btn = document.getElementById('sidebar-collapse-btn');
  btn.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
}
