// Digital Life Page
Router.register('digital-life', () => {
  const el = document.createElement('div');
  const dl = DATA.digitalLife;
  const monthlyTotal = dl.subscriptions.filter(s=>s.period==='mo'&&s.amount>0).reduce((a,b)=>a+b.amount,0);
  el.innerHTML = `
    <div class="page-header"><div><div class="page-title">💻 Digital Life</div><div class="page-subtitle">Subscriptions, accounts, renewals</div></div><button class="btn btn-primary btn-sm">+ Add Subscription</button></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
      ${[
        {label:'Monthly Cost', val:'₹'+monthlyTotal+'/mo', color:'red'},
        {label:'Active Subs', val:dl.subscriptions.filter(s=>s.status==='active').length, color:'cyan'},
        {label:'Free Plans', val:dl.subscriptions.filter(s=>s.status!=='active').length, color:'green'},
      ].map(s=>`<div class="card"><div class="stat-widget" style="padding:14px"><div class="stat-value" style="font-size:22px;color:var(--accent-${s.color})">${s.val}</div><div class="stat-label">${s.label}</div></div></div>`).join('')}
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">All Subscriptions</div></div>
      <div>
        ${dl.subscriptions.map(s=>`
          <div class="sub-item">
            <div class="sub-logo" style="background:${s.color}20">${s.icon}</div>
            <div class="sub-info">
              <div class="sub-name">${s.name}</div>
              <div class="sub-renewal">${s.renewal?'Renews '+Utils.formatDateShort(s.renewal):'No renewal'}</div>
            </div>
            <div class="sub-amount">
              <div class="sub-price">${s.amount?'₹'+s.amount:'Free'}</div>
              <div class="sub-period">/${s.period}</div>
            </div>
            <span class="badge badge-${s.status==='active'?'cyan':s.status==='free'?'green':'amber'}">${s.status}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  return el;
});

// Entertainment Page
Router.register('entertainment', () => {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="page-header"><div><div class="page-title">🎭 Entertainment</div><div class="page-subtitle">Movies, shows, books, games and hobbies</div></div><button class="btn btn-primary btn-sm">+ Add</button></div>
    <div class="grid-auto">
      ${DATA.entertainment.map(e=>`
        <div class="card media-card">
          <div class="media-thumb" style="background:${{'Movie':'rgba(239,68,68,0.08)','Show':'rgba(124,58,237,0.08)','Book':'rgba(0,212,255,0.08)','Game':'rgba(16,185,129,0.08)'}[e.type]||'var(--bg-elevated)'}">${e.emoji}</div>
          <div class="media-body">
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:4px">${e.type} · ${e.genre}</div>
            <div class="media-title">${e.title}</div>
            <div class="media-status">
              <span class="badge badge-${Utils.statusColor(e.status)}">${e.status}</span>
              ${e.progress?`<div class="progress-track" style="flex:1;height:3px"><div class="progress-fill cyan" style="width:${e.progress}%"></div></div><span style="font-size:10px;color:var(--text-muted)">${e.progress}%</span>`:''}
              ${e.rating?`<span style="font-size:12px">${'⭐'.repeat(e.rating)}</span>`:''}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  return el;
});
