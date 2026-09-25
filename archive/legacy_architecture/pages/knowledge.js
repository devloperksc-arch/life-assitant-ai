// Knowledge Page (standalone)
Router.register('knowledge', () => {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="page-header"><div><div class="page-title">💡 Knowledge Base</div><div class="page-subtitle">Notes, ideas, journals and semantic search</div></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="processTADASHICommand('Search my knowledge base for habits')">🔍 Semantic Search</button>
        <button class="btn btn-primary btn-sm">+ New Note</button>
      </div>
    </div>
    <div class="card" style="margin-bottom:20px;padding:16px;background:linear-gradient(135deg,rgba(124,58,237,0.06),rgba(0,212,255,0.06));border-color:rgba(0,212,255,0.15)">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:24px">🔮</span>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;color:var(--accent-cyan)">RAG Semantic Search</div>
          <div style="font-size:12px;color:var(--text-muted)">Ask TADASHI to search your knowledge base using natural language</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="processTADASHICommand('What do I know about habits?')">Try it →</button>
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
  `;
  return el;
});
