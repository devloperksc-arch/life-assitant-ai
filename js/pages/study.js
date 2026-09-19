// Study Page
Router.register('study', () => {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">📚 Study & Learning</div><div class="page-subtitle">Subjects, exams, assignments, and study sessions</div></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="processTADASHICommand('Create a study plan for my exams')">🧠 TADASHI Study Plan</button>
        <button class="btn btn-primary btn-sm">+ Add Subject</button>
      </div>
    </div>

    <!-- Exam countdown -->
    <div class="card" style="margin-bottom:20px;padding:16px;background:linear-gradient(135deg,rgba(239,68,68,0.06),rgba(245,158,11,0.06));border-color:rgba(239,68,68,0.2)">
      <div style="display:flex;gap:16px;overflow-x:auto">
        ${DATA.study.subjects.map(s => `
          <div style="flex:1;min-width:160px;text-align:center;padding:12px;background:var(--bg-glass);border:1px solid var(--border-subtle);border-radius:var(--radius-md)">
            <div style="font-size:28px;font-weight:900;color:${Utils.daysUntil(s.examDate)<=5?'var(--accent-red)':Utils.daysUntil(s.examDate)<=10?'var(--accent-amber)':'var(--accent-cyan)'}">${Utils.daysUntil(s.examDate)}</div>
            <div style="font-size:10px;color:var(--text-muted)">days until</div>
            <div style="font-size:12px;font-weight:700;margin-top:4px">${s.name}</div>
            <div style="font-size:10px;color:var(--text-muted)">${s.code} · ${Utils.formatDateShort(s.examDate)}</div>
            <div class="progress-track" style="margin-top:8px"><div class="progress-fill ${s.progress>70?'green':s.progress>40?'cyan':'red'}" style="width:${s.progress}%"></div></div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:4px">${s.progress}% ready</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Subjects -->
    <div class="grid-3" style="margin-bottom:20px">
      ${DATA.study.subjects.map(s => `
        <div class="card study-card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div class="study-subject">${s.name}</div>
            <span class="badge badge-${Utils.daysUntil(s.examDate)<=5?'red':Utils.daysUntil(s.examDate)<=10?'amber':'cyan'}">${Utils.daysUntil(s.examDate)}d left</span>
          </div>
          <div class="study-meta">
            <span>${s.code}</span>
            <span>Exam: ${Utils.formatDateShort(s.examDate)}</span>
          </div>
          <div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
              <span style="color:var(--text-muted)">Syllabus</span><span style="font-weight:700">${s.progress}%</span>
            </div>
            <div class="progress-track"><div class="progress-fill ${s.progress>70?'green':s.progress>40?'cyan':'red'}" style="width:${s.progress}%"></div></div>
          </div>
          <div class="study-topics">
            ${s.topics.map(t => `
              <div class="study-topic">
                <div class="topic-status ${t.status}"></div>
                <span style="${t.status==='done'?'text-decoration:line-through;color:var(--text-muted);font-size:12px':'font-size:12px'}">${t.name}</span>
                <span class="badge badge-${t.status==='done'?'green':t.status==='partial'?'amber':'violet'}" style="margin-left:auto;font-size:8px">${t.status}</span>
              </div>
            `).join('')}
          </div>
          ${s.assignments.length ? `
            <div style="margin-top:12px;padding:8px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.15);border-radius:var(--radius-sm)">
              ${s.assignments.map(a => `
                <div style="font-size:11px;display:flex;align-items:center;gap:6px">
                  <span>📝</span>
                  <span style="flex:1">${a.name}</span>
                  <span style="color:var(--accent-red);font-weight:600">Due ${Utils.formatDateShort(a.due)}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
          <div style="margin-top:10px;display:flex;gap:6px">
            <button class="btn btn-secondary btn-sm" style="flex:1">Study Now</button>
            <button class="btn btn-ghost btn-sm" onclick="processTADASHICommand('Create study plan for ${s.name}')">🧠</button>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Flashcards + Notes placeholder -->
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-icon" style="background:rgba(124,58,237,0.15)">🗂️</div><div class="card-title">Flashcards</div></div>
        <div class="card-body">
          <div class="empty-state" style="padding:32px">
            <div class="empty-state-icon">🃏</div>
            <div class="empty-state-title">No flashcards yet</div>
            <div class="empty-state-desc">Create flashcards for active revision</div>
            <button class="btn btn-primary btn-sm" style="margin-top:12px">+ Create Flashcard</button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-icon" style="background:rgba(0,212,255,0.1)">📝</div><div class="card-title">Study Sessions</div></div>
        <div class="card-body">
          <div style="text-align:center;padding:12px;margin-bottom:12px">
            <div style="font-size:32px;font-weight:900;color:var(--accent-cyan)">12.5</div>
            <div style="font-size:12px;color:var(--text-muted)">study hours this week</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${[
              {subject:'OS', hours:4.5, date:'Sep 18–19'},
              {subject:'DBMS', hours:3.5, date:'Sep 17–18'},
              {subject:'CN', hours:2.0, date:'Sep 16'},
              {subject:'OS', hours:2.5, date:'Sep 15'},
            ].map(s => `
              <div style="display:flex;align-items:center;gap:10px;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border-subtle)">
                <span class="badge badge-cyan">${s.subject}</span>
                <span style="flex:1;color:var(--text-secondary)">${s.hours} hrs</span>
                <span style="color:var(--text-muted)">${s.date}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  return el;
});
