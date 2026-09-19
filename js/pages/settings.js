// Settings Page
Router.register('settings', () => {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="page-header"><div><div class="page-title">⚙️ Settings</div><div class="page-subtitle">Profile, preferences, AI behavior and permissions</div></div></div>
    <!-- Profile -->
    <div class="card" style="margin-bottom:20px;padding:20px">
      <div style="display:flex;align-items:center;gap:16px">
        <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--accent-violet),var(--accent-cyan));display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#fff;box-shadow:var(--glow-violet)">${DATA.user.initials}</div>
        <div>
          <div style="font-size:18px;font-weight:800">${DATA.user.name}</div>
          <div style="font-size:12px;color:var(--text-muted)">LifeOS User · ${DATA.user.timezone}</div>
          <div style="font-size:12px;color:var(--accent-cyan);margin-top:4px">Life Score: ${DATA.user.lifeScore}/100</div>
        </div>
        <button class="btn btn-secondary" style="margin-left:auto">Edit Profile</button>
      </div>
    </div>

    <div class="grid-2">
      <!-- TADASHI AI Settings -->
      <div>
        <div class="settings-section">
          <div class="settings-section-title">🧠 TADASHI AI</div>
          ${[
            {icon:'🔄', title:'Autonomy Mode', desc:'Current: Suggestion mode (TADASHI proposes, you approve)', action:'Change'},
            {icon:'💾', title:'Memory System', desc:'Short-term, episodic and preference memory active', action:'Manage'},
            {icon:'🔮', title:'Proactive Briefings', desc:'Morning briefing at 7 AM daily', action:'Configure'},
            {icon:'⚡', title:'Event Detection', desc:'TADASHI monitors for risks and opportunities', action:''},
          ].map(s=>`
            <div class="settings-item">
              <div class="settings-item-icon" style="background:rgba(0,212,255,0.1)">${s.icon}</div>
              <div class="settings-item-info"><div class="settings-item-title">${s.title}</div><div class="settings-item-desc">${s.desc}</div></div>
              ${s.action?`<button class="btn btn-secondary btn-sm">${s.action}</button>`:
              `<div class="toggle on" onclick="this.classList.toggle('on')"></div>`}
            </div>
          `).join('')}
        </div>

        <div class="settings-section">
          <div class="settings-section-title">🔔 Notifications</div>
          ${[
            {icon:'⏰', title:'Reminders', desc:'Task deadlines, bills, birthdays', toggle:true},
            {icon:'⚠️', title:'Risk Alerts', desc:'Conflicts, overload, approaching deadlines', toggle:true},
            {icon:'📋', title:'Daily Briefing', desc:'Morning summary at 7 AM', toggle:true},
            {icon:'🔄', title:'Replan Approvals', desc:'Notify when TADASHI proposes changes', toggle:true},
          ].map(s=>`
            <div class="settings-item">
              <div class="settings-item-icon" style="background:rgba(245,158,11,0.1)">${s.icon}</div>
              <div class="settings-item-info"><div class="settings-item-title">${s.title}</div><div class="settings-item-desc">${s.desc}</div></div>
              <div class="toggle on" onclick="this.classList.toggle('on')"></div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Privacy + Modules -->
      <div>
        <div class="settings-section">
          <div class="settings-section-title">🔒 Privacy & Security</div>
          ${[
            {icon:'🛡️', title:'TADASHI Data Access', desc:'Manage which modules TADASHI can read', action:'Manage'},
            {icon:'🗑️', title:'Clear Memory', desc:'Delete all TADASHI learned patterns and preferences', action:'Clear', danger:true},
            {icon:'📋', title:'Audit Log', desc:'View all AI actions and changes', action:'View'},
            {icon:'🔑', title:'Change Password', desc:'Update your account password', action:'Change'},
          ].map(s=>`
            <div class="settings-item" style="${s.danger?'border-color:rgba(239,68,68,0.2)':''}">
              <div class="settings-item-icon" style="background:rgba(${s.danger?'239,68,68':'124,58,237'},0.1)">${s.icon}</div>
              <div class="settings-item-info"><div class="settings-item-title" style="${s.danger?'color:var(--accent-red)':''}">${s.title}</div><div class="settings-item-desc">${s.desc}</div></div>
              <button class="btn ${s.danger?'btn-danger':'btn-secondary'} btn-sm">${s.action}</button>
            </div>
          `).join('')}
        </div>

        <div class="settings-section">
          <div class="settings-section-title">🎨 Appearance</div>
          <div class="settings-item">
            <div class="settings-item-icon" style="background:rgba(0,212,255,0.1)">🌙</div>
            <div class="settings-item-info"><div class="settings-item-title">Dark Mode</div><div class="settings-item-desc">Currently: Dark (Glassmorphism)</div></div>
            <div class="toggle on"></div>
          </div>
          <div class="settings-item">
            <div class="settings-item-icon" style="background:rgba(124,58,237,0.15)">🎨</div>
            <div class="settings-item-info"><div class="settings-item-title">Accent Color</div><div class="settings-item-desc">Cyan + Violet (default)</div></div>
            <div style="display:flex;gap:6px">
              ${['#00d4ff','#7c3aed','#10b981','#f59e0b','#ec4899'].map(c=>`<div style="width:20px;height:20px;border-radius:50%;background:${c};cursor:pointer;border:2px solid ${c==='#00d4ff'?'#fff':'transparent'}" onclick="document.documentElement.style.setProperty('--accent-cyan',this.style.background)"></div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- App info -->
    <div class="card" style="margin-top:4px;padding:16px;text-align:center">
      <div style="font-size:14px;font-weight:700;background:linear-gradient(135deg,var(--accent-cyan),var(--accent-violet-bright));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">TADASHI — LifeOS v1.0</div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Total AI for Dynamic Assistance, Scheduling and Human Intelligence</div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:2px">Built by Krishna Singh Chouhan · Academic Final Project 2026</div>
    </div>
  `;
  return el;
});
