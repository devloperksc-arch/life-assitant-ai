// ============================================================
// Context Drawer Component
// ============================================================

let drawerOpen = false;

function renderContextDrawer() {
  const drawer = document.getElementById('context-drawer');
  drawer.innerHTML = `
    <div class="drawer-inner">
      <div class="drawer-header">
        <span class="drawer-title">Context</span>
        <button class="drawer-close-btn" onclick="toggleDrawer()">✕</button>
      </div>

      <!-- Life State -->
      <div style="margin-bottom:16px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:8px">LIFE STATE</div>
        <div class="card" style="padding:12px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <div style="font-size:20px;font-weight:800;line-height:1">${Utils.timeNow()}</div>
            <div style="flex:1">
              <div style="font-size:11px;font-weight:600;color:var(--accent-cyan)">${DATA.lifeState.schedule}</div>
              <div style="font-size:10px;color:var(--text-muted)">${DATA.lifeState.availability}</div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${[
              ['📚', 'Study', DATA.lifeState.studyLoad],
              ['💪', 'Fitness', DATA.lifeState.fitnessState],
              ['💰', 'Finance', DATA.lifeState.financialState],
            ].map(([icon,label,val]) => `
              <div style="display:flex;align-items:center;gap:6px;font-size:11px">
                <span>${icon}</span>
                <span style="color:var(--text-muted)">${label}:</span>
                <span style="color:var(--text-secondary);flex:1">${val}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Active Risks -->
      <div style="margin-bottom:16px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:8px">ACTIVE RISKS</div>
        <div class="risk-alert">
          <span class="risk-alert-icon">⚠️</span>
          <div class="risk-alert-body">
            <div class="risk-alert-title">OS Exam in 6 days</div>
            <div class="risk-alert-desc">42% syllabus gap detected</div>
          </div>
        </div>
        <div class="risk-alert">
          <span class="risk-alert-icon">⚠️</span>
          <div class="risk-alert-body">
            <div class="risk-alert-title">Assignment due Sep 22</div>
            <div class="risk-alert-desc">3 days left, ~4hrs needed</div>
          </div>
        </div>
        <div class="risk-alert critical">
          <span class="risk-alert-icon">🔴</span>
          <div class="risk-alert-body">
            <div class="risk-alert-title">Bathroom cleaning overdue</div>
            <div class="risk-alert-desc">6 days past schedule</div>
          </div>
        </div>
      </div>

      <!-- Pending Approvals -->
      <div style="margin-bottom:16px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:8px">PENDING APPROVALS</div>
        <div class="action-card" style="padding:12px">
          <div style="font-size:12px;font-weight:700;color:var(--accent-cyan);margin-bottom:6px">📅 Week Replan</div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">TADASHI proposes 8 schedule changes for exam prep</div>
          <div style="display:flex;gap:6px">
            <button class="action-approve" style="padding:4px 10px;font-size:10px" onclick="Router.navigate('tadashi')">Review</button>
            <button class="action-reject" style="padding:4px 10px;font-size:10px">Dismiss</button>
          </div>
        </div>
      </div>

      <!-- Quick Links -->
      <div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:8px">QUICK ACCESS</div>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${[
            ['📅', 'Today\'s Calendar', 'calendar'],
            ['✅', 'Priority Tasks', 'tasks'],
            ['📚', 'Study Plan', 'study'],
            ['💰', 'Budget Status', 'finance'],
          ].map(([icon, label, page]) => `
            <div onclick="Router.navigate('${page}');toggleDrawer()" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:var(--radius-sm);cursor:pointer;transition:background 0.15s;font-size:12px;color:var(--text-secondary)" onmouseover="this.style.background='var(--bg-glass-light)'" onmouseout="this.style.background='transparent'">
              <span>${icon}</span><span>${label}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function toggleDrawer() {
  drawerOpen = !drawerOpen;
  const drawer = document.getElementById('context-drawer');
  drawer.classList.toggle('open', drawerOpen);
  if (drawerOpen) renderContextDrawer();
}
