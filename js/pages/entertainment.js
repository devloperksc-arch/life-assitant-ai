// Entertainment Page (standalone)
Router.register('entertainment', () => {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="page-header"><div><div class="page-title">🎭 Entertainment</div><div class="page-subtitle">Movies, shows, books, games and hobbies</div></div><button class="btn btn-primary btn-sm">+ Add</button></div>
    <div class="grid-auto">
      ${DATA.entertainment.map(e=>`
        <div class="card media-card">
          <div class="media-thumb" style="background:${{Movie:'rgba(239,68,68,0.08)',Show:'rgba(124,58,237,0.08)',Book:'rgba(0,212,255,0.08)',Game:'rgba(16,185,129,0.08)'}[e.type]||'var(--bg-elevated)'}">${e.emoji}</div>
          <div class="media-body">
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:4px">${e.type} · ${e.genre}</div>
            <div class="media-title">${e.title}</div>
            <div class="media-status">
              <span class="badge badge-${Utils.statusColor(e.status)}">${e.status}</span>
              ${e.progress?`<div class="progress-track" style="flex:1;height:3px"><div class="progress-fill cyan" style="width:${e.progress}%"></div></div>`:''}
              ${e.rating?`<span style="font-size:11px">${'⭐'.repeat(Math.min(e.rating,5))}</span>`:''}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  return el;
});
