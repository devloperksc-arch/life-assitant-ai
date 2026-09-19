// Shopping Page
Router.register('shopping', () => {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">🛒 Shopping</div><div class="page-subtitle">Lists, wishlists and purchases</div></div>
      <button class="btn btn-primary btn-sm">+ Add Item</button>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-icon" style="background:rgba(16,185,129,0.1)">🥦</div><div class="card-title">Grocery List</div><span class="badge badge-amber" style="margin-left:auto">${DATA.shopping.groceries.filter(g=>g.status==='pending').length} pending</span></div>
        <div class="card-body">
          ${DATA.shopping.groceries.map((g,i) => `
            <div class="routine-item">
              <div class="routine-check ${g.status==='done'?'checked':''}" onclick="DATA.shopping.groceries[${i}].status=DATA.shopping.groceries[${i}].status==='done'?'pending':'done';Router.navigate('shopping')">
                ${g.status==='done'?'✓':''}
              </div>
              <span class="routine-label">${g.item}</span>
              <span class="routine-time">${g.qty}</span>
            </div>
          `).join('')}
          <button class="btn btn-secondary" style="width:100%;margin-top:12px">+ Add grocery item</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-icon" style="background:rgba(124,58,237,0.15)">⭐</div><div class="card-title">Wishlist</div></div>
        <div class="card-body">
          ${DATA.shopping.wishlist.map(w => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-subtle)">
              <div style="flex:1">
                <div style="font-size:13px;font-weight:500">${w.item}</div>
                <div style="font-size:11px;color:var(--text-muted)">Target: ${w.date}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:13px;font-weight:700">${w.price}</div>
                <span class="badge badge-${Utils.priorityColor(w.priority)}">${w.priority}</span>
              </div>
            </div>
          `).join('')}
          <button class="btn btn-secondary" style="width:100%;margin-top:12px">+ Add to wishlist</button>
        </div>
      </div>
    </div>
  `;
  return el;
});

// Relationships Page
Router.register('relationships', () => {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">👥 Relationships</div><div class="page-subtitle">Contacts, important dates and interactions</div></div>
      <button class="btn btn-primary btn-sm">+ Add Contact</button>
    </div>
    <!-- Today's alert -->
    <div class="card" style="margin-bottom:20px;background:linear-gradient(135deg,rgba(236,72,153,0.08),rgba(124,58,237,0.08));border-color:rgba(236,72,153,0.2);padding:14px 18px">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:20px">🎂</span>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700">Mom's Birthday is TODAY!</div>
          <div style="font-size:12px;color:var(--text-muted)">Don't forget to call. Scheduled reminder at 8 PM.</div>
        </div>
        <button class="btn btn-primary btn-sm">Call Now 📞</button>
      </div>
    </div>
    <div class="grid-auto">
      ${DATA.relationships.map(r => `
        <div class="card" style="padding:16px;cursor:pointer" onclick="">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--accent-violet),var(--accent-cyan));display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:var(--glow-violet)">${r.emoji}</div>
            <div>
              <div style="font-size:14px;font-weight:700">${r.name}</div>
              <div style="font-size:11px;color:var(--text-muted)">${r.category}</div>
            </div>
            <span class="badge badge-${r.category==='Family'?'pink':r.category==='Friend'?'cyan':r.category==='Mentor'?'amber':'violet'}" style="margin-left:auto">${r.category}</span>
          </div>
          ${r.birthday ? `<div style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:6px"><span>🎂</span><span>${Utils.formatDate(r.birthday)}</span></div>` : ''}
          ${r.notes ? `<div style="font-size:11px;color:var(--text-secondary);margin-top:6px">${r.notes}</div>` : ''}
          <div style="font-size:10px;color:var(--text-muted);margin-top:8px">Last contact: ${Utils.formatDateShort(r.lastContact)}</div>
          <div style="display:flex;gap:6px;margin-top:10px">
            <button class="btn btn-secondary btn-sm" style="flex:1">Note</button>
            <button class="btn btn-ghost btn-sm" style="flex:1">Follow up</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  return el;
});

// Home Module Page
Router.register('home-module', () => {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">🏡 Home Management</div><div class="page-subtitle">Chores, utilities and maintenance</div></div>
      <button class="btn btn-primary btn-sm">+ Add Chore</button>
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
              <div style="flex:1">
                <div style="font-size:13px;font-weight:500">${u.name}</div>
                <div style="font-size:11px;color:var(--text-muted)">Due: ${Utils.formatDateShort(u.due)}</div>
              </div>
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
