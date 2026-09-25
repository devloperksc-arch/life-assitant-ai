// Nutrition Page
Router.register('nutrition', () => {
  const el = document.createElement('div');
  const n = DATA.nutrition;

  el.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">🥗 Nutrition</div><div class="page-subtitle">Meals, macros, calories and hydration</div></div>
      <button class="btn btn-primary btn-sm">+ Log Meal</button>
    </div>

    <!-- Today summary -->
    <div class="grid-4" style="margin-bottom:20px">
      ${[
        {label:'Calories', val:n.today.calories, total:n.today.target, unit:'kcal', color:'cyan', pct:Utils.pct(n.today.calories,n.today.target)},
        {label:'Protein', val:n.today.protein, total:n.today.proteinTarget, unit:'g', color:'violet', pct:Utils.pct(n.today.protein,n.today.proteinTarget)},
        {label:'Carbs', val:n.today.carbs, total:260, unit:'g', color:'amber', pct:Utils.pct(n.today.carbs,260)},
        {label:'Fat', val:n.today.fat, total:80, unit:'g', color:'green', pct:Utils.pct(n.today.fat,80)},
      ].map(m => `
        <div class="card">
          <div class="stat-widget">
            <div style="position:relative;width:60px;height:60px;margin-bottom:4px">
              ${Utils.arc(m.pct, 60, 6, `var(--accent-${m.color})`)}
              <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:var(--accent-${m.color})">${m.pct}%</div>
            </div>
            <div class="stat-value" style="font-size:20px">${m.val}<span style="font-size:12px;font-weight:400;color:var(--text-muted)">/${m.total}${m.unit}</span></div>
            <div class="stat-label">${m.label}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 280px;gap:20px">
      <!-- Meals -->
      <div>
        <div class="card">
          <div class="card-header"><div class="card-icon" style="background:rgba(16,185,129,0.1)">🍽️</div><div class="card-title">Today's Meals</div></div>
          <div class="card-body">
            ${n.meals.map(meal => `
              <div style="padding:12px;margin-bottom:12px;background:var(--bg-elevated);border-radius:var(--radius-md);border:1px solid var(--border-subtle)">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                  <div style="display:flex;align-items:center;gap:8px">
                    <span style="font-size:14px;font-weight:700">${meal.name}</span>
                    <span style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono)">${meal.time}</span>
                  </div>
                  <div style="text-align:right">
                    <div style="font-size:13px;font-weight:700;color:var(--accent-cyan)">${meal.calories} kcal</div>
                    <div style="font-size:10px;color:var(--text-muted)">P: ${meal.protein}g</div>
                  </div>
                </div>
                <div class="tags">${meal.items.map(i=>`<span class="tag">${i}</span>`).join('')}</div>
              </div>
            `).join('')}
            <button class="btn btn-secondary" style="width:100%">+ Log Another Meal</button>
          </div>
        </div>
      </div>

      <!-- Water + macros breakdown -->
      <div style="display:flex;flex-direction:column;gap:16px">
        <!-- Water -->
        <div class="card">
          <div class="card-header"><div class="card-icon" style="background:rgba(0,212,255,0.1)">💧</div><div class="card-title">Hydration</div></div>
          <div class="card-body">
            <div style="text-align:center;margin-bottom:12px">
              <div style="font-size:28px;font-weight:800;color:var(--accent-cyan)">${n.today.water}L</div>
              <div style="font-size:12px;color:var(--text-muted)">of ${n.today.waterTarget}L goal</div>
            </div>
            <div class="progress-track" style="height:8px;margin-bottom:10px">
              <div class="progress-fill cyan" style="width:${Utils.pct(n.today.water,n.today.waterTarget)}%"></div>
            </div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:center">
              ${Array.from({length:Math.ceil(n.today.waterTarget/0.25)}).map((_, i) => `
                <div style="width:24px;height:32px;border-radius:3px 3px 0 0;background:${i<Math.round(n.today.water/0.25)?'var(--accent-cyan)':'var(--bg-elevated)'};border:1px solid var(--border-subtle);transition:all 0.2s;cursor:pointer" onclick="this.style.background='var(--accent-cyan)'"></div>
              `).join('')}
            </div>
            <div style="font-size:10px;color:var(--text-muted);text-align:center;margin-top:8px">Each cup = 250ml · Click to log</div>
          </div>
        </div>

        <!-- Macro summary -->
        <div class="card">
          <div class="card-header"><div class="card-title">Macros</div></div>
          <div class="card-body">
            <div style="display:flex;flex-direction:column;gap:10px">
              ${[
                {name:'Protein', val:n.today.protein, target:n.today.proteinTarget, color:'#9f67f5'},
                {name:'Carbs', val:n.today.carbs, target:260, color:'#f59e0b'},
                {name:'Fat', val:n.today.fat, target:80, color:'#10b981'},
              ].map(m => `
                <div class="macro-bar">
                  <div class="macro-header">
                    <span class="macro-name">${m.name}</span>
                    <span class="macro-val" style="color:${m.color}">${m.val}g / ${m.target}g</span>
                  </div>
                  <div class="progress-track"><div class="progress-fill" style="width:${Utils.pct(m.val,m.target)}%;background:${m.color}"></div></div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Meal plan -->
        <div class="card">
          <div class="card-header"><div class="card-title">Meal Plan</div></div>
          <div class="card-body">
            <div class="empty-state" style="padding:24px">
              <div class="empty-state-icon">📋</div>
              <div class="empty-state-desc">No meal plan set</div>
              <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="processTADASHICommand('Create a meal plan for me')">Ask TADASHI</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  return el;
});
