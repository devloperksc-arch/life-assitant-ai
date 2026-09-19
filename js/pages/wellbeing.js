// Wellbeing Page (standalone)
Router.register('wellbeing', () => {
  const el = document.createElement('div');
  const w = DATA.wellbeing;
  el.innerHTML = `
    <div class="page-header"><div><div class="page-title">🧘 Wellbeing</div><div class="page-subtitle">Mood, stress, breaks and mental health</div></div><button class="btn btn-primary btn-sm">+ Journal Entry</button></div>
    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><div class="card-icon" style="background:rgba(16,185,129,0.1)">😊</div><div class="card-title">Today's Mood Check-in</div></div>
      <div class="card-body">
        <div class="mood-selector">
          ${['😔','😞','😐','🙂','😊','😁'].map((emoji,i)=>`<button class="mood-btn ${w.todayMood===i?'selected':''}" onclick="DATA.wellbeing.todayMood=${i};document.querySelectorAll('.mood-btn').forEach((b,j)=>b.classList.toggle('selected',j===${i}))">${emoji}</button>`).join('')}
        </div>
        <div style="text-align:center;font-size:12px;color:var(--text-muted);margin-top:8px">${w.todayMood===null?'Tap to log your mood':['Very Bad','Bad','Neutral','OK','Good','Great'][w.todayMood]+' ✓'}</div>
      </div>
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-header"><div class="card-title">Mood This Week</div></div>
        <div class="card-body">
          <div style="display:flex;align-items:flex-end;gap:6px;height:80px;margin-bottom:8px">
            ${w.moodHistory.map((m,i)=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:100%;border-radius:4px 4px 0 0;background:var(--accent-cyan);height:${m/5*70}px;min-height:4px"></div><span style="font-size:9px;color:var(--text-muted)">${['M','T','W','T','F','S','S'][i]}</span></div>`).join('')}
          </div>
          <div style="font-size:12px;color:var(--text-muted);text-align:center">Avg: ${(w.moodHistory.reduce((a,b)=>a+b,0)/w.moodHistory.length).toFixed(1)}/5</div>
        </div>
      </div>
      <div class="card"><div class="card-header"><div class="card-title">Stress & Breaks</div></div>
        <div class="card-body">
          <div style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px"><span>Stress</span><span style="font-weight:700;color:var(--accent-amber)">${w.stressLevel}/5</span></div>
            <div class="progress-track"><div class="progress-fill amber" style="width:${w.stressLevel/5*100}%"></div></div>
          </div>
          ${w.breaks.map(b=>`<div style="display:flex;gap:8px;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border-subtle)"><span>⏸️</span><span>${b.time}</span><span style="color:var(--text-muted)">${b.type} · ${b.duration}</span></div>`).join('')}
          <button class="btn btn-secondary btn-sm" style="margin-top:10px;width:100%">+ Log Break</button>
        </div>
      </div>
    </div>
  `;
  return el;
});
