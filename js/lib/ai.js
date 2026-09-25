// ============================================================
// TADASHI AI Bridge — Gemini + Function Calling
// Full CRUD over all 22 domains via natural language.
// ============================================================

const AI = {
  DEFAULT_KEY: '',
  KEY_STORAGE: 'tadashi_gemini_key',
  MODEL_STORAGE: 'tadashi_gemini_model',
  DEFAULT_MODEL: 'gemini-1.5-flash',
  MODELS: [
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Fast, Recommended)' },
    { id: 'gemini-1.5-pro',   name: 'Gemini 1.5 Pro (Deep Reasoning)' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  ],

  getKey()   { const s = localStorage.getItem(this.KEY_STORAGE); return (s || '').trim(); },
  setKey(k)  { localStorage.setItem(this.KEY_STORAGE, (k || '').trim()); },
  clearKey() { localStorage.removeItem(this.KEY_STORAGE); },
  hasKey()   { return !!this.getKey(); },
  getModel() { return (localStorage.getItem(this.MODEL_STORAGE) || '').trim() || this.DEFAULT_MODEL; },
  setModel(m){ const v=(m||'').trim(); if(v) localStorage.setItem(this.MODEL_STORAGE,v); else localStorage.removeItem(this.MODEL_STORAGE); },

  // ================================================================
  // SYSTEM PROMPT — pulls live data from DB
  // ================================================================
  buildSystemPrompt() {
    const liveSummary = (typeof DB !== 'undefined') ? DB.buildAISummary() : '';
    return `You are TADASHI, the autonomous life intelligence assistant embedded inside Krishna Singh's personal LifeOS dashboard.

You have FULL READ AND WRITE ACCESS to all 22 life domains through your tool functions. When the user asks you to add, update, delete, or retrieve anything — you MUST use the appropriate tool function. Do not just describe what you would do; actually call the tool.

${liveSummary}

PERSONALITY: Warm, direct, slightly witty. Like a sharp, trusted personal chief-of-staff who deeply knows this person. Keep replies concise (under 150 words) unless asked for details. Use **bold** for key info. After executing an action, confirm what was done in 1-2 sentences and mention any follow-up implications.

IMPORTANT RULES:
- For ANY create/add/log/update/delete request → use the tool immediately, don't ask for confirmation unless ambiguous
- For read/query/show requests → use get_domain_data tool to fetch fresh data and answer from it
- If a user says "undo" → call undo_last_action
- If a user says "reset all data" → call reset_all_data (and warn them first)
- Always be proactive: if adding a task with a deadline, mention if it conflicts with exams`;
  },

  // ================================================================
  // TOOL DEFINITIONS — Gemini function declarations
  // ================================================================
  TOOLS: [
    {
      name: 'manage_tasks',
      description: 'Add, update, delete, mark done, or list tasks and projects in Krishna\'s task pipeline.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action:   { type: 'STRING', enum: ['add','update','delete','mark_done','list','search'], description: 'Operation to perform' },
          id:       { type: 'NUMBER', description: 'Task ID (for update/delete/mark_done)' },
          title:    { type: 'STRING', description: 'Task title (for add/search)' },
          priority: { type: 'STRING', enum: ['high','medium','low'], description: 'Task priority' },
          deadline: { type: 'STRING', description: 'Deadline date in YYYY-MM-DD format' },
          project:  { type: 'STRING', description: 'Project or domain this task belongs to' },
          status:   { type: 'STRING', enum: ['todo','in-progress','done'], description: 'Task status (for update)' },
          filter:   { type: 'STRING', enum: ['pending','done','today','all'], description: 'Filter for list action' },
          query:    { type: 'STRING', description: 'Search query (for search action)' }
        },
        required: ['action']
      }
    },
    {
      name: 'manage_goals',
      description: 'Add, update, delete goals and OKRs, update progress percentage, or complete milestones.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action:         { type: 'STRING', enum: ['add','update','delete','list','update_progress','complete_milestone'], description: 'Operation' },
          id:             { type: 'NUMBER', description: 'Goal ID' },
          title:          { type: 'STRING', description: 'Goal title' },
          emoji:          { type: 'STRING', description: 'Emoji for the goal' },
          category:       { type: 'STRING', description: 'Category like Study, Fitness, Finance, Dev' },
          target:         { type: 'STRING', description: 'Target date YYYY-MM-DD' },
          progress:       { type: 'NUMBER', description: 'Progress 0-100' },
          milestone_title:{ type: 'STRING', description: 'Milestone title to mark done' }
        },
        required: ['action']
      }
    },
    {
      name: 'manage_calendar',
      description: 'Add, update, delete or list calendar events and schedule items.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action:   { type: 'STRING', enum: ['add','update','delete','list'], description: 'Operation' },
          id:       { type: 'NUMBER', description: 'Event ID' },
          title:    { type: 'STRING', description: 'Event title' },
          date:     { type: 'STRING', description: 'Date in YYYY-MM-DD format' },
          time:     { type: 'STRING', description: 'Time in HH:MM format' },
          duration: { type: 'NUMBER', description: 'Duration in minutes' },
          type:     { type: 'STRING', description: 'Event type: class, exam, fitness, study, personal, work' },
          filter_date:{ type: 'STRING', description: 'Filter events by this date (for list)' }
        },
        required: ['action']
      }
    },
    {
      name: 'manage_finance',
      description: 'Log income or expenses, delete transactions, update budgets, or query financial summary.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action:   { type: 'STRING', enum: ['add_transaction','delete_transaction','update_budget','get_summary','set_savings'], description: 'Operation' },
          name:     { type: 'STRING', description: 'Transaction name / description' },
          amount:   { type: 'NUMBER', description: 'Amount. Negative for expense (e.g. -280), positive for income (e.g. 4000)' },
          category: { type: 'STRING', description: 'Category: Food, Transport, Entertainment, Shopping, Fitness, Income, Utilities, etc.' },
          id:       { type: 'NUMBER', description: 'Transaction ID (for delete)' },
          budget_limit:{ type: 'NUMBER', description: 'Budget limit for update_budget' },
          savings_amount:{ type: 'NUMBER', description: 'New savings total for set_savings' }
        },
        required: ['action']
      }
    },
    {
      name: 'manage_fitness',
      description: 'Log workouts, update body measurements, set personal records, or get fitness summary.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action:      { type: 'STRING', enum: ['log_workout','update_measurements','add_pr','get_summary'], description: 'Operation' },
          workout_name:{ type: 'STRING', description: 'Workout name e.g. Pull Day, Push Day, Leg Day, Cardio' },
          duration:    { type: 'NUMBER', description: 'Duration in minutes' },
          notes:       { type: 'STRING', description: 'Workout notes or exercises' },
          weight:      { type: 'NUMBER', description: 'Body weight in kg (for update_measurements)' },
          body_fat:    { type: 'NUMBER', description: 'Body fat % (for update_measurements)' },
          exercise:    { type: 'STRING', description: 'Exercise name (for add_pr)' },
          pr_value:    { type: 'STRING', description: 'PR value e.g. "85kg x5" (for add_pr)' }
        },
        required: ['action']
      }
    },
    {
      name: 'manage_nutrition',
      description: 'Log meals, update calorie targets, set water intake, or get today\'s nutrition summary.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action:   { type: 'STRING', enum: ['log_meal','update_today','set_water','get_summary'], description: 'Operation' },
          meal_name:{ type: 'STRING', description: 'Meal name: Breakfast, Lunch, Dinner, Snack, Pre-workout' },
          items:    { type: 'STRING', description: 'Comma-separated food items' },
          calories: { type: 'NUMBER', description: 'Calories in the meal' },
          protein:  { type: 'NUMBER', description: 'Protein in grams' },
          water:    { type: 'NUMBER', description: 'Water consumed today in litres (for set_water)' },
          time:     { type: 'STRING', description: 'Time of meal HH:MM' }
        },
        required: ['action']
      }
    },
    {
      name: 'manage_study',
      description: 'Update study topic progress, add subjects, log assignment status, or get study summary.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action:      { type: 'STRING', enum: ['list','update_topic','update_progress','add_subject'], description: 'Operation' },
          subject_id:  { type: 'NUMBER', description: 'Subject ID (1=OS, 2=DBMS, 3=Networks)' },
          subject_name:{ type: 'STRING', description: 'Subject name (to find by name)' },
          topic_name:  { type: 'STRING', description: 'Topic name to update' },
          topic_status:{ type: 'STRING', enum: ['done','partial','todo'], description: 'Topic completion status' },
          progress:    { type: 'NUMBER', description: 'Overall subject progress 0-100' }
        },
        required: ['action']
      }
    },
    {
      name: 'manage_wellbeing',
      description: 'Log today\'s mood score, stress level, breaks, or get wellbeing summary.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action:  { type: 'STRING', enum: ['set_mood','set_stress','log_break','get_summary'], description: 'Operation' },
          mood:    { type: 'NUMBER', description: 'Mood score 1-5 (1=very bad, 5=excellent)' },
          stress:  { type: 'NUMBER', description: 'Stress level 1-5 (1=none, 5=overwhelming)' },
          break_type:  { type: 'STRING', description: 'Type of break: Walk, Stretch, Rest, Meditation' },
          break_duration:{ type: 'STRING', description: 'Break duration e.g. "10 min"' }
        },
        required: ['action']
      }
    },
    {
      name: 'manage_shopping',
      description: 'Add or remove grocery items or wishlist items, or mark grocery items as bought.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action:    { type: 'STRING', enum: ['add_grocery','complete_grocery','delete_grocery','add_wishlist','delete_wishlist','get_list'], description: 'Operation' },
          item:      { type: 'STRING', description: 'Item name' },
          qty:       { type: 'STRING', description: 'Quantity e.g. "2", "500g", "1 dozen"' },
          price:     { type: 'STRING', description: 'Price for wishlist items e.g. "₹4,500"' },
          priority:  { type: 'STRING', enum: ['high','medium','low'], description: 'Wishlist item priority' }
        },
        required: ['action']
      }
    },
    {
      name: 'manage_relationships',
      description: 'Add, update, delete contacts, mark someone as recently contacted, or list contacts.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action:   { type: 'STRING', enum: ['add','update','delete','list','mark_contacted'], description: 'Operation' },
          id:       { type: 'NUMBER', description: 'Contact ID' },
          name:     { type: 'STRING', description: 'Contact name' },
          category: { type: 'STRING', description: 'Category: Family, Friend, Mentor, Classmate, Colleague' },
          notes:    { type: 'STRING', description: 'Notes about the contact' },
          birthday: { type: 'STRING', description: 'Birthday in YYYY-MM-DD' }
        },
        required: ['action']
      }
    },
    {
      name: 'manage_knowledge',
      description: 'Add notes, ideas, book notes, or journal entries to the knowledge base. Search or delete entries.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action:  { type: 'STRING', enum: ['add','delete','search','list'], description: 'Operation' },
          id:      { type: 'NUMBER', description: 'Note ID (for delete)' },
          title:   { type: 'STRING', description: 'Note/idea title' },
          preview: { type: 'STRING', description: 'Content or summary of the note' },
          type:    { type: 'STRING', description: 'Note, Idea, Book Note, Journal, Project Idea' },
          tags:    { type: 'STRING', description: 'Comma-separated tags' },
          query:   { type: 'STRING', description: 'Search query' }
        },
        required: ['action']
      }
    },
    {
      name: 'manage_routines',
      description: 'Mark routine steps as done, add new steps, or reset the daily routine progress.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action:    { type: 'STRING', enum: ['mark_done','add_step','reset','get_status'], description: 'Operation' },
          routine:   { type: 'STRING', enum: ['morning','night'], description: 'Which routine' },
          task_name: { type: 'STRING', description: 'Task name within the routine' },
          time:      { type: 'STRING', description: 'Time for new step HH:MM' }
        },
        required: ['action']
      }
    },
    {
      name: 'manage_digital_life',
      description: 'Add, delete, or update subscriptions and digital services.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action:  { type: 'STRING', enum: ['add_subscription','delete_subscription','update_subscription','list'], description: 'Operation' },
          name:    { type: 'STRING', description: 'Service name e.g. Netflix, Spotify' },
          amount:  { type: 'NUMBER', description: 'Cost amount' },
          period:  { type: 'STRING', description: 'Billing period: mo, yr' },
          renewal: { type: 'STRING', description: 'Renewal date YYYY-MM-DD' },
          status:  { type: 'STRING', description: 'active, paused, cancelled' }
        },
        required: ['action']
      }
    },
    {
      name: 'get_domain_data',
      description: 'Read and return current data from any specific domain. Use this to answer questions about current state.',
      parameters: {
        type: 'OBJECT',
        properties: {
          domain: {
            type: 'STRING',
            enum: ['tasks','goals','calendar','finance','fitness','nutrition','study','wellbeing','shopping','relationships','knowledge','routines','digital_life','vehicle','travel','entertainment','documents','home','analytics','all'],
            description: 'Which domain to fetch data from'
          },
          detail: { type: 'STRING', description: 'Specific detail to focus on e.g. "pending tasks", "this week workouts", "active subscriptions"' }
        },
        required: ['domain']
      }
    },
    {
      name: 'undo_last_action',
      description: 'Undo the last write operation performed. Reverts the most recent data change.',
      parameters: { type: 'OBJECT', properties: {}, required: [] }
    }
  ],

  // ================================================================
  // TOOL EXECUTOR — maps tool calls to DB operations
  // ================================================================
  executeTool(name, args) {
    try {
      switch(name) {

        // ---- TASKS ----
        case 'manage_tasks': {
          const { action, id, title, priority, deadline, project, status, filter, query } = args;
          if (action === 'add')       return { ok: true, result: DB.tasks.add({ title, priority, deadline, project }) };
          if (action === 'update')    return { ok: true, result: DB.tasks.update(id, { title, priority, deadline, project, status }) };
          if (action === 'delete')    return { ok: true, result: DB.tasks.delete(id) };
          if (action === 'mark_done') return { ok: true, result: DB.tasks.markDone(id) };
          if (action === 'list')      return { ok: true, result: DB.tasks.list(filter || 'pending') };
          if (action === 'search')    return { ok: true, result: DB.tasks.search(query || '') };
          break;
        }

        // ---- GOALS ----
        case 'manage_goals': {
          const { action, id, title, emoji, category, target, progress, milestone_title } = args;
          if (action === 'add')               return { ok: true, result: DB.goals.add({ title, emoji, category, target }) };
          if (action === 'update')            return { ok: true, result: DB.goals.update(id, { title, emoji, category, target }) };
          if (action === 'delete')            return { ok: true, result: DB.goals.delete(id) };
          if (action === 'list')              return { ok: true, result: DB.goals.list() };
          if (action === 'update_progress')   return { ok: true, result: DB.goals.updateProgress(id, progress) };
          if (action === 'complete_milestone')return { ok: true, result: DB.goals.completeMilestone(id, milestone_title) };
          break;
        }

        // ---- CALENDAR ----
        case 'manage_calendar': {
          const { action, id, title, date, time, duration, type, filter_date } = args;
          if (action === 'add')    return { ok: true, result: DB.calendar.add({ title, date, time, duration, type }) };
          if (action === 'update') return { ok: true, result: DB.calendar.update(id, { title, date, time, duration, type }) };
          if (action === 'delete') return { ok: true, result: DB.calendar.delete(id) };
          if (action === 'list')   return { ok: true, result: DB.calendar.list(filter_date) };
          break;
        }

        // ---- FINANCE ----
        case 'manage_finance': {
          const { action, name, amount, category, id, budget_limit, savings_amount } = args;
          if (action === 'add_transaction')    return { ok: true, result: DB.finance.addTransaction({ name, amount, category, icon: amount >= 0 ? '💰' : '💸' }) };
          if (action === 'delete_transaction') return { ok: true, result: DB.finance.deleteTransaction(id) };
          if (action === 'update_budget')      return { ok: true, result: DB.finance.updateBudget(category, { limit: budget_limit }) || 'updated' };
          if (action === 'set_savings')        return { ok: true, result: DB.finance.setSavings(savings_amount) || 'updated' };
          if (action === 'get_summary')        return { ok: true, result: DB.finance.get() };
          break;
        }

        // ---- FITNESS ----
        case 'manage_fitness': {
          const { action, workout_name, duration, notes, weight, body_fat, exercise, pr_value } = args;
          if (action === 'log_workout')        return { ok: true, result: DB.fitness.logWorkout({ name: workout_name, duration, notes }) };
          if (action === 'update_measurements'){
            const patch = {};
            if (weight !== undefined) patch.weight = weight;
            if (body_fat !== undefined) patch.bodyFat = body_fat;
            return { ok: true, result: DB.fitness.updateMeasurements(patch) };
          }
          if (action === 'add_pr')    return { ok: true, result: DB.fitness.addPR({ exercise, value: pr_value }) };
          if (action === 'get_summary')return { ok: true, result: DB.fitness.get() };
          break;
        }

        // ---- NUTRITION ----
        case 'manage_nutrition': {
          const { action, meal_name, items, calories, protein, water, time } = args;
          if (action === 'log_meal')   return { ok: true, result: DB.nutrition.logMeal({ name: meal_name, time: time || Utils.timeNow(), items: (items||'').split(',').map(s=>s.trim()), calories: calories||0, protein: protein||0 }) };
          if (action === 'set_water')  return { ok: true, result: DB.nutrition.setWater(water) || 'updated' };
          if (action === 'get_summary')return { ok: true, result: DB.nutrition.get() };
          if (action === 'update_today'){ DB.nutrition.updateToday({ calories, protein }); return { ok: true, result: 'updated' }; }
          break;
        }

        // ---- STUDY ----
        case 'manage_study': {
          const { action, subject_id, subject_name, topic_name, topic_status, progress } = args;
          // find subject by name if no ID
          let sid = subject_id;
          if (!sid && subject_name) {
            const subj = DB.study.list().find(s => s.name.toLowerCase().includes(subject_name.toLowerCase()));
            if (subj) sid = subj.id;
          }
          if (action === 'list')           return { ok: true, result: DB.study.list() };
          if (action === 'update_topic')   return { ok: true, result: DB.study.updateTopic(sid, topic_name, topic_status) };
          if (action === 'update_progress')return { ok: true, result: DB.study.updateProgress(sid, progress) };
          if (action === 'add_subject')    return { ok: true, result: DB.study.addSubject({ name: subject_name }) };
          break;
        }

        // ---- WELLBEING ----
        case 'manage_wellbeing': {
          const { action, mood, stress, break_type, break_duration } = args;
          if (action === 'set_mood')    return { ok: true, result: DB.wellbeing.setMood(mood) || { mood } };
          if (action === 'set_stress')  return { ok: true, result: DB.wellbeing.setStress(stress) || { stress } };
          if (action === 'log_break')   return { ok: true, result: DB.wellbeing.logBreak({ type: break_type, duration: break_duration, time: Utils.timeNow() }) || 'logged' };
          if (action === 'get_summary') return { ok: true, result: DB.wellbeing.get() };
          break;
        }

        // ---- SHOPPING ----
        case 'manage_shopping': {
          const { action, item, qty, price, priority } = args;
          if (action === 'add_grocery')      return { ok: true, result: DB.shopping.addGrocery({ item, qty }) || 'added' };
          if (action === 'complete_grocery') return { ok: true, result: DB.shopping.completeGrocery(item) || 'done' };
          if (action === 'delete_grocery')   return { ok: true, result: DB.shopping.deleteGrocery(item) || 'deleted' };
          if (action === 'add_wishlist')     return { ok: true, result: DB.shopping.addWishlist({ item, price, priority }) || 'added' };
          if (action === 'delete_wishlist')  return { ok: true, result: DB.shopping.deleteWishlist(item) || 'deleted' };
          if (action === 'get_list')         return { ok: true, result: DB.shopping.get() };
          break;
        }

        // ---- RELATIONSHIPS ----
        case 'manage_relationships': {
          const { action, id, name, category, notes, birthday } = args;
          if (action === 'add')           return { ok: true, result: DB.relationships.add({ name, category, notes, birthday, emoji: '👤' }) };
          if (action === 'update')        return { ok: true, result: DB.relationships.update(id, { name, category, notes }) };
          if (action === 'delete')        return { ok: true, result: DB.relationships.delete(id) };
          if (action === 'list')          return { ok: true, result: DB.relationships.list() };
          if (action === 'mark_contacted'){
            // find by name if no id
            let rid = id;
            if (!rid && name) { const r = DB.relationships.list().find(r => r.name.toLowerCase().includes(name.toLowerCase())); if (r) rid = r.id; }
            return { ok: true, result: DB.relationships.markContacted(rid) };
          }
          break;
        }

        // ---- KNOWLEDGE ----
        case 'manage_knowledge': {
          const { action, id, title, preview, type, tags, query } = args;
          if (action === 'add')    return { ok: true, result: DB.knowledge.add({ title, preview, type: type||'Note', tags: tags ? tags.split(',').map(t=>t.trim()) : [] }) };
          if (action === 'delete') return { ok: true, result: DB.knowledge.delete(id) };
          if (action === 'search') return { ok: true, result: DB.knowledge.search(query||title||'') };
          if (action === 'list')   return { ok: true, result: DB.knowledge.list() };
          break;
        }

        // ---- ROUTINES ----
        case 'manage_routines': {
          const { action, routine, task_name, time } = args;
          if (action === 'mark_done') return { ok: true, result: DB.routines.markDone(routine, task_name) };
          if (action === 'add_step')  return { ok: true, result: DB.routines.addStep(routine, { task: task_name, time }) || 'added' };
          if (action === 'reset')     return { ok: true, result: DB.routines.resetDay() || 'reset' };
          if (action === 'get_status')return { ok: true, result: DB.routines.get() };
          break;
        }

        // ---- DIGITAL LIFE ----
        case 'manage_digital_life': {
          const { action, name, amount, period, renewal, status } = args;
          if (action === 'add_subscription')    return { ok: true, result: DB.digitalLife.addSubscription({ name, amount, period, renewal, status: status||'active' }) || 'added' };
          if (action === 'delete_subscription') return { ok: true, result: DB.digitalLife.deleteSubscription(name) || 'deleted' };
          if (action === 'update_subscription') return { ok: true, result: DB.digitalLife.updateSubscription(name, { amount, period, renewal, status }) || 'updated' };
          if (action === 'list')                return { ok: true, result: DB.digitalLife.get() };
          break;
        }

        // ---- GET DOMAIN DATA ----
        case 'get_domain_data': {
          const { domain } = args;
          const dataMap = {
            tasks:        () => DB.tasks.list(),
            goals:        () => DB.goals.list(),
            calendar:     () => DB.calendar.list(),
            finance:      () => DB.finance.get(),
            fitness:      () => DB.fitness.get(),
            nutrition:    () => DB.nutrition.get(),
            study:        () => DB.study.list(),
            wellbeing:    () => DB.wellbeing.get(),
            shopping:     () => DB.shopping.get(),
            relationships:() => DB.relationships.list(),
            knowledge:    () => DB.knowledge.list(),
            routines:     () => DB.routines.get(),
            digital_life: () => DB.digitalLife.get(),
            vehicle:      () => DB.vehicle.get(),
            travel:       () => DB.travel.list(),
            entertainment:() => DB.entertainment.list(),
            documents:    () => DB.documents.list(),
            home:         () => DB.homeModule.get(),
            analytics:    () => DB.analytics.get(),
            all:          () => DB.buildAISummary()
          };
          const fn = dataMap[domain];
          return { ok: true, result: fn ? fn() : 'Domain not found' };
        }

        // ---- UNDO ----
        case 'undo_last_action': {
          const success = DB.undo();
          return { ok: true, result: success ? 'Last action undone successfully.' : 'Nothing to undo.' };
        }

        default:
          return { ok: false, error: `Unknown tool: ${name}` };
      }
    } catch(e) {
      console.error(`Tool execution error [${name}]:`, e);
      return { ok: false, error: e.message };
    }
    return { ok: false, error: 'Action not handled' };
  },

  // ================================================================
  // GEMINI API CALL
  // ================================================================
  async _call(key, model, body) {
    const cleanModel = (model || this.DEFAULT_MODEL).trim().replace(/^models\//, '');
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cleanModel)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body)
      }
    );

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const j = await res.json(); msg = (j?.error?.message) || msg; } catch(e) {}
      if (res.status === 403) msg = 'Invalid or unauthorized API key.';
      else if (res.status === 429) msg = 'Rate limit reached. Please wait a moment.';
      else if (res.status === 503) msg = 'Gemini servers busy. Try again in a moment.';
      throw new Error(msg);
    }
    return res.json();
  },

  // ================================================================
  // MAIN CHAT — with function calling loop
  // onToolCall(name, args, result) is called for each tool execution
  // so the UI can show action confirmation cards
  // ================================================================
  async chat(message, history, { onToolCall } = {}) {
    const key   = this.getKey();
    if (!key) throw new Error('No API key configured');
    const model = this.getModel();

    // Build conversation turns
    const turns = this._buildTurns(history, message);

    // Tool declarations for Gemini
    const toolDeclarations = [{
      functionDeclarations: this.TOOLS.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }))
    }];

    let response = await this._call(key, model, {
      system_instruction: { parts: [{ text: this.buildSystemPrompt() }] },
      contents: turns,
      tools: toolDeclarations,
      tool_config: { function_calling_config: { mode: 'AUTO' } },
      generationConfig: { temperature: 0.75, maxOutputTokens: 1200 }
    });

    // ---- Function calling loop (max 4 rounds) ----
    let rounds = 0;
    while (rounds < 4) {
      const candidate = response?.candidates?.[0];
      if (!candidate) break;

      const parts = candidate?.content?.parts || [];
      const fnCall = parts.find(p => p.functionCall);

      if (!fnCall) break; // No tool call — we have the final text answer

      // Execute the tool
      const { name, args } = fnCall.functionCall;
      const toolResult = this.executeTool(name, args);

      // Notify UI
      if (onToolCall) {
        try { onToolCall(name, args, toolResult); } catch(e) {}
      }

      // Feed result back to Gemini
      const functionResponsePart = {
        functionResponse: {
          name,
          response: { content: JSON.stringify(toolResult.result ?? toolResult.error ?? {}) }
        }
      };

      // Append model turn (the function call) + function response turn
      turns.push({ role: 'model', parts });
      turns.push({ role: 'user',  parts: [functionResponsePart] });

      // Next round
      response = await this._call(key, model, {
        system_instruction: { parts: [{ text: this.buildSystemPrompt() }] },
        contents: turns,
        tools: toolDeclarations,
        tool_config: { function_calling_config: { mode: 'AUTO' } },
        generationConfig: { temperature: 0.75, maxOutputTokens: 1200 }
      });

      rounds++;
    }

    // Extract final text
    const finalParts = response?.candidates?.[0]?.content?.parts || [];
    const text = finalParts.filter(p => p.text).map(p => p.text).join('').trim();
    if (!text) {
      if (response?.candidates?.[0]?.finishReason === 'SAFETY') throw new Error('Response blocked by safety filters');
      throw new Error('Gemini returned an empty response');
    }
    return text;
  },

  // Build valid Gemini multiturn contents array
  _buildTurns(history, currentMessage) {
    const raw = (history || [])
      .filter(m => m && (m.role === 'user' || m.role === 'tadashi'))
      .slice(-12);

    const turns = [];
    for (const m of raw) {
      const role = m.role === 'user' ? 'user' : 'model';
      if (turns.length === 0 && role === 'model') continue;
      if (turns.length > 0 && turns[turns.length - 1].role === role) {
        turns[turns.length - 1].parts[0].text += '\n\n' + (m.content || '');
      } else {
        turns.push({ role, parts: [{ text: m.content || '' }] });
      }
    }

    if (turns.length > 0 && turns[turns.length - 1].role === 'user') {
      turns[turns.length - 1].parts[0].text += '\n\n' + currentMessage;
    } else {
      turns.push({ role: 'user', parts: [{ text: currentMessage }] });
    }
    return turns;
  },

  async testKey(key, model) {
    const cleanModel = (model || this.DEFAULT_MODEL).trim().replace(/^models\//, '');
    await this._call(key, cleanModel, {
      contents: [{ role: 'user', parts: [{ text: 'Reply with exactly one word: OK' }] }],
      generationConfig: { maxOutputTokens: 10 }
    });
    return true;
  }
};
