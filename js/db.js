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

  const _clone = typeof structuredClone === 'function'
    ? (obj) => (obj === undefined ? undefined : structuredClone(obj))
    : (obj) => (obj === undefined ? undefined : JSON.parse(JSON.stringify(obj)));

  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { _state = JSON.parse(raw); }
    } catch (e) { _state = null; }
    if (!_state) {
      _state = _clone(DATA);
      _save();
    } else if (typeof DATA !== 'undefined') {
      let changed = false;
      for (const k in DATA) {
        if (_state[k] === undefined) {
          _state[k] = _clone(DATA[k]);
          changed = true;
        } else if (typeof DATA[k] === 'object' && DATA[k] !== null && !Array.isArray(DATA[k])) {
          for (const subk in DATA[k]) {
            if (_state[k][subk] === undefined) {
              _state[k][subk] = _clone(DATA[k][subk]);
              changed = true;
            }
          }
        }
      }
      if (_state.vehicle && _state.vehicle.make !== 'Royal Enfield') {
        _state.vehicle = _clone(DATA.vehicle);
        changed = true;
      }
      if (_state.finance && !_state.finance.budgets) {
        _state.finance.budgets = _clone(DATA.finance.budgets);
        _state.finance.travelSavingsFund = DATA.finance.travelSavingsFund;
        changed = true;
      }
      if (_state.shopping && (!_state.shopping.dmartList || !_state.shopping.pantryStock)) {
        _state.shopping.dmartList = _clone(DATA.shopping.dmartList);
        _state.shopping.pantryStock = _clone(DATA.shopping.pantryStock);
        changed = true;
      }
      if (changed) _save();
    }
  }

  let _saveTimer = null;
  function _flushSave() {
    if (_saveTimer) {
      clearTimeout(_saveTimer);
      _saveTimer = null;
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_state)); }
    catch (e) { console.warn('TADASHI DB: localStorage write failed', e); }
  }

  function _save() {
    if (!_saveTimer) {
      _saveTimer = setTimeout(() => {
        _saveTimer = null;
        _flushSave();
      }, 150);
    }
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('pagehide', _flushSave);
    window.addEventListener('beforeunload', _flushSave);
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') _flushSave();
      });
    }
  }

  function _emit(domain, action, payload) {
    _listeners.forEach(fn => { try { fn({ domain, action, payload }); } catch (e) { } });
  }

  function _pushUndo() {
    _undoStack.push(JSON.stringify(_state));
    if (_undoStack.length > 20) _undoStack.shift();
  }

  let _idCounter = Date.now();
  function _nextId() { return ++_idCounter; }

  const api = {
    init() { _load(); return this; },

    reset() {
      _pushUndo();
      _flushSave();
      try {
        localStorage.setItem('tadashi_pre_reset_backup', JSON.stringify(_state));
      } catch (e) { }
      _state = _clone(DATA);
      _flushSave();
      _emit('all', 'reset', null);
    },

    clearMockData() {
      _pushUndo();
      _flushSave();
      try {
        localStorage.setItem('tadashi_pre_clear_backup', JSON.stringify(_state));
      } catch (e) { }
      // Preserve user identity, API keys and core configuration, but clear predicate dummy mock items
      _state.tasks = [];
      _state.goals = [];
      if (_state.study) {
        _state.study.subjects = [];
        _state.study.assignments = [];
      }
      if (_state.finance) {
        _state.finance.transactions = [];
      }
      if (_state.fitness) {
        _state.fitness.workouts = [];
      }
      if (_state.relationships) {
        _state.relationships = [];
      }
      _flushSave();
      _emit('all', 'clearMockData', null);
      return true;
    },

    restorePreClearBackup() {
      const b = localStorage.getItem('tadashi_pre_clear_backup');
      if (!b) return false;
      try {
        _pushUndo();
        _state = JSON.parse(b);
        _flushSave();
        _emit('all', 'restore', null);
        return true;
      } catch (e) { return false; }
    },

    restorePreResetBackup() {
      const b = localStorage.getItem('tadashi_pre_reset_backup');
      if (!b) return false;
      try {
        _pushUndo();
        _state = JSON.parse(b);
        _flushSave();
        _emit('all', 'restore', null);
        return true;
      } catch (e) { return false; }
    },

    hasPreResetBackup() {
      return !!localStorage.getItem('tadashi_pre_reset_backup');
    },

    importState(newState) {
      if (!newState || typeof newState !== 'object') return false;
      _pushUndo();
      _flushSave();
      try {
        localStorage.setItem('tadashi_pre_import_backup', JSON.stringify(_state));
      } catch (e) { }
      _state = _clone(newState);
      _flushSave();
      _emit('all', 'import', null);
      return true;
    },

    undo() {
      if (!_undoStack.length) return false;
      const raw = _undoStack.pop();
      try {
        _state = JSON.parse(raw);
        _flushSave();
        _emit('all', 'undo', null);
        return true;
      } catch (e) { return false; }
    },

    onChange(fn) { _listeners.push(fn); },
    getAll() { _flushSave(); return _clone(_state); },
    flush() { _flushSave(); },

    // ============================================================
    // USER / LIFE STATE
    // ============================================================
    user: {
      get() { return { ..._state.user }; },
      update(patch) { _pushUndo(); Object.assign(_state.user, patch); _save(); _emit('user', 'update', patch); }
    },
    lifeState: {
      get() { return { ..._state.lifeState }; },
      update(patch) { _pushUndo(); Object.assign(_state.lifeState, patch); _save(); _emit('lifeState', 'update', patch); }
    },

    // ============================================================
    // TASKS & PROJECTS (Domain 04)
    // ============================================================
    tasks: {
      list(filter) {
        let t = _state.tasks || [];
        if (filter === 'pending') t = t.filter(x => x.status !== 'done');
        if (filter === 'done') t = t.filter(x => x.status === 'done');
        if (filter === 'today') { const td = new Date().toISOString().split('T')[0]; t = t.filter(x => x.deadline === td); }
        return _clone(t);
      },
      get(id) { return _clone(_state.tasks.find(t => t.id == id) || null); },
      search(q) { const lq = q.toLowerCase(); return _state.tasks.filter(t => t.title.toLowerCase().includes(lq) || (t.project || '').toLowerCase().includes(lq)); },
      add(item) {
        _pushUndo();
        const n = { id: _nextId(), status: 'todo', priority: 'medium', createdAt: new Date().toISOString(), ...item };
        _state.tasks.push(n); _save(); _emit('tasks', 'add', n); return n;
      },
      update(id, patch) {
        _pushUndo();
        const t = _state.tasks.find(t => t.id == id); if (!t) return null;
        Object.assign(t, patch); _save(); _emit('tasks', 'update', { id, patch }); return { ...t };
      },
      delete(id) {
        _pushUndo();
        const i = _state.tasks.findIndex(t => t.id == id); if (i < 0) return false;
        const removed = _state.tasks.splice(i, 1)[0]; _save(); _emit('tasks', 'delete', { id }); return removed;
      },
      markDone(id) { return api.tasks.update(id, { status: 'done', completedAt: new Date().toISOString() }); }
    },

    // ============================================================
    // GOALS & OKRs (Domain 05)
    // ============================================================
    goals: {
      list() { return _clone(_state.goals || []); },
      get(id) { return _clone(_state.goals.find(g => g.id == id) || null); },
      add(item) {
        _pushUndo();
        const n = { id: _nextId(), status: 'active', progress: 0, milestones: [], ...item };
        _state.goals.push(n); _save(); _emit('goals', 'add', n); return n;
      },
      update(id, patch) {
        _pushUndo();
        const g = _state.goals.find(g => g.id == id); if (!g) return null;
        Object.assign(g, patch); _save(); _emit('goals', 'update', { id, patch }); return { ...g };
      },
      delete(id) {
        _pushUndo();
        const i = _state.goals.findIndex(g => g.id == id); if (i < 0) return false;
        _state.goals.splice(i, 1); _save(); _emit('goals', 'delete', { id }); return true;
      },
      updateProgress(id, progress) { return api.goals.update(id, { progress }); },
      completeMilestone(goalId, milestoneTitle) {
        _pushUndo();
        const g = _state.goals.find(g => g.id == goalId); if (!g) return null;
        const m = g.milestones.find(m => m.title.toLowerCase().includes(milestoneTitle.toLowerCase()));
        if (m) m.done = true; _save(); _emit('goals', 'milestone', { goalId, milestoneTitle }); return { ...g };
      }
    },

    // ============================================================
    // CALENDAR (Domain 03)
    // ============================================================
    calendar: {
      list(date) {
        let evts = _state.calendarEvents || [];
        if (date) evts = evts.filter(e => e.date === date);
        return _clone(evts);
      },
      add(item) {
        _pushUndo();
        const n = { id: _nextId(), color: 'cyan', ...item };
        _state.calendarEvents.push(n); _save(); _emit('calendar', 'add', n); return n;
      },
      update(id, patch) {
        _pushUndo();
        const e = _state.calendarEvents.find(e => e.id == id); if (!e) return null;
        Object.assign(e, patch); _save(); _emit('calendar', 'update', { id, patch }); return { ...e };
      },
      delete(id) {
        _pushUndo();
        const i = _state.calendarEvents.findIndex(e => e.id == id); if (i < 0) return false;
        _state.calendarEvents.splice(i, 1); _save(); _emit('calendar', 'delete', { id }); return true;
      }
    },

    // ============================================================
    // STUDY & LEARNING (Domain 06)
    // ============================================================
    study: {
      list() { return _clone(_state.study.subjects || []); },
      getSubject(id) { return _clone(_state.study.subjects.find(s => s.id == id) || null); },
      addSubject(s) {
        _pushUndo();
        const n = { id: _nextId(), progress: 0, topics: [], assignments: [], ...s };
        _state.study.subjects.push(n); _save(); _emit('study', 'addSubject', n); return n;
      },
      updateTopic(subjectId, topicName, status) {
        _pushUndo();
        const subj = _state.study.subjects.find(s => s.id == subjectId); if (!subj) return null;
        const t = subj.topics.find(t => t.name.toLowerCase().includes(topicName.toLowerCase()));
        if (t) t.status = status; else subj.topics.push({ name: topicName, status });
        _save(); _emit('study', 'updateTopic', { subjectId, topicName, status }); return { ...subj };
      },
      updateProgress(subjectId, progress) {
        _pushUndo();
        const subj = _state.study.subjects.find(s => s.id == subjectId); if (!subj) return null;
        subj.progress = progress; _save(); _emit('study', 'progress', { subjectId, progress }); return { ...subj };
      }
    },

    // ============================================================
    // FITNESS & HEALTH (Domain 07)
    // ============================================================
    fitness: {
      get() { return _clone(_state.fitness); },
      logWorkout(w) {
        _pushUndo();
        const n = { id: _nextId(), date: new Date().toISOString().split('T')[0], status: 'done', exercises: [], ...w };
        _state.fitness.workouts.push(n);
        _state.fitness.weekDone = (_state.fitness.weekDone || 0) + 1;
        _state.fitness.currentStreak = (_state.fitness.currentStreak || 0) + 1;
        _save(); _emit('fitness', 'logWorkout', n); return n;
      },
      updateMeasurements(patch) {
        _pushUndo(); Object.assign(_state.fitness.measurements, patch);
        _save(); _emit('fitness', 'measurements', patch); return { ..._state.fitness.measurements };
      },
      addPR(pr) {
        _pushUndo();
        _state.fitness.prs.unshift({ date: new Date().toISOString().split('T')[0], ...pr });
        _save(); _emit('fitness', 'pr', pr); return pr;
      }
    },

    // ============================================================
    // NUTRITION & DIET (Domain 08)
    // ============================================================
    nutrition: {
      get() { return _clone(_state.nutrition); },
      logMeal(meal) {
        _pushUndo();
        const n = { id: _nextId(), ...meal };
        _state.nutrition.meals.push(n);
        _state.nutrition.today.calories = (_state.nutrition.today.calories || 0) + (meal.calories || 0);
        _state.nutrition.today.protein = (_state.nutrition.today.protein || 0) + (meal.protein || 0);
        _save(); _emit('nutrition', 'logMeal', n); return n;
      },
      updateToday(patch) {
        _pushUndo(); Object.assign(_state.nutrition.today, patch);
        _save(); _emit('nutrition', 'updateToday', patch);
      },
      setWater(liters) {
        _pushUndo(); _state.nutrition.today.water = liters;
        _save(); _emit('nutrition', 'water', { liters });
      }
    },

    // ============================================================
    // ============================================================
    // FINANCE & WEALTH (Domain 09)
    // ============================================================
    finance: {
      get() { return _clone(_state.finance); },
      addTransaction(t) {
        _pushUndo();
        const n = { id: _nextId(), date: new Date().toISOString().split('T')[0], ...t };
        _state.finance.transactions.unshift(n);
        _state.finance.balance = (_state.finance.balance || 0) + (n.amount || 0);
        if (n.amount < 0) {
          _state.finance.monthlyExpenses = (_state.finance.monthlyExpenses || 0) + Math.abs(n.amount);
          const cat = (_state.finance.budgets || []).find(b => b.category.toLowerCase() === (n.category || '').toLowerCase());
          if (cat) cat.spent = (cat.spent || 0) + Math.abs(n.amount);
        } else {
          _state.finance.savings = (_state.finance.savings || 0) + n.amount;
        }
        _save(); _emit('finance', 'addTransaction', n); return n;
      },
      deleteTransaction(id) {
        _pushUndo();
        const i = _state.finance.transactions.findIndex(t => t.id == id); if (i < 0) return false;
        _state.finance.transactions.splice(i, 1); _save(); _emit('finance', 'deleteTransaction', { id }); return true;
      },
      updateBudget(category, patch) {
        _pushUndo();
        const b = (_state.finance.budgets || []).find(b => b.category.toLowerCase() === category.toLowerCase());
        if (b) Object.assign(b, patch); else _state.finance.budgets.push({ id: 'b-' + _nextId(), category, spent: 0, limit: 0, ...patch });
        _save(); _emit('finance', 'updateBudget', { category, patch });
      },
      setSavings(amount) {
        _pushUndo(); _state.finance.savings = amount; _save(); _emit('finance', 'savings', { amount });
      },
      allocateToTravel(amount) {
        _pushUndo();
        _state.finance.travelSavingsFund = (_state.finance.travelSavingsFund || 0) + amount;
        if (_state.travel && _state.travel.trips && _state.travel.trips[0]) {
          _state.travel.trips[0].savedFromFinance = (_state.travel.trips[0].savedFromFinance || 0) + amount;
        }
        _save(); _emit('finance', 'allocateTravel', { amount });
      }
    },

    // ============================================================
    // WELLBEING & MOOD (Domain 10)
    // ============================================================
    wellbeing: {
      get() { return _clone(_state.wellbeing); },
      setMood(score) {
        _pushUndo(); _state.wellbeing.todayMood = score;
        _state.wellbeing.moodHistory.push(score);
        if (_state.wellbeing.moodHistory.length > 14) _state.wellbeing.moodHistory.shift();
        _save(); _emit('wellbeing', 'mood', { score });
      },
      setStress(level) {
        _pushUndo(); _state.wellbeing.stressLevel = level; _save(); _emit('wellbeing', 'stress', { level });
      },
      logBreak(b) {
        _pushUndo(); _state.wellbeing.breaks.push({ ...b }); _save(); _emit('wellbeing', 'break', b);
      }
    },

    // ============================================================
    // SHOPPING & INVENTORY (Domain 11)
    // ============================================================
    shopping: {
      get() { return _clone(_state.shopping); },
      toggleDmartItem(id) {
        _pushUndo();
        const list = _state.shopping.dmartList || [];
        const item = list.find(i => i.id == id);
        if (item) item.checked = !item.checked;
        _save(); _emit('shopping', 'toggleDmart', { id });
      },
      addDmartItem(item) {
        _pushUndo();
        if (!_state.shopping.dmartList) _state.shopping.dmartList = [];
        const n = { id: _nextId(), checked: false, ...item };
        _state.shopping.dmartList.unshift(n);
        _save(); _emit('shopping', 'addDmart', n);
        return n;
      },
      deleteDmartItem(id) {
        _pushUndo();
        if (_state.shopping.dmartList) {
          _state.shopping.dmartList = _state.shopping.dmartList.filter(i => i.id != id);
        }
        _save(); _emit('shopping', 'deleteDmart', { id });
      },
      clearCheckedDmart() {
        _pushUndo();
        if (_state.shopping.dmartList) {
          _state.shopping.dmartList = _state.shopping.dmartList.filter(i => !i.checked);
        }
        _save(); _emit('shopping', 'clearChecked', null);
      },
      markPantryFinished(id) {
        _pushUndo();
        const p = (_state.shopping.pantryStock || []).find(i => i.id == id);
        if (p) {
          p.status = 'Out of Stock';
          if (!_state.shopping.dmartList) _state.shopping.dmartList = [];
          const exists = _state.shopping.dmartList.find(d => d.item.toLowerCase() === p.item.toLowerCase());
          if (!exists) {
            _state.shopping.dmartList.unshift({ id: _nextId(), item: p.item, category: p.category || 'Groceries', qty: '1 pk', estPrice: 200, urgency: 'high', checked: false });
          }
        }
        _save(); _emit('shopping', 'pantryFinished', { id });
      },
      addWishlist(item) {
        _pushUndo();
        if (!_state.shopping.wishlist) _state.shopping.wishlist = [];
        _state.shopping.wishlist.push({ priority: 'medium', ...item });
        _save(); _emit('shopping', 'addWishlist', item);
      },
      deleteWishlist(itemName) {
        _pushUndo();
        if (_state.shopping.wishlist) {
          _state.shopping.wishlist = _state.shopping.wishlist.filter(w => !w.item.toLowerCase().includes(itemName.toLowerCase()));
        }
        _save(); _emit('shopping', 'deleteWishlist', { itemName });
      }
    },

    // ============================================================
    // RELATIONSHIPS (Domain 12)
    // ============================================================
    relationships: {
      list() { return _clone(_state.relationships || []); },
      add(r) {
        _pushUndo();
        const n = { id: _nextId(), lastContact: 'Today', ...r };
        _state.relationships.unshift(n); _save(); _emit('relationships', 'add', n); return n;
      },
      update(id, patch) {
        _pushUndo();
        const r = _state.relationships.find(r => r.id == id); if (!r) return null;
        Object.assign(r, patch); _save(); _emit('relationships', 'update', { id, patch }); return { ...r };
      },
      delete(id) {
        _pushUndo(); _state.relationships = _state.relationships.filter(r => r.id != id);
        _save(); _emit('relationships', 'delete', { id }); return true;
      },
      markContacted(id) { return api.relationships.update(id, { lastContact: 'Today' }); }
    },

    // ============================================================
    // HOME CARE (Domain 13)
    // ============================================================
    homeModule: {
      get() { return _clone(_state.homeModule); },
      updateChore(taskName, patch) {
        _pushUndo();
        const c = _state.homeModule.chores.find(c => c.task.toLowerCase().includes(taskName.toLowerCase()));
        if (c) Object.assign(c, patch); else _state.homeModule.chores.push({ task: taskName, ...patch });
        _save(); _emit('homeModule', 'chore', { taskName, patch });
      },
      markChoreDone(taskName) {
        return api.homeModule.updateChore(taskName, { status: 'ok', lastDone: new Date().toISOString().split('T')[0] });
      },
      addUtility(u) {
        _pushUndo(); _state.homeModule.utilities.push({ ...u }); _save(); _emit('homeModule', 'utility', u);
      }
    },

    // ============================================================
    // VEHICLE CARE (Domain 14)
    // ============================================================
    vehicle: {
      get() { return _clone(_state.vehicle); },
      update(patch) { _pushUndo(); Object.assign(_state.vehicle, patch); _save(); _emit('vehicle', 'update', patch); },
      logFuel(log) {
        _pushUndo();
        const n = { date: new Date().toISOString().split('T')[0], ...log };
        _state.vehicle.fuelLogs.unshift(n); _save(); _emit('vehicle', 'fuel', n); return n;
      },
      markWashed(type = 'Pressure Wash & Motul Chain Lube') {
        _pushUndo();
        const today = new Date().toISOString().split('T')[0];
        _state.vehicle.lastWashDate = today;
        if (!_state.vehicle.washHistory) _state.vehicle.washHistory = [];
        _state.vehicle.washHistory.unshift({ date: today, type, cost: 350 });
        _save(); _emit('vehicle', 'wash', { date: today, type });
      }
    },

    // ============================================================
    // TRAVEL & TRIPS (Domain 15)
    // ============================================================
    travel: {
      list() { return _clone(_state.travel.trips || []); },
      addTrip(t) {
        _pushUndo();
        const n = { id: _nextId(), status: 'planned', spent: 0, itinerary: [], packing: [], ...t };
        _state.travel.trips.push(n); _save(); _emit('travel', 'addTrip', n); return n;
      },
      update(id, patch) {
        _pushUndo();
        const t = _state.travel.trips.find(t => t.id == id); if (!t) return null;
        Object.assign(t, patch); _save(); _emit('travel', 'update', { id, patch }); return { ...t };
      },
      delete(id) {
        _pushUndo(); _state.travel.trips = _state.travel.trips.filter(t => t.id != id);
        _save(); _emit('travel', 'delete', { id }); return true;
      }
    },

    // ============================================================
    // ENTERTAINMENT (Domain 16)
    // ============================================================
    entertainment: {
      list(type) {
        let e = _state.entertainment || [];
        if (type) e = e.filter(x => x.type.toLowerCase() === type.toLowerCase());
        return _clone(e);
      },
      add(item) {
        _pushUndo();
        const n = { id: _nextId(), ...item };
        _state.entertainment.push(n); _save(); _emit('entertainment', 'add', n); return n;
      },
      update(id, patch) {
        _pushUndo();
        const e = _state.entertainment.find(e => e.id == id); if (!e) return null;
        Object.assign(e, patch); _save(); _emit('entertainment', 'update', { id, patch }); return { ...e };
      },
      delete(id) {
        _pushUndo(); _state.entertainment = _state.entertainment.filter(e => e.id != id);
        _save(); _emit('entertainment', 'delete', { id }); return true;
      }
    },

    // ============================================================
    // DOCUMENT VAULT (Domain 17)
    // ============================================================
    documents: {
      list() { return _clone(_state.documents || []); },
      add(d) {
        _pushUndo();
        const n = { id: _nextId(), date: new Date().toISOString().split('T')[0], tags: [], ...d };
        _state.documents.push(n); _save(); _emit('documents', 'add', n); return n;
      },
      delete(id) {
        _pushUndo(); _state.documents = _state.documents.filter(d => d.id != id);
        _save(); _emit('documents', 'delete', { id }); return true;
      }
    },

    // ============================================================
    // KNOWLEDGE BASE (Domain 18)
    // ============================================================
    knowledge: {
      list(tag) {
        let notes = _state.knowledge || [];
        if (tag) notes = notes.filter(n => n.tags && n.tags.includes(tag));
        return _clone(notes);
      },
      search(q) {
        const lq = q.toLowerCase();
        return (_state.knowledge || []).filter(n => n.title.toLowerCase().includes(lq) || (n.preview || '').toLowerCase().includes(lq));
      },
      add(note) {
        _pushUndo();
        const n = { id: _nextId(), date: new Date().toISOString().split('T')[0], tags: [], type: 'Note', ...note };
        _state.knowledge.push(n); _save(); _emit('knowledge', 'add', n); return n;
      },
      update(id, patch) {
        _pushUndo();
        const n = _state.knowledge.find(n => n.id == id); if (!n) return null;
        Object.assign(n, patch); _save(); _emit('knowledge', 'update', { id, patch }); return { ...n };
      },
      delete(id) {
        _pushUndo(); _state.knowledge = _state.knowledge.filter(n => n.id != id);
        _save(); _emit('knowledge', 'delete', { id }); return true;
      }
    },

    // ============================================================
    // ROUTINES & HABITS (Domain 19)
    // ============================================================
    routines: {
      get() { return _clone(_state.routines); },
      markDone(type, taskName) {
        _pushUndo();
        const list = _state.routines[type]; if (!list) return null;
        const t = list.find(r => r.task.toLowerCase().includes(taskName.toLowerCase()));
        if (t) t.done = true; _save(); _emit('routines', 'markDone', { type, taskName });
        return t ? { ...t } : null;
      },
      resetDay() {
        _pushUndo();
        ['morning', 'night'].forEach(k => { (_state.routines[k] || []).forEach(r => r.done = false); });
        _save(); _emit('routines', 'reset', null);
      },
      addStep(type, step) {
        _pushUndo();
        if (!_state.routines[type]) _state.routines[type] = [];
        _state.routines[type].push({ done: false, ...step });
        _save(); _emit('routines', 'addStep', { type, step });
      }
    },

    // ============================================================
    // DIGITAL LIFE (Domain 20)
    // ============================================================
    digitalLife: {
      get() { return _clone(_state.digitalLife); },
      addSubscription(sub) {
        _pushUndo(); _state.digitalLife.subscriptions.push({ status: 'active', ...sub });
        _save(); _emit('digitalLife', 'add', sub);
      },
      deleteSubscription(name) {
        _pushUndo();
        _state.digitalLife.subscriptions = _state.digitalLife.subscriptions.filter(s => !s.name.toLowerCase().includes(name.toLowerCase()));
        _save(); _emit('digitalLife', 'delete', { name });
      },
      updateSubscription(name, patch) {
        _pushUndo();
        const s = _state.digitalLife.subscriptions.find(s => s.name.toLowerCase().includes(name.toLowerCase()));
        if (s) Object.assign(s, patch); _save(); _emit('digitalLife', 'update', { name, patch });
      }
    },

    // ============================================================
    // ANALYTICS (Domain 21)
    // ============================================================
    analytics: {
      get() { return _clone(_state.analytics); },
      record(domain, value) {
        _pushUndo();
        if (_state.analytics[domain]) {
          _state.analytics[domain].push(value);
          if (_state.analytics[domain].length > 7) _state.analytics[domain].shift();
        }
        _save(); _emit('analytics', 'record', { domain, value });
      }
    },

    // ============================================================
    // UPDATE CENTER (Domain 23)
    // ============================================================
    updates: {
      getStatus() {
        const u = _state.updates || {};
        return {
          systemVersion: u.systemVersion || '5.9.0',
          currentBuild: u.currentBuild || '0ae6137',
          lastCheckedAt: u.lastCheckedAt || new Date().toISOString(),
          historyCount: Array.isArray(u.history) ? u.history.length : 0
        };
      },
      getHistory() {
        return _clone((_state.updates && _state.updates.history) || []);
      },
      recordUpdate(entry) {
        _pushUndo();
        if (!_state.updates) _state.updates = { systemVersion: '5.9.0', history: [] };
        if (!Array.isArray(_state.updates.history)) _state.updates.history = [];
        _state.updates.history.unshift({
          id: entry.id || `upd_${Date.now()}`,
          version: entry.version || '5.9.0',
          description: entry.description || 'Live Hot-Patch Update',
          author: entry.author || 'User',
          timestamp: entry.timestamp || new Date().toISOString(),
          filesCount: Number(entry.filesCount) || 1,
          status: entry.status || 'applied'
        });
        _state.updates.systemVersion = entry.version || _state.updates.systemVersion;
        _save();
        _emit('updates', 'recordUpdate', entry);
        return entry;
      },
      clearHistory() {
        _pushUndo();
        if (_state.updates) _state.updates.history = [];
        _save();
        _emit('updates', 'clearHistory', null);
      }
    },

    // ============================================================
    // AI SUMMARY — rich context snapshot for Gemini system prompt
    // ============================================================
    buildAISummary() {
      const s = _state;
      const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const pendingTasks = (s.tasks || []).filter(t => t.status !== 'done').slice(0, 10)
        .map(t => `  - [${t.priority || 'medium'}] ${t.title} (due: ${t.deadline || 'no date'}, project: ${t.project || 'General'})`).join('\n');
      const goals = (s.goals || []).slice(0, 5)
        .map(g => `  - ${g.emoji || ''} ${g.title}: ${g.progress || 0}% complete (target: ${g.target || 'TBD'})`).join('\n');
      const recentTx = (s.finance?.transactions || []).slice(0, 5)
        .map(t => `    ${t.name}: ${t.amount > 0 ? '+' : ''}₹${t.amount} (${t.category || 'General'}, ${t.date || 'recent'})`).join('\n');
      const subjects = (s.study?.subjects || [])
        .map(sub => `  - ${sub.name} [${sub.code || ''}]: ${sub.progress || 0}% done (exam: ${sub.examDate || 'TBD'})`).join('\n');
      const recentWorkouts = (s.fitness?.workouts || []).slice(-3)
        .map(w => `  - ${w.date}: ${w.name}, ${w.duration}min (${w.status})`).join('\n');
      const subsList = (s.digitalLife?.subscriptions || []).filter(x => x.status === 'active')
        .map(x => `  - ${x.name}: ₹${x.amount}/${x.period}`).join('\n');

      return `
TADASHI LIVE DATA SNAPSHOT — ${today}

[USER]
Name: ${s.user.name} | LifeScore: ${s.user.lifeScore}/100 | Energy: ${s.user.energyScore}%

[TASKS — ${(s.tasks || []).filter(t => t.status !== 'done').length} pending, ${(s.tasks || []).filter(t => t.status === 'done').length} done]
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
  Morning: ${(s.routines.morning || []).filter(r => r.done).length}/${(s.routines.morning || []).length} done
  Night: ${(s.routines.night || []).filter(r => r.done).length}/${(s.routines.night || []).length} done

[SHOPPING]
  Groceries pending: ${(s.shopping.groceries || []).filter(g => g.status === 'pending').length} items
  Wishlist: ${(s.shopping.wishlist || []).length} items

[RELATIONSHIPS]
  Contacts tracked: ${(s.relationships || []).length}
  ${(s.relationships || []).slice(0, 3).map(r => `${r.name} (${r.category}, last contact: ${r.lastContact})`).join(', ')}

[VEHICLE]
  ${s.vehicle.make} ${s.vehicle.model} | Fuel: ${s.vehicle.fuel}% | Next service: ${s.vehicle.nextService}

[DIGITAL LIFE — Active subscriptions]
${subsList || '  None'}

[KNOWLEDGE BASE]
  ${(s.knowledge || []).length} notes/ideas saved

[ENTERTAINMENT]
  ${(s.entertainment || []).length} items tracked (books, shows, movies, games)
`.trim();
    }
  };

  api.init();
  return api;
})();

if (typeof window !== 'undefined') {
  window.DB = DB;
}

