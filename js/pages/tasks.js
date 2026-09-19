// ============================================================
// Tasks Page — Kanban + List
// ============================================================

let tasksView = 'kanban';

Router.register('tasks', () => {
  const el = document.createElement('div');

  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">✅ Tasks</div>
        <div class="page-subtitle">${DATA.tasks.filter(t=>t.status!=='done').length} pending · ${DATA.tasks.filter(t=>t.status==='done').length} completed</div>
      </div>
      <div style="display:flex;gap:8px">
        <div style="display:flex;background:var(--bg-surface);border-radius:var(--radius-md);padding:4px;border:1px solid var(--border-subtle)">
          <button class="tab ${tasksView==='kanban'?'active':''}" id="view-kanban" onclick="switchTaskView('kanban')" style="flex:0 0 auto;width:auto;padding:5px 12px">Kanban</button>
          <button class="tab ${tasksView==='list'?'active':''}" id="view-list" onclick="switchTaskView('list')" style="flex:0 0 auto;width:auto;padding:5px 12px">List</button>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="processTADASHICommand('Show commitment debt')">📊 Debt</button>
        <button class="btn btn-primary btn-sm" onclick="showAddTaskModal()">+ Add Task</button>
      </div>
    </div>

    <!-- Commitment debt bar -->
    <div class="card" style="margin-bottom:20px;padding:12px 16px">
      <div style="display:flex;align-items:center;gap:14px">
        <span style="font-size:12px;font-weight:700;color:var(--text-muted)">COMMITMENT DEBT</span>
        <div style="flex:1"><div class="progress-track"><div class="progress-fill amber" style="width:42%"></div></div></div>
        <span style="font-size:13px;font-weight:700;color:var(--accent-amber)">4.2/10 Moderate</span>
        <button class="btn btn-ghost btn-sm" onclick="processTADASHICommand('Show commitment debt')">Details →</button>
      </div>
    </div>

    <div id="tasks-board"></div>

    <!-- Add Task Modal -->
    <div class="modal-overlay" id="add-task-modal">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">New Task</span>
          <button class="modal-close" onclick="closeModal('add-task-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Task Title</label>
            <input type="text" class="form-input" placeholder="What needs to be done?" id="new-task-title">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label">Priority</label>
              <select class="form-input" id="new-task-priority">
                <option value="high">High</option>
                <option value="medium" selected>Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Deadline</label>
              <input type="date" class="form-input" id="new-task-deadline">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Project</label>
            <input type="text" class="form-input" placeholder="Study, Finance, Personal..." id="new-task-project">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('add-task-modal')">Cancel</button>
          <button class="btn btn-primary" onclick="addNewTask()">Add Task</button>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => renderTasksBoard(), 10);
  return el;
});

function switchTaskView(view) {
  tasksView = view;
  document.getElementById('view-kanban')?.classList.toggle('active', view==='kanban');
  document.getElementById('view-list')?.classList.toggle('active', view==='list');
  renderTasksBoard();
}

function renderTasksBoard() {
  const board = document.getElementById('tasks-board');
  if (!board) return;

  if (tasksView === 'kanban') {
    const cols = [
      { id:'todo', label:'To Do', color:'var(--text-muted)', tasks: DATA.tasks.filter(t=>t.status==='todo') },
      { id:'in-progress', label:'In Progress', color:'var(--accent-cyan)', tasks: DATA.tasks.filter(t=>t.status==='in-progress') },
      { id:'done', label:'Done', color:'var(--accent-green)', tasks: DATA.tasks.filter(t=>t.status==='done') },
    ];

    board.innerHTML = `
      <div class="kanban-board">
        ${cols.map(col => `
          <div class="kanban-column">
            <div class="kanban-col-header">
              <span class="kanban-col-title" style="color:${col.color}">${col.label}</span>
              <span class="kanban-col-count">${col.tasks.length}</span>
            </div>
            <div class="kanban-col-body">
              ${col.tasks.map(t => `
                <div class="kanban-card" onclick="toggleTaskStatus(${t.id})">
                  <div class="kanban-card-title">${t.title}</div>
                  <div class="kanban-card-meta">
                    <span class="badge badge-${Utils.priorityColor(t.priority)}">${t.priority}</span>
                    ${t.deadline ? `<span style="font-size:10px;color:${Utils.deadlineColor(t.deadline)}">📅 ${Utils.formatDateShort(t.deadline)}</span>` : ''}
                    <span style="font-size:10px;color:var(--text-muted)">${t.project}</span>
                  </div>
                  ${t.tags?.length ? `<div class="tags" style="margin-top:6px">${t.tags.map(tag=>`<span class="tag">${tag}</span>`).join('')}</div>` : ''}
                </div>
              `).join('')}
              <button style="width:100%;padding:8px;background:var(--bg-glass-light);border:1px dashed var(--border-subtle);border-radius:var(--radius-md);color:var(--text-muted);font-size:12px;cursor:pointer;transition:all 0.15s" onmouseover="this.style.background='var(--bg-elevated)'" onmouseout="this.style.background='var(--bg-glass-light)'" onclick="showAddTaskModal()">+ Add task</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    board.innerHTML = `
      <div class="card">
        <table class="data-table">
          <thead><tr><th></th><th>Task</th><th>Priority</th><th>Project</th><th>Deadline</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${DATA.tasks.map(t => `
              <tr>
                <td><div style="width:16px;height:16px;border-radius:4px;border:2px solid ${t.status==='done'?'var(--accent-green)':'var(--border-glass)'};background:${t.status==='done'?'var(--accent-green)':'transparent'};display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;font-size:9px" onclick="toggleTaskStatus(${t.id})">${t.status==='done'?'✓':''}</div></td>
                <td style="font-weight:500;${t.status==='done'?'text-decoration:line-through;color:var(--text-muted)':''}">${t.title}</td>
                <td><span class="badge badge-${Utils.priorityColor(t.priority)}">${t.priority}</span></td>
                <td style="font-size:12px;color:var(--text-muted)">${t.project}</td>
                <td style="font-size:12px;color:${Utils.deadlineColor(t.deadline)}">${t.deadline?Utils.formatDateShort(t.deadline):'—'}</td>
                <td><span class="badge badge-${Utils.statusColor(t.status)}">${t.status}</span></td>
                <td><button class="btn btn-ghost btn-sm" onclick="DATA.tasks=DATA.tasks.filter(x=>x.id!==${t.id});renderTasksBoard()">🗑</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

function toggleTaskStatus(id) {
  const t = DATA.tasks.find(t=>t.id===id);
  if (!t) return;
  const cycle = { 'todo':'in-progress', 'in-progress':'done', 'done':'todo' };
  t.status = cycle[t.status];
  renderTasksBoard();
}

function showAddTaskModal() {
  document.getElementById('add-task-modal')?.classList.add('open');
}

function addNewTask() {
  const title = document.getElementById('new-task-title')?.value?.trim();
  if (!title) return;
  DATA.tasks.unshift({
    id: Date.now(), title,
    status:'todo',
    priority: document.getElementById('new-task-priority')?.value || 'medium',
    deadline: document.getElementById('new-task-deadline')?.value || null,
    project: document.getElementById('new-task-project')?.value || 'Personal',
    tags:[]
  });
  closeModal('add-task-modal');
  renderTasksBoard();
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}
