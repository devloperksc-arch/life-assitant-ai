// Fitness Page
Router.register('fitness', () => {
  const el = document.createElement('div');
  const w = DATA.fitness;
  const today = DATA.fitness.workouts.find(w=>w.date===Utils.today()) || DATA.fitness.workouts[0];

  el.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">💪 Fitness</div><div class="page-subtitle">Workouts, progress, and analytics</div></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="processTADASHICommand('I skipped gym today')">I skipped today</button>
        <button class="btn btn-primary btn-sm">+ Log Workout</button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid-4" style="margin-bottom:20px">
      ${[
        {label:'Current Streak', val:w.currentStreak, unit:' days 🔥', color:'amber'},
        {label:'Weekly Goal', val:`${w.weekDone}/${w.weeklyGoal}`, unit:' sessions', color:'cyan'},
        {label:'Weight', val:w.measurements.weight, unit:' kg', color:'violet'},
        {label:'Body Fat', val:w.measurements.bodyFat, unit:'%', color:'green'},
      ].map(s => `
        <div class="card">
          <div class="stat-widget">
            <div class="stat-value" style="color:var(--accent-${s.color})">${s.val}<span style="font-size:14px;font-weight:500">${s.unit}</span></div>
            <div class="stat-label">${s.label}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 320px;gap:20px">
      <!-- Today's workout -->
      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="card-header">
            <div class="card-icon" style="background:rgba(245,158,11,0.15)">🏋️</div>
            <div>
              <div class="card-title">${today.name}</div>
              <div class="card-subtitle">${Utils.formatDate(today.date)} · ${today.duration} min · <span class="badge badge-${today.status==='done'?'green':'cyan'}">${today.status}</span></div>
            </div>
            ${today.status!=='done' ? `<button class="btn btn-success btn-sm" style="margin-left:auto" onclick="alert('Workout logged! Great job 💪')">Mark Done</button>` : ''}
          </div>
          <div class="card-body">
            ${today.exercises.map(ex => `
              <div style="margin-bottom:16px">
                <div style="font-size:13px;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:8px">
                  <span>${ex.name}</span>
                  ${ex.sets.length ? `<span style="font-size:10px;color:var(--text-muted)">${ex.sets.length} sets</span>` : ''}
                </div>
                <div style="background:var(--bg-surface);border-radius:var(--radius-sm);overflow:hidden">
                  <div class="set-row" style="background:var(--bg-elevated);font-size:10px;font-weight:700;color:var(--text-muted)">
                    <span>#</span><span>Reps</span><span>Weight</span><span>Volume</span>
                  </div>
                  ${ex.sets.map((s,i) => `
                    <div class="set-row">
                      <span class="set-num">${i+1}</span>
                      <span>${s.reps}</span>
                      <span>${s.weight?s.weight+'kg':'BW'}</span>
                      <span style="color:var(--text-muted)">${s.weight?s.reps*s.weight+'kg·rep':'—'}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- PRs -->
        <div class="card">
          <div class="card-header"><div class="card-icon" style="background:rgba(239,68,68,0.1)">🏆</div><div class="card-title">Personal Records</div></div>
          <div class="card-body">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
              ${w.prs.map(pr => `
                <div style="text-align:center;padding:12px;background:var(--bg-elevated);border-radius:var(--radius-md);border:1px solid var(--border-subtle)">
                  <div style="font-size:16px;font-weight:800;color:var(--accent-amber)">${pr.value}</div>
                  <div style="font-size:11px;font-weight:600;margin-top:2px">${pr.exercise}</div>
                  <div style="font-size:10px;color:var(--text-muted)">${Utils.formatDateShort(pr.date)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Weekly rings + History -->
      <div style="display:flex;flex-direction:column;gap:16px">
        <!-- Weekly progress rings -->
        <div class="card">
          <div class="card-header"><div class="card-icon" style="background:rgba(16,185,129,0.1)">🎯</div><div class="card-title">Weekly Rings</div></div>
          <div class="card-body">
            <div style="display:flex;justify-content:space-around">
              ${[
                {label:'Sessions', val:w.weekDone, max:w.weeklyGoal, color:'#00d4ff', pct:w.weekDone/w.weeklyGoal*100},
                {label:'Calories', val:'2,240', max:'est.', color:'#10b981', pct:75},
                {label:'Volume', val:'8.4t', max:'est.', color:'#f59e0b', pct:82},
              ].map(r => `
                <div style="text-align:center">
                  <div style="position:relative;width:70px;height:70px;margin:0 auto">
                    ${Utils.arc(r.pct, 70, 7, r.color)}
                    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
                      <span style="font-size:14px;font-weight:800;color:${r.color}">${r.val}</span>
                    </div>
                  </div>
                  <div style="font-size:10px;color:var(--text-muted);margin-top:6px;font-weight:600">${r.label}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Week calendar -->
        <div class="card">
          <div class="card-header"><div class="card-title">This Week</div></div>
          <div class="card-body">
            <div style="display:flex;gap:4px;justify-content:space-between">
              ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day,i) => {
                const done = i < w.weekDone;
                return `
                  <div style="flex:1;text-align:center">
                    <div style="width:32px;height:32px;border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:14px;background:${done?'linear-gradient(135deg,var(--accent-green),#059669)':'var(--bg-elevated)'};border:1px solid ${done?'transparent':'var(--border-subtle)'}">
                      ${done?'✓':''}
                    </div>
                    <div style="font-size:9px;color:var(--text-muted);margin-top:4px">${day}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Body measurements -->
        <div class="card">
          <div class="card-header"><div class="card-title">Measurements</div></div>
          <div class="card-body">
            ${[
              {label:'Weight', val:`${w.measurements.weight} kg`, target:'75 kg', pct:45},
              {label:'Height', val:`${w.measurements.height} cm`, target:'Fixed', pct:100},
              {label:'Body Fat', val:`${w.measurements.bodyFat}%`, target:'12%', pct:55},
            ].map(m => `
              <div style="margin-bottom:12px">
                <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
                  <span style="color:var(--text-muted)">${m.label}</span>
                  <span style="font-weight:700">${m.val}</span>
                  <span style="color:var(--text-muted)">Goal: ${m.target}</span>
                </div>
                <div class="progress-track"><div class="progress-fill cyan" style="width:${m.pct}%"></div></div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  return el;
});
