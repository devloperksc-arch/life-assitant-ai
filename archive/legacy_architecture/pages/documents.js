// Documents Page
Router.register('documents', () => {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="page-header"><div><div class="page-title">📁 Documents</div><div class="page-subtitle">Storage, search, OCR and expiry tracking</div></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm">🔍 Search</button>
        <button class="btn btn-primary btn-sm">+ Upload</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
      ${[
        {label:'Total Documents', val:DATA.documents.length, color:'cyan'},
        {label:'Expiring Soon', val:DATA.documents.filter(d=>d.expiry&&Utils.daysUntil(d.expiry)<60).length, color:'amber'},
        {label:'Categories', val:4, color:'violet'},
        {label:'Total Size', val:'14.3 MB', color:'green'},
      ].map(s => `
        <div class="card"><div class="stat-widget"><div class="stat-value" style="color:var(--accent-${s.color})">${s.val}</div><div class="stat-label">${s.label}</div></div></div>
      `).join('')}
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">All Documents</div></div>
      <div>
        ${DATA.documents.map(d => `
          <div class="doc-item">
            <div class="doc-icon" style="background:rgba(0,212,255,0.08)">${d.icon}</div>
            <div class="doc-info">
              <div class="doc-name">${d.name}</div>
              <div class="doc-meta">${d.type} · ${d.size} · ${d.tags.join(', ')}</div>
            </div>
            ${d.expiry ? `<div class="doc-expiry ${Utils.daysUntil(d.expiry)<60?'warn':'ok'}">Exp: ${Utils.formatDateShort(d.expiry)}</div>` : '<div style="font-size:10px;color:var(--text-muted)">No expiry</div>'}
            <div style="display:flex;gap:6px">
              <button class="btn btn-secondary btn-sm">View</button>
              <button class="btn btn-ghost btn-sm">🗑</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  return el;
});

// Knowledge Page
Router.register('knowledge', () => {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="page-header"><div><div class="page-title">💡 Knowledge Base</div><div class="page-subtitle">Notes, ideas, journals and semantic search</div></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="processTADASHICommand('Search my knowledge base for productivity tips')">🔍 Semantic Search</button>
        <button class="btn btn-primary btn-sm">+ New Note</button>
      </div>
    </div>
    <div class="grid-auto">
      ${DATA.knowledge.map(k => `
        <div class="card knowledge-card">
          <div class="knowledge-type">${k.type}</div>
          <div class="knowledge-title">${k.title}</div>
          <div class="knowledge-preview">${k.preview}</div>
          <div class="knowledge-footer">
            <div class="tags">${k.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
            <span style="font-size:10px;color:var(--text-muted)">${Utils.formatDateShort(k.date)}</span>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="card" style="margin-top:20px;padding:16px;background:linear-gradient(135deg,rgba(124,58,237,0.06),rgba(0,212,255,0.06));border-color:rgba(0,212,255,0.15)">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:24px">🔮</span>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;color:var(--accent-cyan)">Semantic Search powered by TADASHI RAG</div>
          <div style="font-size:12px;color:var(--text-muted)">Ask questions across your entire knowledge base — "What do I know about Spring Boot?" or "Find notes about habits"</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="processTADASHICommand('Search my notes for Spring Boot')">Try it →</button>
      </div>
    </div>
  `;
  return el;
});
