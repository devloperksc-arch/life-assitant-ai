// Goals Page
Router.register('goals', () => {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">🎯 Goals</div><div class="page-subtitle">Your life objectives and milestones</div></div>
      <button class="btn btn-primary btn-sm">+ New Goal</button>
    </div>
    <div class="grid-2">
      ${DATA.goals.map(g => `
        <div class="card goal-card glow-cyan">
          <div class="goal-header">
            <span class="goal-emoji">${g.emoji}</span>
            <div class="goal-info">
              <div class="goal-title">${g.title}</div>
              <div class="goal-due">Target: ${Utils.formatDate(g.target)} · ${g.category}</div>
            </div>
            <span class="badge badge-${Utils.statusColor(g.status)}">${g.status}</span>
          </div>
          <div class="goal-progress-label">
            <span style="font-size:12px;color:var(--text-muted)">Progress</span>
            <span style="font-size:12px;font-weight:700">${g.progress}%</span>
          </div>
          <div class="progress-track"><div class="progress-fill ${g.progress>70?'green':g.progress>40?'cyan':'red'}" style="width:${g.progress}%"></div></div>
          <div class="goal-milestones">
            ${g.milestones.map(m => `
              <div class="milestone-item">
                <div class="milestone-check ${m.done?'done':''}">${m.done?'✓':''}</div>
                <span style="${m.done?'text-decoration:line-through;color:var(--text-muted)':''}${!m.done?';color:var(--text-secondary)':''};font-size:12px">${m.title}</span>
              </div>
            `).join('')}
          </div>
          <div style="margin-top:12px;display:flex;gap:6px">
            <button class="btn btn-secondary btn-sm">View Details</button>
            <button class="btn btn-ghost btn-sm" onclick="processTADASHICommand('Help me with goal: ${g.title}')">Ask TADASHI</button>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Life Goals Overview -->
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-icon" style="background:rgba(124,58,237,0.15)">📊</div><div class="card-title">Goals Overview</div></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
          ${[
            {label:'Active Goals', val:DATA.goals.filter(g=>g.status==='active').length, color:'cyan'},
            {label:'On Hold', val:DATA.goals.filter(g=>g.status==='on-hold').length, color:'amber'},
            {label:'Avg Progress', val: Math.round(DATA.goals.reduce((s,g)=>s+g.progress,0)/DATA.goals.length)+'%', color:'green'},
            {label:'Completed', val:DATA.goals.filter(g=>g.status==='done').length, color:'violet'},
          ].map(s => `
            <div style="text-align:center">
              <div style="font-size:28px;font-weight:800;color:var(--accent-${s.color})">${s.val}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${s.label}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  return el;
});
