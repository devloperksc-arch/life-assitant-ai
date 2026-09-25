// Routines Page
Router.register('routines', () => {
  const el = document.createElement('div');
  const r = DATA.routines;
  el.innerHTML = `
    <div class="page-header"><div><div class="page-title">🌅 Routines</div><div class="page-subtitle">Sleep, morning and night routines</div></div><button class="btn btn-primary btn-sm">+ Add Task</button></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
      ${[
        {label:'Sleep Target', val:r.sleep.target, icon:'🌙', color:'violet'},
        {label:'Wake Target', val:r.sleep.wake, icon:'☀️', color:'amber'},
        {label:'Last Night', val:r.sleep.lastNight+'h', icon:'💤', color:'cyan'},
      ].map(s=>`<div class="card"><div class="stat-widget" style="padding:14px"><div style="font-size:22px">${s.icon}</div><div class="stat-value" style="font-size:22px;color:var(--accent-${s.color})">${s.val}</div><div class="stat-label">${s.label}</div></div></div>`).join('')}
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-icon" style="background:rgba(245,158,11,0.15)">☀️</div><div class="card-title">Morning Routine</div><span class="badge badge-green" style="margin-left:auto">${r.morning.filter(t=>t.done).length}/${r.morning.length}</span></div>
        <div class="card-body">
          ${r.morning.map((task,i) => `
            <div class="routine-item">
              <div class="routine-check ${task.done?'checked':''}" onclick="DATA.routines.morning[${i}].done=!DATA.routines.morning[${i}].done;Router.navigate('routines');">${task.done?'✓':''}</div>
              <span class="routine-label">${task.task}</span>
              <span class="routine-time">${task.time}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-icon" style="background:rgba(124,58,237,0.15)">🌙</div><div class="card-title">Night Routine</div><span class="badge badge-violet" style="margin-left:auto">${r.night.filter(t=>t.done).length}/${r.night.length}</span></div>
        <div class="card-body">
          ${r.night.map((task,i) => `
            <div class="routine-item">
              <div class="routine-check ${task.done?'checked':''}" onclick="DATA.routines.night[${i}].done=!DATA.routines.night[${i}].done;Router.navigate('routines');">${task.done?'✓':''}</div>
              <span class="routine-label">${task.task}</span>
              <span class="routine-time">${task.time}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  return el;
});

// Wellbeing Page
Router.register('wellbeing', () => {
  const el = document.createElement('div');
  const w = DATA.wellbeing;
  el.innerHTML = `
    <div class="page-header"><div><div class="page-title">🧘 Wellbeing</div><div class="page-subtitle">Mood, stress and mental health tracking</div></div><button class="btn btn-primary btn-sm">+ Check-in</button></div>
    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><div class="card-icon" style="background:rgba(16,185,129,0.1)">😊</div><div class="card-title">How are you feeling today?</div></div>
      <div class="card-body">
        <div class="mood-selector">
          ${['😔','😞','😐','🙂','😊','😁'].map((emoji,i) => `
            <button class="mood-btn ${w.todayMood===i?'selected':''}" onclick="DATA.wellbeing.todayMood=${i};document.querySelectorAll('.mood-btn').forEach((b,j)=>b.classList.toggle('selected',j===${i}))" title="${['Very Bad','Bad','Neutral','OK','Good','Great'][i]}">${emoji}</button>
          `).join('')}
        </div>
        <div style="text-align:center;font-size:12px;color:var(--text-muted);margin-top:8px">${w.todayMood===null ? 'Select your mood for today' : 'Mood logged! ✓'}</div>
      </div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">This Week's Mood</div></div>
        <div class="card-body">
          <div style="display:flex;align-items:flex-end;gap:6px;height:80px;margin-bottom:8px">
            ${w.moodHistory.map((m,i) => `
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
                <div style="width:100%;border-radius:4px 4px 0 0;background:linear-gradient(180deg,var(--accent-cyan),rgba(0,212,255,0.2));height:${m/5*70}px;min-height:4px"></div>
                <div style="font-size:9px;color:var(--text-muted)">${['M','T','W','T','F','S','S'][i]}</div>
              </div>
            `).join('')}
          </div>
          <div style="font-size:12px;color:var(--text-muted);text-align:center">Average: ${(w.moodHistory.reduce((a,b)=>a+b,0)/w.moodHistory.length).toFixed(1)}/5 — Good week 😊</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Stress & Breaks</div></div>
        <div class="card-body">
          <div style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px"><span>Stress Level</span><span style="font-weight:700;color:var(--accent-amber)">${w.stressLevel}/5</span></div>
            <div class="progress-track"><div class="progress-fill amber" style="width:${w.stressLevel/5*100}%"></div></div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:8px">TODAY'S BREAKS</div>
            ${w.breaks.map(b=>`<div style="display:flex;gap:8px;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border-subtle)"><span>⏸️</span><span>${b.time}</span><span style="color:var(--text-muted)">${b.type} · ${b.duration}</span></div>`).join('')}
            <button class="btn btn-secondary btn-sm" style="margin-top:10px;width:100%">+ Log Break</button>
          </div>
        </div>
      </div>
    </div>
  `;
  return el;
});
