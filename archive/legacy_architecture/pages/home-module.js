// Home Module Page (standalone)
Router.register('home-module', () => {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">🏡 Home Management</div><div class="page-subtitle">Chores, inventory, utilities and maintenance</div></div>
      <button class="btn btn-primary btn-sm">+ Add Task</button>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-icon" style="background:rgba(16,185,129,0.1)">🧹</div><div class="card-title">Chores</div></div>
        <div class="card-body">
          ${DATA.homeModule.chores.map(c => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-subtle)">
              <div class="status-dot ${c.status==='ok'?'green':c.status==='due'?'amber':'red'}"></div>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:500">${c.task}</div>
                <div style="font-size:10px;color:var(--text-muted)">${c.frequency} · Last: ${Utils.formatDateShort(c.lastDone)}</div>
              </div>
              <span class="badge badge-${c.status==='ok'?'green':c.status==='due'?'amber':'red'}">${c.status}</span>
              <button class="btn btn-success btn-sm">Done</button>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-icon" style="background:rgba(245,158,11,0.15)">💡</div><div class="card-title">Utilities & Bills</div></div>
        <div class="card-body">
          ${DATA.homeModule.utilities.map(u => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-subtle)">
              <div style="flex:1"><div style="font-size:13px;font-weight:500">${u.name}</div><div style="font-size:11px;color:var(--text-muted)">Due: ${u.due}</div></div>
              <div style="font-size:14px;font-weight:700">${u.amount}</div>
              <span class="badge badge-cyan">${u.status}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  return el;
});
