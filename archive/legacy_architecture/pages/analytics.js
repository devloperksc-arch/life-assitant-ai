// Analytics Page
Router.register('analytics', () => {
  const el = document.createElement('div');
  const a = DATA.analytics;
  el.innerHTML = `
    <div class="page-header"><div><div class="page-title">📊 Analytics</div><div class="page-subtitle">Cross-domain trends, insights and forecasts</div></div>
      <button class="btn btn-secondary btn-sm" onclick="processTADASHICommand('Show me my life analytics summary')">🧠 TADASHI Insights</button>
    </div>

    <!-- Life Score trend -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><div class="card-icon" style="background:rgba(0,212,255,0.1)">⚡</div><div class="card-title">Life Score This Week</div></div>
      <div class="card-body">
        <div style="display:flex;align-items:flex-end;gap:4px;height:80px;margin-bottom:6px">
          ${[65,72,58,80,74,68,82].map((v,i)=>`
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
              <div style="width:100%;border-radius:4px 4px 0 0;background:${i===6?'linear-gradient(180deg,var(--accent-cyan),rgba(0,212,255,0.3))':'var(--bg-elevated)'};height:${v/82*70}px;min-height:4px;border:1px solid ${i===6?'var(--accent-cyan)':'var(--border-subtle)'};transition:all 0.3s" title="${v}"></div>
              <span style="font-size:9px;color:${i===6?'var(--accent-cyan)':'var(--text-muted)'};font-weight:${i===6?700:400}">${a.days[i]}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- 3-col charts -->
    <div class="grid-3" style="margin-bottom:20px">
      ${[
        {title:'Productivity', data:a.productivity, color:'var(--accent-cyan)', unit:'%', icon:'⚡'},
        {title:'Study Hours', data:a.studyHours, color:'var(--accent-violet-bright)', unit:'h', icon:'📚'},
        {title:'Fitness Sessions', data:a.fitness, color:'var(--accent-green)', unit:'', icon:'💪'},
      ].map(chart=>`
        <div class="card">
          <div class="card-header"><div class="card-icon" style="background:rgba(0,0,0,0.2)">${chart.icon}</div><div class="card-title">${chart.title}</div></div>
          <div class="card-body">
            <div style="display:flex;align-items:flex-end;gap:4px;height:60px;margin-bottom:6px">
              ${chart.data.map((v,i)=>`
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
                  <div style="width:100%;border-radius:3px 3px 0 0;background:${chart.color};height:${v/Math.max(...chart.data)*56}px;min-height:3px;opacity:${i===6?1:0.5}"></div>
                  <span style="font-size:8px;color:var(--text-muted)">${a.days[i].charAt(0)}</span>
                </div>
              `).join('')}
            </div>
            <div style="text-align:center;font-size:12px;font-weight:700;color:${chart.color}">${chart.data[chart.data.length-1]}${chart.unit} today</div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Cross-domain insights -->
    <div class="grid-2" style="margin-bottom:20px">
      <!-- Spending this week -->
      <div class="card">
        <div class="card-header"><div class="card-icon" style="background:rgba(245,158,11,0.15)">💰</div><div class="card-title">Spending This Week</div></div>
        <div class="card-body">
          <div style="display:flex;align-items:flex-end;gap:4px;height:70px;margin-bottom:8px">
            ${a.spending.map((v,i)=>`
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
                <div style="width:100%;border-radius:3px 3px 0 0;background:${v>5000?'var(--accent-red)':v>4000?'var(--accent-amber)':'var(--accent-green)'};height:${v/5640*65}px;min-height:3px"></div>
                <span style="font-size:8px;color:var(--text-muted)">${a.days[i].charAt(0)}</span>
              </div>
            `).join('')}
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px">
            <span style="color:var(--text-muted)">Total this month</span>
            <span style="font-weight:700;color:var(--accent-amber)">₹${Utils.fmt(DATA.finance.monthlyExpenses)}</span>
          </div>
        </div>
      </div>

      <!-- Correlation insights -->
      <div class="card">
        <div class="card-header"><div class="card-icon" style="background:rgba(124,58,237,0.15)">🔗</div><div class="card-title">TADASHI Correlations</div></div>
        <div class="card-body">
          ${[
            {insight:'Sleep ↔ Productivity', desc:'7.5h+ sleep correlates with 80%+ productivity score', confidence:87, up:true},
            {insight:'Gym ↔ Study Focus', desc:'Gym days show 23% higher study session effectiveness', confidence:74, up:true},
            {insight:'Late meals ↔ Sleep quality', desc:'Meals after 8 PM reduce sleep quality by ~15 min', confidence:65, up:false},
          ].map(c=>`
            <div style="padding:10px 0;border-bottom:1px solid var(--border-subtle)">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                <span style="font-size:14px">${c.up?'↗️':'↘️'}</span>
                <span style="font-size:12px;font-weight:700">${c.insight}</span>
                <span style="font-size:10px;color:var(--accent-cyan);margin-left:auto">${c.confidence}%</span>
              </div>
              <div style="font-size:11px;color:var(--text-muted)">${c.desc}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Domain breakdown -->
    <div class="card">
      <div class="card-header"><div class="card-icon" style="background:rgba(16,185,129,0.1)">📈</div><div class="card-title">Domain Performance</div></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
          ${[
            {domain:'Productivity', score:74, trend:'+3', color:'cyan'},
            {domain:'Fitness', score:80, trend:'+5', color:'green'},
            {domain:'Finance', score:82, trend:'+1', color:'amber'},
            {domain:'Study', score:58, trend:'-2', color:'red'},
            {domain:'Nutrition', score:84, trend:'+8', color:'violet'},
            {domain:'Wellbeing', score:70, trend:'0', color:'pink'},
            {domain:'Sleep', score:76, trend:'-4', color:'indigo'},
            {domain:'Relationships', score:65, trend:'+2', color:'cyan'},
          ].map(d=>`
            <div style="text-align:center">
              <div style="position:relative;width:60px;height:60px;margin:0 auto">
                ${Utils.arc(d.score, 60, 6, `var(--accent-${d.color})`)}
                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:var(--accent-${d.color})">${d.score}</div>
              </div>
              <div style="font-size:11px;font-weight:600;margin-top:6px">${d.domain}</div>
              <div style="font-size:10px;color:${d.trend.startsWith('+')?'var(--accent-green)':d.trend===0?'var(--text-muted)':'var(--accent-red)'}">${d.trend}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  return el;
});
