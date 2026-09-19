// ============================================================
// Calendar Page
// ============================================================

Router.register('calendar', () => {
  const el = document.createElement('div');
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  // Build calendar days
  let calCells = [];
  // Prev month padding
  const prevDays = new Date(year, month, 0).getDate();
  for (let i = firstDay-1; i >= 0; i--) {
    calCells.push({ day: prevDays-i, current:false });
  }
  for (let d = 1; d <= daysInMonth; d++) calCells.push({ day:d, current:true });
  while (calCells.length < 42) calCells.push({ day: calCells.length - daysInMonth - firstDay + 1, current:false });

  const getEventsForDay = (d) => DATA.calendarEvents.filter(e => {
    const ed = new Date(e.date);
    return ed.getDate()===d && ed.getMonth()===month && ed.getFullYear()===year;
  });

  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">📅 Calendar</div>
        <div class="page-subtitle">Schedule, time blocks, and TADASHI replanning</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="Router.navigate('tadashi')">🔄 Ask TADASHI to replan</button>
        <button class="btn btn-primary btn-sm">+ Add Event</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 280px;gap:20px">
      <!-- Calendar grid -->
      <div>
        <!-- Month nav -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <button class="btn btn-secondary btn-sm">◀ Prev</button>
          <span style="font-size:16px;font-weight:700">${monthNames[month]} ${year}</span>
          <button class="btn btn-secondary btn-sm">Next ▶</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:2px">
          ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div style="text-align:center;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;padding:6px">${d}</div>`).join('')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">
          ${calCells.map(cell => {
            const isToday = cell.current && cell.day === today.getDate();
            const events = cell.current ? getEventsForDay(cell.day) : [];
            return `
              <div class="cal-day ${isToday?'today':''} ${!cell.current?'other-month':''}">
                <div class="cal-day-num">${isToday ? `<div style="width:22px;height:22px;background:linear-gradient(135deg,var(--accent-cyan),var(--accent-violet));border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff">${cell.day}</div>` : cell.day}</div>
                ${events.slice(0,2).map(e => `<div class="cal-event ${e.color||'cyan'}">${e.title}</div>`).join('')}
                ${events.length>2 ? `<div style="font-size:9px;color:var(--text-muted)">+${events.length-2} more</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Right panel: Upcoming + Day view -->
      <div style="display:flex;flex-direction:column;gap:16px">
        <!-- Today's events -->
        <div class="card">
          <div class="card-header">
            <div class="card-icon" style="background:rgba(0,212,255,0.1)">📋</div>
            <div><div class="card-title">Today's Events</div></div>
          </div>
          <div class="card-body">
            ${DATA.calendarEvents.filter(e=>e.date===Utils.today()).map(ev => `
              <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-subtle)">
                <div style="width:3px;border-radius:2px;background:var(--accent-${ev.color||'cyan'});flex-shrink:0;align-self:stretch"></div>
                <div>
                  <div style="font-size:12px;font-weight:600">${ev.title}</div>
                  <div style="font-size:10px;color:var(--text-muted)">${ev.time}${ev.duration?' · '+ev.duration+' min':''}</div>
                </div>
              </div>
            `).join('') || '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:12px">No events today</div>'}
          </div>
        </div>

        <!-- Upcoming events -->
        <div class="card" style="flex:1">
          <div class="card-header">
            <div class="card-icon" style="background:rgba(245,158,11,0.1)">⏰</div>
            <div><div class="card-title">Upcoming</div></div>
          </div>
          <div class="card-body">
            ${DATA.calendarEvents.filter(e=>e.date>Utils.today()).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,6).map(ev => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-subtle)">
                <div style="text-align:center;flex-shrink:0">
                  <div style="font-size:16px;font-weight:800;color:var(--accent-${ev.color||'cyan'})">${new Date(ev.date).getDate()}</div>
                  <div style="font-size:9px;color:var(--text-muted)">${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][new Date(ev.date).getMonth()]}</div>
                </div>
                <div>
                  <div style="font-size:12px;font-weight:500">${ev.title}</div>
                  <div style="font-size:10px;color:var(--text-muted)">${ev.time} · in ${Utils.daysUntil(ev.date)}d</div>
                </div>
                <span class="badge badge-${ev.color||'cyan'}" style="margin-left:auto">${ev.type}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Conflicts detected -->
        <div class="card">
          <div class="card-header">
            <div class="card-icon" style="background:rgba(239,68,68,0.1)">⚡</div>
            <div><div class="card-title">TADASHI Insights</div></div>
          </div>
          <div class="card-body">
            <div class="risk-alert">
              <span class="risk-alert-icon">⚠️</span>
              <div class="risk-alert-body">
                <div class="risk-alert-title">Study block gap detected</div>
                <div class="risk-alert-desc">No study scheduled today despite OS exam in 6 days</div>
              </div>
            </div>
            <div class="rec-card" onclick="processTADASHICommand('Fix my week')">
              <span class="rec-icon">🔄</span>
              <div class="rec-body">
                <div class="rec-title">Let TADASHI replan your week</div>
                <div class="rec-desc">8 changes identified to optimize exam prep</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  return el;
});
