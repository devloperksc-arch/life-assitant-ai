// ============================================================
// TADASHI DB — Persistent LocalStorage Database
// All 22 life domains. Seeds from DATA on first launch.
// Every write auto-saves and triggers onChange callbacks.
// ============================================================

const DB = (() => {
  const STORAGE_KEY = 'tadashi_lifeos_db';

  let _state = null;
  let _listeners = [];
  let _undoStack = [];

  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { _state = JSON.parse(raw); }
    } catch(e) { _state = null; }
    if (!_state) {
      _state = JSON.parse(JSON.stringify(DATA));
      _save();
    }
  }

  function _save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_state)); }
    catch(e) { console.warn('TADASHI DB: localStorage write failed', e); }
  }

  function _emit(domain, action, payload) {
    _listeners.forEach(fn => { try { fn({ domain, action, payload }); } catch(e) {} });
  }

  function _pushUndo() { _undoStack.push(JSON.parse(JSON.stringify(_state))); if (_undoStack.length > 20) _undoStack.shift(); }

  let _idCounter = Date.now();
  function _nextId() { return ++_idCounter; }

  const api = {
    init() { _load(); return this; },

    reset() {
      _pushUndo();
      try {
        localStorage.setItem('tadashi_pre_reset_backup', JSON.stringify(_state));
      } catch(e) {}
      _state = JSON.parse(JSON.stringify(DATA));
      _save();
      _emit('all','reset',null);
    },

    restorePreResetBackup() {
      const b = localStorage.getItem('tadashi_pre_reset_backup');
      if (!b) return false;
      try {
        _pushUndo();
        _state = JSON.parse(b);
        _save();
        _emit('all', 'restore', null);
        return true;
      } catch(e) { return false; }
    },

    hasPreResetBackup() {
      return !!localStorage.getItem('tadashi_pre_reset_backup');
    },

    importState(newState) {
      if (!newState || typeof newState !== 'object') return false;
      _pushUndo();
      try {
        localStorage.setItem('tadashi_pre_import_backup', JSON.stringify(_state));
      } catch(e) {}
      _state = JSON.parse(JSON.stringify(newState));
      _save();
      _emit('all', 'import', null);
      return true;
    },

    undo() {
      if (!_undoStack.length) return false;
      _state = _undoStack.pop(); _save(); _emit('all','undo',null); return true;
    },

    onChange(fn) { _listeners.push(fn); },
    getAll() { return JSON.parse(JSON.stringify(_state)); },

    // ============================================================
    // USER / LIFE STATE
    // ============================================================
    user: {
      get() { return { ..._state.user }; },
      update(patch) { _pushUndo(); Object.assign(_state.user, patch); _save(); _emit('user','update',patch); }
    },
    lifeState: {
      get() { return { ..._state.lifeState }; },
      update(patch) { _pushUndo(); Object.assign(_state.lifeState, patch); _save(); _emit('lifeState','update',patch); }
    },

    // ============================================================
    // TASKS & PROJECTS (Domain 04)
    // ============================================================
    tasks: {
      list(filter) {
        let t = _state.tasks || [];
        if (filter === 'pending') t = t.filter(x => x.status !== 'done');
        if (filter === 'done')    t = t.filter(x => x.status === 'done');
        if (filter === 'today')   { const td = new Date().toISOString().split('T')[0]; t = t.filter(x => x.deadline === td); }
        return JSON.parse(JSON.stringify(t));
      },
      get(id) { return JSON.parse(JSON.stringify(_state.tasks.find(t => t.id == id) || null)); },
      search(q) { const lq = q.toLowerCase(); return _state.tasks.filter(t => t.title.toLowerCase().includes(lq) || (t.project||'').toLowerCase().includes(lq)); },
      add(item) {
        _pushUndo();
        const n = { id: _nextId(), status:'todo', priority:'medium', createdAt: new Date().toISOString(), ...item };
        _state.tasks.push(n); _save(); _emit('tasks','add',n); return n;
      },
      update(id, patch) {
        _pushUndo();
        const t = _state.tasks.find(t => t.id == id); if (!t) return null;
        Object.assign(t, patch); _save(); _emit('tasks','update',{id,patch}); return { ...t };
      },
      delete(id) {
        _pushUndo();
        const i = _state.tasks.findIndex(t => t.id == id); if (i < 0) return false;
        const removed = _state.tasks.splice(i,1)[0]; _save(); _emit('tasks','delete',{id}); return removed;
      },
      markDone(id) { return api.tasks.update(id, { status:'done', completedAt: new Date().toISOString() }); }
    },

    // ============================================================
    // GOALS & OKRs (Domain 05)
    // ============================================================
    goals: {
      list() { return JSON.parse(JSON.stringify(_state.goals || [])); },
      get(id) { return JSON.parse(JSON.stringify(_state.goals.find(g => g.id == id) || null)); },
      add(item) {
        _pushUndo();
        const n = { id: _nextId(), status:'active', progress:0, milestones:[], ...item };
        _state.goals.push(n); _save(); _emit('goals','add',n); return n;
      },
      update(id, patch) {
        _pushUndo();
        const g = _state.goals.find(g => g.id == id); if (!g) return null;
        Object.assign(g, patch); _save(); _emit('goals','update',{id,patch}); return { ...g };
      },
      delete(id) {
        _pushUndo();
        const i = _state.goals.findIndex(g => g.id == id); if (i < 0) return false;
        _state.goals.splice(i,1); _save(); _emit('goals','delete',{id}); return true;
      },
      updateProgress(id, progress) { return api.goals.update(id, { progress }); },
      completeMilestone(goalId, milestoneTitle) {
        _pushUndo();
        const g = _state.goals.find(g => g.id == goalId); if (!g) return null;
        const m = g.milestones.find(m => m.title.toLowerCase().includes(milestoneTitle.toLowerCase()));
        if (m) m.done = true; _save(); _emit('goals','milestone',{goalId,milestoneTitle}); return { ...g };
      }
    },

    // ============================================================
    // CALENDAR (Domain 03)
    // ============================================================
    calendar: {
      list(date) {
        let evts = _state.calendarEvents || [];
        if (date) evts = evts.filter(e => e.date === date);
        return JSON.parse(JSON.stringify(evts));
      },
      add(item) {
        _pushUndo();
        const n = { id: _nextId(), color:'cyan', ...item };
        _state.calendarEvents.push(n); _save(); _emit('calendar','add',n); return n;
      },
      update(id, patch) {
        _pushUndo();
        const e = _state.calendarEvents.find(e => e.id == id); if (!e) return null;
        Object.assign(e, patch); _save(); _emit('calendar','update',{id,patch}); return { ...e };
      },
      delete(id) {
        _pushUndo();
        const i = _state.calendarEvents.findIndex(e => e.id == id); if (i < 0) return false;
        _state.calendarEvents.splice(i,1); _save(); _emit('calendar','delete',{id}); return true;
      }
    },

    // ============================================================
    // STUDY & LEARNING (Domain 06)
    // ============================================================
    study: {
      list() { return JSON.parse(JSON.stringify(_state.study.subjects || [])); },
      getSubject(id) { return JSON.parse(JSON.stringify(_state.study.subjects.find(s => s.id == id) || null)); },
      addSubject(s) {
        _pushUndo();
        const n = { id: _nextId(), progress:0, topics:[], assignments:[], ...s };
        _state.study.subjects.push(n); _save(); _emit('study','addSubject',n); return n;
      },
      updateTopic(subjectId, topicName, status) {
        _pushUndo();
        const subj = _state.study.subjects.find(s => s.id == subjectId); if (!subj) return null;
        const t = subj.topics.find(t => t.name.toLowerCase().includes(topicName.toLowerCase()));
        if (t) t.status = status; else subj.topics.push({ name: topicName, status });
        _save(); _emit('study','updateTopic',{subjectId,topicName,status}); return { ...subj };
      },
      updateProgress(subjectId, progress) {
        _pushUndo();
        const subj = _state.study.subjects.find(s => s.id == subjectId); if (!subj) return null;
        subj.progress = progress; _save(); _emit('study','progress',{subjectId,progress}); return { ...subj };
      }
    },

    // ============================================================
    // FITNESS & HEALTH (Domain 07)
    // ============================================================
    fitness: {
      get() { return JSON.parse(JSON.stringify(_state.fitness)); },
      logWorkout(w) {
        _pushUndo();
        const n = { id: _nextId(), date: new Date().toISOString().split('T')[0], status:'done', exercises:[], ...w };
        _state.fitness.workouts.push(n);
        _state.fitness.weekDone = (_state.fitness.weekDone || 0) + 1;
        _state.fitness.currentStreak = (_state.fitness.currentStreak || 0) + 1;
        _save(); _emit('fitness','logWorkout',n); return n;
      },
      updateMeasurements(patch) {
        _pushUndo(); Object.assign(_state.fitness.measurements, patch);
        _save(); _emit('fitness','measurements',patch); return { ..._state.fitness.measurements };
      },
      addPR(pr) {
        _pushUndo();
        _state.fitness.prs.unshift({ date: new Date().toISOString().split('T')[0], ...pr });
        _save(); _emit('fitness','pr',pr); return pr;
      }
    },

    // ============================================================
    // NUTRITION & DIET (Domain 08)
    // ============================================================
    nutrition: {
      get() { return JSON.parse(JSON.stringify(_state.nutrition)); },
      logMeal(meal) {
        _pushUndo();
        const n = { id: _nextId(), ...meal };
        _state.nutrition.meals.push(n);
        _state.nutrition.today.calories = (_state.nutrition.today.calories || 0) + (meal.calories || 0);
        _state.nutrition.today.protein  = (_state.nutrition.today.protein  || 0) + (meal.protein  || 0);
        _save(); _emit('nutrition','logMeal',n); return n;
      },
      updateToday(patch) {
        _pushUndo(); Object.assign(_state.nutrition.today, patch);
        _save(); _emit('nutrition','updateToday',patch);
      },
      setWater(liters) {
        _pushUndo(); _state.nutrition.today.water = liters;
        _save(); _emit('nutrition','water',{liters});
      }
    },

    // ============================================================
    // FINANCE & WEALTH (Domain 09)
    // ============================================================
    finance: {
      get() { return JSON.parse(JSON.stringify(_state.finance)); },
      addTransaction(t) {
        _pushUndo();
        const n = { id: _nextId(), date: new Date().toISOString().split('T')[0], ...t };
        _state.finance.transactions.unshift(n);
        _state.finance.balance = (_state.finance.balance || 0) + (n.amount || 0);
        if (n.amount < 0) {
          _state.finance.monthlyExpenses = (_state.finance.monthlyExpenses || 0) + Math.abs(n.amount);
          const cat = (_state.finance.budgets || []).find(b => b.category.toLowerCase() === (n.category||'').toLowerCase());
          if (cat) cat.spent = (cat.spent || 0) + Math.abs(n.amount);
        } else {
          _state.finance.savings = (_state.finance.savings || 0) + n.amount;
        }
        _save(); _emit('finance','addTransaction',n); return n;
      },
      deleteTransaction(id) {
        _pushUndo();
        const i = _state.finance.transactions.findIndex(t => t.id == id); if (i < 0) return false;
        _state.finance.transactions.splice(i,1); _save(); _emit('finance','deleteTransaction',{id}); return true;
      },
      updateBudget(category, patch) {
        _pushUndo();
        const b = (_state.finance.budgets || []).find(b => b.category.toLowerCase() === category.toLowerCase());
        if (b) Object.assign(b, patch); else _state.finance.budgets.push({ category, spent:0, limit:0, ...patch });
        _save(); _emit('finance','updateBudget',{category,patch});
      },
      setSavings(amount) {
        _pushUndo(); _state.finance.savings = amount; _save(); _emit('finance','savings',{amount});
      }
    },

    // ============================================================
    // WELLBEING & MOOD (Domain 10)
    // ============================================================
    wellbeing: {
      get() { return JSON.parse(JSON.stringify(_state.wellbeing)); },
      setMood(score) {
        _pushUndo(); _state.wellbeing.todayMood = score;
        _state.wellbeing.moodHistory.push(score);
        if (_state.wellbeing.moodHistory.length > 14) _state.wellbeing.moodHistory.shift();
        _save(); _emit('wellbeing','mood',{score});
      },
      setStress(level) {
        _pushUndo(); _state.wellbeing.stressLevel = level; _save(); _emit('wellbeing','stress',{level});
      },
      logBreak(b) {
        _pushUndo(); _state.wellbeing.breaks.push({...b}); _save(); _emit('wellbeing','break',b);
      }
    },

    // ============================================================
    // SHOPPING & INVENTORY (Domain 11)
    // ============================================================
    shopping: {
      get() { return JSON.parse(JSON.stringify(_state.shopping)); },
      addGrocery(item) {
        _pushUndo(); _state.shopping.groceries.push({ status:'pending', ...item });
        _save(); _emit('shopping','addGrocery',item);
      },
      completeGrocery(itemName) {
        _pushUndo();
        const i = _state.shopping.groceries.find(g => g.item.toLowerCase().includes(itemName.toLowerCase()));
        if (i) i.status = 'done'; _save(); _emit('shopping','completeGrocery',{itemName});
      },
      deleteGrocery(itemName) {
        _pushUndo();
        _state.shopping.groceries = _state.shopping.groceries.filter(g => !g.item.toLowerCase().includes(itemName.toLowerCase()));
        _save(); _emit('shopping','deleteGrocery',{itemName});
      },
      addWishlist(item) {
        _pushUndo(); _state.shopping.wishlist.push({ priority:'medium', ...item });
        _save(); _emit('shopping','addWishlist',item);
      },
      deleteWishlist(itemName) {
        _pushUndo();
        _state.shopping.wishlist = _state.shopping.wishlist.filter(w => !w.item.toLowerCase().includes(itemName.toLowerCase()));
        _save(); _emit('shopping','deleteWishlist',{itemName});
      }
    },

    // ============================================================
    // RELATIONSHIPS (Domain 12)
    // ============================================================
    relationships: {
      list() { return JSON.parse(JSON.stringify(_state.relationships || [])); },
      add(r) {
        _pushUndo();
        const n = { id: _nextId(), lastContact: new Date().toISOString().split('T')[0], ...r };
        _state.relationships.push(n); _save(); _emit('relationships','add',n); return n;
      },
      update(id, patch) {
        _pushUndo();
        const r = _state.relationships.find(r => r.id == id); if (!r) return null;
        Object.assign(r, patch); _save(); _emit('relationships','update',{id,patch}); return { ...r };
      },
      delete(id) {
        _pushUndo(); _state.relationships = _state.relationships.filter(r => r.id != id);
        _save(); _emit('relationships','delete',{id}); return true;
      },
      markContacted(id) { return api.relationships.update(id, { lastContact: new Date().toISOString().split('T')[0] }); }
    },

    // ============================================================
    // HOME CARE (Domain 13)
    // ============================================================
    homeModule: {
      get() { return JSON.parse(JSON.stringify(_state.homeModule)); },
      updateChore(taskName, patch) {
        _pushUndo();
        const c = _state.homeModule.chores.find(c => c.task.toLowerCase().includes(taskName.toLowerCase()));
        if (c) Object.assign(c, patch); else _state.homeModule.chores.push({ task: taskName, ...patch });
        _save(); _emit('homeModule','chore',{taskName,patch});
      },
      markChoreDone(taskName) {
        return api.homeModule.updateChore(taskName, { status:'ok', lastDone: new Date().toISOString().split('T')[0] });
      },
      addUtility(u) {
        _pushUndo(); _state.homeModule.utilities.push({...u}); _save(); _emit('homeModule','utility',u);
      }
    },

    // ============================================================
    // VEHICLE CARE (Domain 14)
    // ============================================================
    vehicle: {
      get() { return JSON.parse(JSON.stringify(_state.vehicle)); },
      update(patch) { _pushUndo(); Object.assign(_state.vehicle, patch); _save(); _emit('vehicle','update',patch); },
      logFuel(log) {
        _pushUndo();
        const n = { date: new Date().toISOString().split('T')[0], ...log };
        _state.vehicle.fuelLogs.unshift(n); _save(); _emit('vehicle','fuel',n); return n;
      }
    },

    // ============================================================
    // TRAVEL & TRIPS (Domain 15)
    // ============================================================
    travel: {
      list() { return JSON.parse(JSON.stringify(_state.travel.trips || [])); },
      addTrip(t) {
        _pushUndo();
        const n = { id: _nextId(), status:'planned', spent:0, itinerary:[], packing:[], ...t };
        _state.travel.trips.push(n); _save(); _emit('travel','addTrip',n); return n;
      },
      update(id, patch) {
        _pushUndo();
        const t = _state.travel.trips.find(t => t.id == id); if (!t) return null;
        Object.assign(t, patch); _save(); _emit('travel','update',{id,patch}); return { ...t };
      },
      delete(id) {
        _pushUndo(); _state.travel.trips = _state.travel.trips.filter(t => t.id != id);
        _save(); _emit('travel','delete',{id}); return true;
      }
    },

    // ============================================================
    // ENTERTAINMENT (Domain 16)
    // ============================================================
    entertainment: {
      list(type) {
        let e = _state.entertainment || [];
        if (type) e = e.filter(x => x.type.toLowerCase() === type.toLowerCase());
        return JSON.parse(JSON.stringify(e));
      },
      add(item) {
        _pushUndo();
        const n = { id: _nextId(), ...item };
        _state.entertainment.push(n); _save(); _emit('entertainment','add',n); return n;
      },
      update(id, patch) {
        _pushUndo();
        const e = _state.entertainment.find(e => e.id == id); if (!e) return null;
        Object.assign(e, patch); _save(); _emit('entertainment','update',{id,patch}); return { ...e };
      },
      delete(id) {
        _pushUndo(); _state.entertainment = _state.entertainment.filter(e => e.id != id);
        _save(); _emit('entertainment','delete',{id}); return true;
      }
    },

    // ============================================================
    // DOCUMENT VAULT (Domain 17)
    // ============================================================
    documents: {
      list() { return JSON.parse(JSON.stringify(_state.documents || [])); },
      add(d) {
        _pushUndo();
        const n = { id: _nextId(), date: new Date().toISOString().split('T')[0], tags:[], ...d };
        _state.documents.push(n); _save(); _emit('documents','add',n); return n;
      },
      delete(id) {
        _pushUndo(); _state.documents = _state.documents.filter(d => d.id != id);
        _save(); _emit('documents','delete',{id}); return true;
      }
    },

    // ============================================================
    // KNOWLEDGE BASE (Domain 18)
    // ============================================================
    knowledge: {
      list(tag) {
        let notes = _state.knowledge || [];
        if (tag) notes = notes.filter(n => n.tags && n.tags.includes(tag));
        return JSON.parse(JSON.stringify(notes));
      },
      search(q) {
        const lq = q.toLowerCase();
        return (_state.knowledge || []).filter(n => n.title.toLowerCase().includes(lq) || (n.preview||'').toLowerCase().includes(lq));
      },
      add(note) {
        _pushUndo();
        const n = { id: _nextId(), date: new Date().toISOString().split('T')[0], tags:[], type:'Note', ...note };
        _state.knowledge.push(n); _save(); _emit('knowledge','add',n); return n;
      },
      update(id, patch) {
        _pushUndo();
        const n = _state.knowledge.find(n => n.id == id); if (!n) return null;
        Object.assign(n, patch); _save(); _emit('knowledge','update',{id,patch}); return { ...n };
      },
      delete(id) {
        _pushUndo(); _state.knowledge = _state.knowledge.filter(n => n.id != id);
        _save(); _emit('knowledge','delete',{id}); return true;
      }
    },

    // ============================================================
    // ROUTINES & HABITS (Domain 19)
    // ============================================================
    routines: {
      get() { return JSON.parse(JSON.stringify(_state.routines)); },
      markDone(type, taskName) {
        _pushUndo();
        const list = _state.routines[type]; if (!list) return null;
        const t = list.find(r => r.task.toLowerCase().includes(taskName.toLowerCase()));
        if (t) t.done = true; _save(); _emit('routines','markDone',{type,taskName});
        return t ? { ...t } : null;
      },
      resetDay() {
        _pushUndo();
        ['morning','night'].forEach(k => { (_state.routines[k] || []).forEach(r => r.done = false); });
        _save(); _emit('routines','reset',null);
      },
      addStep(type, step) {
        _pushUndo();
        if (!_state.routines[type]) _state.routines[type] = [];
        _state.routines[type].push({ done:false, ...step });
        _save(); _emit('routines','addStep',{type,step});
      }
    },

    // ============================================================
    // DIGITAL LIFE (Domain 20)
    // ============================================================
    digitalLife: {
      get() { return JSON.parse(JSON.stringify(_state.digitalLife)); },
      addSubscription(sub) {
        _pushUndo(); _state.digitalLife.subscriptions.push({ status:'active', ...sub });
        _save(); _emit('digitalLife','add',sub);
      },
      deleteSubscription(name) {
        _pushUndo();
        _state.digitalLife.subscriptions = _state.digitalLife.subscriptions.filter(s => !s.name.toLowerCase().includes(name.toLowerCase()));
        _save(); _emit('digitalLife','delete',{name});
      },
      updateSubscription(name, patch) {
        _pushUndo();
        const s = _state.digitalLife.subscriptions.find(s => s.name.toLowerCase().includes(name.toLowerCase()));
        if (s) Object.assign(s, patch); _save(); _emit('digitalLife','update',{name,patch});
      }
    },

    // ============================================================
    // ANALYTICS (Domain 21)
    // ============================================================
    analytics: {
      get() { return JSON.parse(JSON.stringify(_state.analytics)); },
      record(domain, value) {
        _pushUndo();
        if (_state.analytics[domain]) {
          _state.analytics[domain].push(value);
          if (_state.analytics[domain].length > 7) _state.analytics[domain].shift();
        }
        _save(); _emit('analytics','record',{domain,value});
      }
    },

    // ============================================================
    // AI SUMMARY — rich context snapshot for Gemini system prompt
    // ============================================================
    buildAISummary() {
      const s = _state;
      const today = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
      const pendingTasks = (s.tasks || []).filter(t => t.status !== 'done').slice(0, 10)
        .map(t => `  - [${t.priority}] ${t.title} (due: ${t.deadline || 'no date'}, project: ${t.project || 'General'})`).join('\n');
      const goals = (s.goals || []).slice(0, 5)
        .map(g => `  - ${g.emoji || ''} ${g.title}: ${g.progress}% complete (target: ${g.target})`).join('\n');
      const recentTx = (s.finance.transactions || []).slice(0, 5)
        .map(t => `    ${t.name}: ${t.amount > 0 ? '+' : ''}₹${t.amount} (${t.category}, ${t.date})`).join('\n');
      const subjects = (s.study.subjects || [])
        .map(sub => `  - ${sub.name} [${sub.code}]: ${sub.progress}% done (exam: ${sub.examDate})`).join('\n');
      const recentWorkouts = (s.fitness.workouts || []).slice(-3)
        .map(w => `  - ${w.date}: ${w.name}, ${w.duration}min (${w.status})`).join('\n');
      const subsList = (s.digitalLife.subscriptions || []).filter(x => x.status === 'active')
        .map(x => `  - ${x.name}: ₹${x.amount}/${x.period}`).join('\n');

      return `
TADASHI LIVE DATA SNAPSHOT — ${today}

[USER]
Name: ${s.user.name} | LifeScore: ${s.user.lifeScore}/100 | Energy: ${s.user.energyScore}%

[TASKS — ${(s.tasks||[]).filter(t=>t.status!=='done').length} pending, ${(s.tasks||[]).filter(t=>t.status==='done').length} done]
${pendingTasks || '  None'}

[GOALS]
${goals || '  None tracked'}

[STUDY]
${subjects || '  None'}

[FINANCE]
  Balance: ₹${s.finance.balance} | Income: ₹${s.finance.monthlyIncome}/mo | Expenses: ₹${s.finance.monthlyExpenses}/mo
  Savings: ₹${s.finance.savings} / ₹${s.finance.savingsGoal} goal
  Recent transactions:
${recentTx || '  None'}

[FITNESS]
  Weight: ${s.fitness.measurements.weight}kg | Height: ${s.fitness.measurements.height}cm | Body Fat: ${s.fitness.measurements.bodyFat}%
  Streak: ${s.fitness.currentStreak} days | Week: ${s.fitness.weekDone}/${s.fitness.weeklyGoal} sessions
  Recent workouts:
${recentWorkouts || '  None'}

[NUTRITION TODAY]
  Calories: ${s.nutrition.today.calories}/${s.nutrition.today.target}kcal | Protein: ${s.nutrition.today.protein}g/${s.nutrition.today.proteinTarget}g | Water: ${s.nutrition.today.water}L/${s.nutrition.today.waterTarget}L
  Meals logged: ${s.nutrition.meals.length}

[WELLBEING]
  Today's mood: ${s.wellbeing.todayMood || 'Not logged'}/5 | Stress: ${s.wellbeing.stressLevel}/5
  Weekly check-ins: ${s.wellbeing.weeklyCheckins}

[ROUTINES]
  Morning: ${(s.routines.morning||[]).filter(r=>r.done).length}/${(s.routines.morning||[]).length} done
  Night: ${(s.routines.night||[]).filter(r=>r.done).length}/${(s.routines.night||[]).length} done

[SHOPPING]
  Groceries pending: ${(s.shopping.groceries||[]).filter(g=>g.status==='pending').length} items
  Wishlist: ${(s.shopping.wishlist||[]).length} items

[RELATIONSHIPS]
  Contacts tracked: ${(s.relationships||[]).length}
  ${(s.relationships||[]).slice(0,3).map(r=>`${r.name} (${r.category}, last contact: ${r.lastContact})`).join(', ')}

[VEHICLE]
  ${s.vehicle.make} ${s.vehicle.model} | Fuel: ${s.vehicle.fuel}% | Next service: ${s.vehicle.nextService}

[DIGITAL LIFE — Active subscriptions]
${subsList || '  None'}

[KNOWLEDGE BASE]
  ${(s.knowledge||[]).length} notes/ideas saved

[ENTERTAINMENT]
  ${(s.entertainment||[]).length} items tracked (books, shows, movies, games)
`.trim();
    }
  };

  api.init();
  return api;
})();

if (typeof window !== 'undefined') {
  window.DB = DB;
}

