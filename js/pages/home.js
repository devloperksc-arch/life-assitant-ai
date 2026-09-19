// ============================================================
// Home Dashboard Page
// ============================================================

Router.register('home', () => {
  const el = document.createElement('div');

  const todayEvents = DATA.calendarEvents.filter(e => e.date === Utils.today()).slice(0, 4);
  const topTasks = DATA.tasks.filter(t => t.status !== 'done').slice(0, 5);
  const upcomingDeadlines = DATA.tasks.filter(t => t.deadline && t.status !== 'done')
    .sort((a,b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 4);

  el.innerHTML = `
    <!-- TADASHI Briefing Banner -->
    <div class="card glow-cyan" style="margin-bottom:20px;padding:0;overflow:hidden">
      <div style="background:linear-gradient(135deg,rgba(0,212,255,0.08),rgba(124,58,237,0.08));padding:18px 20px;border-bottom:1px solid var(--border-subtle);display:flex;align-items:center;gap:14px">
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--accent-cyan),var(--accent-violet));display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:var(--glow-cyan);flex-shrink:0">🧠</div>
        <div style="flex:1">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--accent-cyan);margin-bottom:3px">TADASHI BRIEFING • ${Utils.timeNow()}</div>
          <div style="font-size:14px;font-weight:600;color:var(--text-primary)">Good evening, Krishna! You have <span style="color:var(--accent-amber)">3 risks</span> and <span style="color:var(--accent-cyan)">2 pending approvals</span> today.</div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="Router.navigate('tadashi')">Open TADASHI →</button>
      </div>
      <div style="display:flex;gap:0;padding:0">
        ${[
          {icon:'⚠️', text:'OS Exam in 6 days — 42% syllabus gap', color:'var(--accent-amber)'},
          {icon:'💪', text:'Push Day at 5:30 PM scheduled', color:'var(--accent-green)'},
          {icon:'🎂', text:'Mom\'s birthday today — call at 8 PM', color:'var(--accent-pink)'},
        ].map((r,i) => `
          <div style="flex:1;padding:10px 14px;display:flex;align-items:center;gap:6px;font-size:11px;${i>0?'border-left:1px solid var(--border-subtle)':''}">
            <span>${r.icon}</span>
            <span style="color:${r.color}">${r.text}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Stats Row -->
    <div class="grid-4" style="margin-bottom:20px">
      ${[
        {label:'Life Score', val:DATA.user.lifeScore, unit:'/100', delta:'↑ 3 this week', up:true, color:'linear-gradient(135deg,var(--accent-cyan),var(--accent-green))', icon:'⚡'},
        {label:'Energy Score', val:DATA.user.energyScore, unit:'%', delta:'Moderate', up:null, color:'linear-gradient(135deg,var(--accent-amber),var(--accent-orange))', icon:'🔋'},
        {label:'Tasks Today', val:topTasks.length, unit:' pending', delta:`${DATA.tasks.filter(t=>t.status==='done').length} done`, up:true, color:'linear-gradient(135deg,var(--accent-violet),var(--accent-indigo))', icon:'✅'},
        {label:'Active Risks', val:DATA.lifeState.activeRisks, unit:'', delta:'Needs attention', up:false, color:'linear-gradient(135deg,var(--accent-red),var(--accent-orange))', icon:'⚠️'},
      ].map(s => `
        <div class="card glow-cyan">
          <div class="stat-widget">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div style="width:36px;height:36px;border-radius:var(--radius-md);background:${s.color};display:flex;align-items:center;justify-content:center;font-size:16px;opacity:0.9">${s.icon}</div>
            </div>
            <div class="stat-value" style="background:${s.color};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${s.val}<span style="font-size:14px;font-weight:500">${s.unit}</span></div>
            <div class="stat-label">${s.label}</div>
            <div class="stat-delta ${s.up===true?'up':s.up===false?'down':'neutral'}">${s.delta}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Main 3-column grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr 320px;gap:20px;margin-bottom:20px">
      <!-- Today Timeline -->
      <div class="card">
        <div class="card-header">
          <div class="card-icon" style="background:rgba(0,212,255,0.1)">📅</div>
          <div>
            <div class="card-title">Today's Timeline</div>
            <div class="card-subtitle">${Utils.formatDate(Utils.today())}</div>
          </div>
          <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="Router.navigate('calendar')">View all →</button>
        </div>
        <div class="card-body">
          <div class="timeline">
            ${todayEvents.length ? todayEvents.map(ev => `
              <div class="timeline-item">
                <div class="timeline-dot" style="border-color:var(--accent-${ev.color||'cyan'});color:var(--accent-${ev.color||'cyan'})">${{class:'📚',fitness:'💪',exam:'📝',deadline:'⏰',personal:'👤',work:'💼'}[ev.type]||'📅'}</div>
                <div class="timeline-content">
                  <div class="timeline-title">${ev.title}</div>
                  <div class="timeline-meta">${ev.time}${ev.duration?` • ${ev.duration} min`:''}</div>
                </div>
              </div>
            `).join('') : '<div class="empty-state" style="padding:24px"><div class="empty-state-icon">🗓️</div><div class="empty-state-desc">No events today</div></div>'}
            <!-- Free block -->
            <div class="timeline-item">
              <div class="timeline-dot" style="border-color:var(--accent-green);color:var(--accent-green)">✦</div>
              <div class="timeline-content">
                <div class="timeline-title" style="color:var(--accent-green)">Free time: ~2.5 hours</div>
                <div class="timeline-meta">Available for study or focus work</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Priority Queue -->
      <div class="card">
        <div class="card-header">
          <div class="card-icon" style="background:rgba(245,158,11,0.1)">🎯</div>
          <div>
            <div class="card-title">Priority Queue</div>
            <div class="card-subtitle">TADASHI-ranked tasks</div>
          </div>
          <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="Router.navigate('tasks')">All tasks →</button>
        </div>
        <div class="card-body">
          ${topTasks.map((t, i) => `
            <div class="pq-item">
              <div class="pq-rank">#${i+1}</div>
              <div class="pq-urgency" style="background:${t.priority==='high'?'var(--accent-red)':t.priority==='medium'?'var(--accent-amber)':'var(--accent-green)'}"></div>
              <div class="pq-content">
                <div class="pq-title">${t.title}</div>
                <div class="pq-meta">
                  <span class="badge badge-${Utils.priorityColor(t.priority)}">${t.priority}</span>
                  ${t.deadline ? `<span class="pq-deadline" style="color:${Utils.deadlineColor(t.deadline)}">Due ${Utils.formatDateShort(t.deadline)} (${Utils.daysUntil(t.deadline)}d)</span>` : ''}
                  <span style="font-size:10px;color:var(--text-muted)">${t.project}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Right column: Life Score + Risks + Recommendations -->
      <div style="display:flex;flex-direction:column;gap:16px">
        <!-- Life Score Ring -->
        <div class="card glow-cyan">
          <div class="card-body" style="display:flex;align-items:center;gap:16px">
            <div style="position:relative;width:80px;height:80px;flex-shrink:0">
              ${Utils.arc(DATA.user.lifeScore, 80, 6, 'url(#grad1)')}
              <svg width="0" height="0"><defs><linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:var(--accent-cyan)"/><stop offset="100%" style="stop-color:var(--accent-green)"/></linearGradient></defs></svg>
              <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
                <div style="font-size:18px;font-weight:900;background:linear-gradient(135deg,var(--accent-cyan),var(--accent-green));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1">${DATA.user.lifeScore}</div>
                <div style="font-size:8px;color:var(--text-muted);font-weight:600;letter-spacing:0.5px">LIFE</div>
              </div>
            </div>
            <div>
              <div style="font-size:13px;font-weight:700;margin-bottom:6px">Life Score</div>
              <div style="display:flex;flex-direction:column;gap:4px">
                ${[
                  {label:'Productivity', val:78, color:'cyan'},
                  {label:'Health', val:72, color:'green'},
                  {label:'Finance', val:80, color:'amber'},
                  {label:'Study', val:58, color:'violet'},
                ].map(d => `
                  <div style="display:flex;align-items:center;gap:6px;font-size:10px">
                    <span style="width:60px;color:var(--text-muted)">${d.label}</span>
                    <div class="progress-track" style="flex:1;height:3px"><div class="progress-fill ${d.color}" style="width:${d.val}%"></div></div>
                    <span style="width:24px;text-align:right;font-weight:600">${d.val}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- TADASHI Recommendations -->
        <div class="card" style="flex:1">
          <div class="card-header">
            <div class="card-icon" style="background:rgba(124,58,237,0.15)">💡</div>
            <div><div class="card-title">Recommendations</div></div>
          </div>
          <div class="card-body">
            <div class="rec-card" onclick="Router.navigate('tadashi')">
              <span class="rec-icon">📚</span>
              <div class="rec-body">
                <div class="rec-title">Study DBMS tonight</div>
                <div class="rec-desc">2hr gap found 7–9 PM. Exam in 10 days, normalization pending.</div>
                <div class="rec-confidence">High confidence • 94%</div>
              </div>
            </div>
            <div class="rec-card" onclick="Router.navigate('fitness')">
              <span class="rec-icon">💪</span>
              <div class="rec-body">
                <div class="rec-title">Don't skip gym today</div>
                <div class="rec-desc">4-day streak. Missing today drops weekly goal to 4/5.</div>
                <div class="rec-confidence">High confidence • 98%</div>
              </div>
            </div>
            <div class="rec-card" onclick="Router.navigate('finance')">
              <span class="rec-icon">💰</span>
              <div class="rec-body">
                <div class="rec-title">Food budget at 62%</div>
                <div class="rec-desc">₹760 remaining for 11 more days. Cook at home 3x this week.</div>
                <div class="rec-confidence">Medium confidence • 76%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Row: Upcoming + Progress Snapshots -->
    <div class="grid-2">
      <!-- Upcoming Deadlines -->
      <div class="card">
        <div class="card-header">
          <div class="card-icon" style="background:rgba(239,68,68,0.1)">⏰</div>
          <div><div class="card-title">Upcoming Deadlines</div><div class="card-subtitle">Next 14 days</div></div>
        </div>
        <div class="card-body">
          <table class="data-table">
            <thead><tr><th>Item</th><th>Module</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>
              ${[
                {name:'OS Assignment', mod:'Study', due:'Sep 22', days:3, status:'pending', priority:'high'},
                {name:'OS Exam', mod:'Study', due:'Sep 26', days:7, status:'upcoming', priority:'high'},
                {name:'WiFi Bill', mod:'Finance', due:'Sep 25', days:6, status:'upcoming', priority:'medium'},
                {name:'DBMS Exam', mod:'Study', due:'Sep 29', days:10, status:'upcoming', priority:'high'},
              ].map(d => `
                <tr>
                  <td style="font-weight:500">${d.name}</td>
                  <td><span class="badge badge-cyan">${d.mod}</span></td>
                  <td style="font-size:12px;color:${d.days<=3?'var(--accent-red)':d.days<=7?'var(--accent-amber)':'var(--text-muted)'}">${d.due} <span style="font-size:10px">(${d.days}d)</span></td>
                  <td><span class="badge badge-${d.priority==='high'?'red':'amber'}">${d.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Progress Snapshots -->
      <div class="card">
        <div class="card-header">
          <div class="card-icon" style="background:rgba(16,185,129,0.1)">📈</div>
          <div><div class="card-title">Progress Snapshots</div><div class="card-subtitle">This week</div></div>
        </div>
        <div class="card-body">
          <div style="display:flex;flex-direction:column;gap:14px">
            ${[
              {label:'OS Syllabus', val:58, color:'cyan', detail:'3/5 topics done', icon:'📚'},
              {label:'Savings Goal', val:72, color:'green', detail:'₹36,800 / ₹50,000', icon:'💰'},
              {label:'Fitness Weekly', val:80, color:'amber', detail:'4/5 sessions done', icon:'💪'},
              {label:'Nutrition', val:84, color:'violet', detail:'1,840 / 2,200 kcal today', icon:'🥗'},
              {label:'DBMS Syllabus', val:42, color:'red', detail:'2/5 topics done', icon:'📖'},
            ].map(p => `
              <div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
                  <span style="font-size:12px;font-weight:500;display:flex;align-items:center;gap:6px">${p.icon} ${p.label}</span>
                  <span style="font-size:11px;color:var(--text-muted)">${p.detail}</span>
                  <span style="font-size:12px;font-weight:700;margin-left:8px">${p.val}%</span>
                </div>
                <div class="progress-track"><div class="progress-fill ${p.color}" style="width:${p.val}%"></div></div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  return el;
});
