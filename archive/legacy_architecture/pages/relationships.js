// Relationships page (standalone)
Router.register('relationships', () => {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">👥 Relationships</div><div class="page-subtitle">Contacts, important dates and interaction history</div></div>
      <button class="btn btn-primary btn-sm">+ Add Contact</button>
    </div>
    <div class="card" style="margin-bottom:20px;background:linear-gradient(135deg,rgba(236,72,153,0.08),rgba(124,58,237,0.08));border-color:rgba(236,72,153,0.2);padding:14px 18px">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:24px">🎂</span>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700">Mom's Birthday is TODAY!</div>
          <div style="font-size:12px;color:var(--text-muted)">Reminder set for 8 PM. Don't forget to call!</div>
        </div>
        <button class="btn btn-primary btn-sm">📞 Call Now</button>
      </div>
    </div>
    <div class="grid-auto">
      ${DATA.relationships.map(r => `
        <div class="card" style="padding:16px;cursor:pointer">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--accent-violet),var(--accent-cyan));display:flex;align-items:center;justify-content:center;font-size:20px">${r.emoji}</div>
            <div>
              <div style="font-size:14px;font-weight:700">${r.name}</div>
              <div style="font-size:11px;color:var(--text-muted)">${r.category}</div>
            </div>
            <span class="badge badge-${r.category==='Family'?'pink':r.category==='Friend'?'cyan':'amber'}" style="margin-left:auto">${r.category}</span>
          </div>
          ${r.birthday?`<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">🎂 ${Utils.formatDate(r.birthday)}</div>`:''}
          ${r.notes?`<div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px">${r.notes}</div>`:''}
          <div style="font-size:10px;color:var(--text-muted)">Last contact: ${Utils.formatDateShort(r.lastContact)}</div>
          <div style="display:flex;gap:6px;margin-top:10px">
            <button class="btn btn-secondary btn-sm" style="flex:1">Add Note</button>
            <button class="btn btn-ghost btn-sm">Follow Up</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  return el;
});
