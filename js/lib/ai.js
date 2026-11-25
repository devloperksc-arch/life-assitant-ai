// ============================================================
// TADASHI AI Bridge — Gemini + Function Calling
// Full CRUD over all 22 domains via natural language.
// ============================================================

const AI = {
  ACTIVE_PROVIDER_STORAGE: 'tadashi_active_provider',
  AUTO_FAILOVER_STORAGE:   'tadashi_ai_auto_failover',
  KEY_STORAGE:             'tadashi_gemini_key',
  MODEL_STORAGE:           'tadashi_gemini_model',
  DEFAULT_MODEL:           'gemini-flash-lite-latest',

  PROVIDERS: {
    gemini: {
      id: 'gemini',
      name: 'Google Gemini',
      tag: 'Google AI Studio',
      icon: 'psychology',
      color: '#00d4ff',
      keyStorage: 'tadashi_gemini_key',
      modelStorage: 'tadashi_gemini_model',
      defaultModel: 'gemini-flash-lite-latest',
      models: [
        { id: 'gemini-flash-lite-latest', name: 'Gemini Flash Lite (Fastest & Stable)' },
        { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite' },
        { id: 'gemini-flash-latest', name: 'Gemini Flash Latest' },
        { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' }
      ],
      docsUrl: 'https://aistudio.google.com/apikey',
      detect: (k) => k.startsWith('AIzaSy') || k.startsWith('AQ.') || k.startsWith('AQ') || k.startsWith('AIza')
    },
    openai: {
      id: 'openai',
      name: 'OpenAI (ChatGPT)',
      tag: 'ChatGPT Platform',
      icon: 'smart_toy',
      color: '#10a37f',
      keyStorage: 'tadashi_openai_key',
      modelStorage: 'tadashi_openai_model',
      defaultModel: 'gpt-4o-mini',
      models: [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Affordable)' },
        { id: 'gpt-4o', name: 'GPT-4o (Flagship Multimodal)' },
        { id: 'chatgpt-4o-latest', name: 'ChatGPT-4o Latest' }
      ],
      docsUrl: 'https://platform.openai.com/api-keys',
      detect: (k) => k.startsWith('sk-proj-') || (k.startsWith('sk-') && !k.startsWith('sk-ant-') && !k.startsWith('sk-or-'))
    },
    claude: {
      id: 'claude',
      name: 'Anthropic Claude',
      tag: 'Anthropic API',
      icon: 'neurology',
      color: '#d97706',
      keyStorage: 'tadashi_claude_key',
      modelStorage: 'tadashi_claude_model',
      defaultModel: 'claude-3-5-haiku-20241022',
      models: [
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast & Precise)' },
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Deep Reasoning)' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
      ],
      docsUrl: 'https://console.anthropic.com/settings/keys',
      detect: (k) => k.startsWith('sk-ant-')
    },
    openrouter: {
      id: 'openrouter',
      name: 'OpenRouter',
      tag: 'Multi-Model Hub',
      icon: 'hub',
      color: '#8b5cf6',
      keyStorage: 'tadashi_openrouter_key',
      modelStorage: 'tadashi_openrouter_model',
      defaultModel: 'meta-llama/llama-3.2-3b-instruct:free',
      models: [
        { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B (Free)' },
        { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash Exp (Free)' },
        { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku via OpenRouter' },
        { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini via OpenRouter' }
      ],
      docsUrl: 'https://openrouter.ai/keys',
      detect: (k) => k.startsWith('sk-or-v1-') || k.startsWith('sk-or-')
    }
  },

  detectProvider(key) {
    key = (key || '').trim();
    if (!key) return null;
    for (const [id, p] of Object.entries(this.PROVIDERS)) {
      if (p.detect && p.detect(key)) return id;
    }
    if (key.startsWith('AQ') || key.startsWith('AIza')) return 'gemini';
    if (key.startsWith('sk-ant')) return 'claude';
    if (key.startsWith('sk-or')) return 'openrouter';
    if (key.startsWith('sk-')) return 'openai';
    return 'custom';
  },

  getActiveProvider() {
    let p = localStorage.getItem(this.ACTIVE_PROVIDER_STORAGE);
    if (!p || !this.PROVIDERS[p]) {
      for (const [id, prov] of Object.entries(this.PROVIDERS)) {
        if (localStorage.getItem(prov.keyStorage)) { p = id; break; }
      }
      p = p || 'gemini';
    }
    return p;
  },

  setActiveProvider(id) {
    if (this.PROVIDERS[id]) {
      localStorage.setItem(this.ACTIVE_PROVIDER_STORAGE, id);
      this._notifyProviderChange();
    }
  },

  isAutoFailoverEnabled() {
    return localStorage.getItem(this.AUTO_FAILOVER_STORAGE) !== 'false';
  },

  setAutoFailover(enabled) {
    localStorage.setItem(this.AUTO_FAILOVER_STORAGE, enabled ? 'true' : 'false');
  },

  getConfiguredProviders() {
    return Object.keys(this.PROVIDERS).filter(id => !!localStorage.getItem(this.PROVIDERS[id].keyStorage));
  },

  getKey(providerId) {
    const p = providerId ? this.PROVIDERS[providerId] : this.PROVIDERS[this.getActiveProvider()];
    return p ? (localStorage.getItem(p.keyStorage) || '').trim() : '';
  },

  setKey(key, providerId) {
    key = (key || '').trim();
    if (providerId && !this.PROVIDERS[providerId]) providerId = null;
    const detected = this.detectProvider(key);
    providerId = providerId || (detected && this.PROVIDERS[detected] ? detected : null) || this.getActiveProvider() || 'gemini';
    const p = this.PROVIDERS[providerId] || this.PROVIDERS.gemini;
    if (p) {
      if (key) {
        localStorage.setItem(p.keyStorage, key);
        this.setActiveProvider(p.id);
      } else {
        localStorage.removeItem(p.keyStorage);
      }
      this._notifyProviderChange();
    }
  },

  clearKey(providerId) {
    const p = providerId ? this.PROVIDERS[providerId] : this.PROVIDERS[this.getActiveProvider()];
    if (p) {
      localStorage.removeItem(p.keyStorage);
      this._notifyProviderChange();
    }
  },

  hasKey(providerId) {
    if (providerId) return !!this.getKey(providerId);
    return this.getConfiguredProviders().length > 0;
  },

  getModel(providerId) {
    const p = providerId ? this.PROVIDERS[providerId] : this.PROVIDERS[this.getActiveProvider()];
    if (!p) return 'default';
    let m = (localStorage.getItem(p.modelStorage) || '').trim();
    if (!m) m = p.defaultModel;
    if (p.id === 'gemini' && (m.includes('1.5') || m.includes('2.0') || m.includes('2.5'))) {
      m = p.defaultModel;
    }
    return m;
  },

  setModel(model, providerId) {
    const p = providerId ? this.PROVIDERS[providerId] : this.PROVIDERS[this.getActiveProvider()];
    if (p) {
      if (model) localStorage.setItem(p.modelStorage, (model || '').trim());
      else localStorage.removeItem(p.modelStorage);
      this._notifyProviderChange();
    }
  },

  _notifyProviderChange() {
    if (typeof document !== 'undefined') {
      const p = this.PROVIDERS[this.getActiveProvider()];
      const badge = document.getElementById('reactor-model-badge');
      if (badge && p) {
        badge.textContent = `${p.name.split(' ')[0]}: ${this.getModel()}`;
      }
      const hdrBadge = document.getElementById('header-provider-badge');
      if (hdrBadge && p) {
        hdrBadge.textContent = p.name.split(' ')[0];
      }
      const chip = document.getElementById('modal-active-provider-chip');
      if (chip && p) {
        chip.textContent = `Active: ${p.name}`;
      }
    }
  },

  getIntroContent() {
    return `# 🧠 TADASHI LifeOS — Neural Command Canvas

**TADASHI** stands for:
### **T**actical **A**utonomous **D**omain **A**ssistant & **S**cheduling **H**ybrid **I**ntelligence
*(Also known as **Total Autonomous Daily Activity & Scheduling Holistic Intelligence**)*

> Inspired by the vision of **Tadashi Hamada** from *Big Hero 6* — a benevolent, protective, and tireless guardian companion engineered to elevate human cognitive potential, health, and daily performance.

---

### 🌐 What is TADASHI LifeOS?
TADASHI is a **local-first, privacy-respecting Personal Autonomous Life Operating System** that unifies **23 interconnected life domains** into a single cognitive command center. It bridges academics, strength training, career problem-solving, community leadership, and personal relationships without cognitive friction or context switching.

---

### ⚡ Core Capabilities & Architecture:
1. **23 Modular Life Domains**:
   - **Academics & Tech**: Artificial Intelligence (AI), Expert Systems, Software Engineering (SE), Computer Networks (CN), and Python Essentials with the **LeetCode 150 Problem-Solving Roadmap**.
   - **Fitness & Body**: Heavy 6-day Push/Pull/Legs split (Bench Press 82.5kg PR target), macros tracking (180g protein), hydration (3.0L).
   - **Community & Leadership**: **NSS (National Service Scheme)** core coordination, blood donation camps, and literacy drives.
   - **Family & Relationships**: **Daily non-negotiable call to Maa & Papa at 20:30 IST** ❤️.
   - **Financial Independence & Wealth**: Monthly budgeting, vehicle logs (Royal Enfield Classic 350), and emergency fund tracking.
2. **Deterministic Schedule Synthesis**:
   - Proactively balances academic cognitive load with gym recovery.
   - Reserves uninterrupted deep-work focus chunks and eliminates deadline collisions before they happen.
3. **Multi-Model Intelligence Core**:
   - Native tool execution across **Google Gemini (Flash & Pro)**, **OpenAI (ChatGPT)**, and **Anthropic Claude**.
4. **Local-First & Absolute Privacy**:
   - 100% of biometric, academic, and relationship data stays inside browser storage (\`localStorage\` & indexed cache) — zero third-party telemetry.

---
💡 **Tip:** Type \`summary\` for an executive operational briefing of your day, or ask me to schedule study sessions, log workouts, or manage priorities!`;
  },

  getSummaryContent() {
    return `# ⚡ Executive Daily Summary — TADASHI LifeOS

**Operational Status:** Optimal Sync | **LifeScore:** 84/100 | **Energy Level:** Peak  
**Primary Academics:** Artificial Intelligence & LeetCode Python 150 | **Evening Focus:** NSS Meeting & Family Call

---

### 🎯 Top 4 Priorities Today:
1. 🐍 **LeetCode Python 150 Sprint**: Solve 3 Tree & DFS problems (*Current Progress: 48/150 solved · 32%*).
2. 🤖 **Academics Deep Study**: Artificial Intelligence (*A* search in Python*) & Expert Systems forward-chaining rule engine.
3. 🤝 **NSS Core Committee**: 16:30 IST — Finalize Blood Donation Camp volunteer roster & campus logistics.
4. 📞 **Family Check-in**: **Call Maa & Papa at 20:30 IST** (*Daily non-negotiable family sync* ❤️).

---

### 🕒 Synchronized Daily Rhythm:
- **06:30 - 08:30 (Morning)**: ✅ **Completed** — 500ml water, Gym Push Day logged (Bench Press 82.5kg PR, Chest & Triceps), High-protein oats & eggs.
- **09:30 - 15:30 (Mid-Day Academics)**: ⏳ **In Progress** — AI Heuristic Search & Computer Networks lectures, Software Engineering lab.
- **16:30 - 19:30 (Evening Focus)**: 📅 **Queued** — NSS Committee meeting at 16:30, followed by 90m LeetCode Python 150 session.
- **20:30 - 23:00 (Night & Wind Down)**: 📅 **Scheduled** — Call Maa & Papa at 20:30, 180g protein target check, TADASHI daily reflection, sleep at 23:00 (7.5h target).

---

### 📊 Vital Telemetry & Momentum:
- **Fitness & Nutrition**: Push Day Done | **Protein**: 142g / 180g Target | **Water**: 2.4L / 3.0L Target
- **Academics**: AI (68%), Expert Systems (52%), Software Eng (72%), Networks (45%), LeetCode 150 (32%)`;
  },

  // ================================================================
  // SYSTEM PROMPT — pulls live data from DB
  // ================================================================
  buildSystemPrompt() {
    const liveSummary = (typeof DB !== 'undefined') ? DB.buildAISummary() : '';
    const memContext = (typeof window !== 'undefined' && window.Memory && typeof window.Memory.formatContextForPrompt === 'function')
      ? window.Memory.formatContextForPrompt('cloud_allowed', 500)
      : '';
    return `You are TADASHI, the autonomous life intelligence assistant embedded inside Krishna Singh's personal LifeOS dashboard.

### TADASHI IDENTITY & FULL FORM:
- **TADASHI** stands for: **T**actical **A**utonomous **D**omain **A**ssistant & **S**cheduling **H**ybrid **I**ntelligence
  *(Also known as Total Autonomous Daily Activity & Scheduling Holistic Intelligence)*
- Inspired by Tadashi Hamada's vision in Big Hero 6: a benevolent, protective, tireless guardian companion dedicated to human potential, health, and cognitive clarity.
- Always know and proudly state this full form when introducing yourself or when asked!

### USER PROFILE & ACTIVE CONTEXT:
- **User:** Krishna Singh (Engineering Student, Developer, Fitness Enthusiast).
- **Current Academic Curriculum (Active Semester):**
  1. **Artificial Intelligence (AI)** — Heuristic search (A*, IDA*), adversarial search (Minimax, Alpha-Beta), first-order logic, machine learning foundations.
  2. **Expert Systems** — Rule-based inference engines, forward & backward chaining, knowledge engineering, CLIPS/Prolog.
  3. **Software Engineering (SE)** — Agile/Scrum sprints, user stories, UML diagrams (Class, Sequence, Activity), design patterns, CI/CD pipelines.
  4. **Computer Networks (CN)** — OSI layers, TCP/IP protocol suite, IPv4/IPv6 subnetting, routing protocols (OSPF, BGP), socket programming in Python/C.
  5. **Python Essentials & LeetCode 150 Roadmap** — Data Structures & Algorithms in Python, solving the NeetCode/LeetCode 150 interview problems (Current: 48/150 solved; focus: Trees, DFS, BFS, Sliding Window).
  *(NOTE: Operating Systems is NO LONGER Krishna's subject; it was completed in a previous semester. Do NOT mention OS exams or OS assignments).*
- **Fitness & Gym:** Dedicated 6-day Push/Pull/Legs strength training, heavy bench press (82.5kg PR target), tracking 180g daily protein, 3.0L water.
- **Extra-Curricular:** **NSS (National Service Scheme)** core committee coordinator (blood donation camps, youth leadership, literacy drives).
- **Family Priority:** **Call Maa & Papa daily at 20:30 IST** without fail. Remind him gently if it's evening!

### SPECIAL COMMANDS:
- If the user sends **intro**, **introduction**, or asks "who are you" / "app ke bare me batao": Deliver an impressive presentation-grade introduction of TADASHI LifeOS with full form, 23 domains, local-first privacy, and architecture.
- If the user sends **summary**, **daily summary**, or asks for "status" / "aaj ka summary": Deliver a sharp, executive summary covering current rhythm, top 4 priorities (LeetCode 150, AI study, NSS meeting, Call Maa & Papa, Gym push day), and LifeScore.

${memContext}

You have FULL READ AND WRITE ACCESS to all 22 life domains through your tool functions. When the user asks you to add, update, delete, or retrieve anything — you MUST use the appropriate tool function. Do not just describe what you would do; actually call the tool.

${liveSummary}

PERSONALITY: Warm, direct, articulate, slightly witty. Like a sharp, trusted personal chief-of-staff who deeply knows this person. Keep replies concise (under 160 words) unless asked for deep explanations. Use **bold** for key info. After executing an action, confirm what was done in 1-2 sentences and mention any follow-up implications.

IMPORTANT RULES:
- For ANY create/add/log/update/delete request → use the tool immediately, don't ask for confirmation unless ambiguous
- For read/query/show requests → use get_domain_data tool to fetch fresh data and answer from it
- For scheduling or availability queries → use find_free_time or propose_schedule_slot to calculate slots deterministically. Never invent timeslots
- If a user says "undo" → call undo_last_action
- If a user says "reset all data" → call reset_all_data (and warn them first)
- Always be proactive: if adding a task with a deadline, mention if it conflicts with NSS meetings, gym sessions, or family calls`;
  },

  // ================================================================
  // TOOL DEFINITIONS — Gemini function declarations
  // ================================================================
  TOOLS: [
    {
      name: 'manage_user_memory',
      description: 'Record or retrieve personal facts, preferences, background, and life details about Krishna. Call this whenever the user shares facts about themselves (birthday, work, diet, study, priorities, family, habits).',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: { type: 'STRING', enum: ['add', 'delete', 'list'], description: 'Action to perform' },
          content: { type: 'STRING', description: 'The personal fact or preference to remember' },
          type: { type: 'STRING', enum: ['fact', 'preference', 'episodic', 'goal_context'], description: 'Category of memory' },
          id: { type: 'STRING', description: 'Memory ID (for delete)' }
        },
        required: ['action']
      }
    },
    {
      name: 'clear_mock_data',
      description: 'Clear the dummy / predicate mock data from LifeOS to start fresh with real personal data. Safely preserves profile and settings.',
      parameters: {
        type: 'OBJECT',
        properties: {
          confirm: { type: 'BOOLEAN', description: 'Confirm clearing mock data' }
        },
        required: ['confirm']
      }
    },
    {
      name: 'update_user_profile',
      description: 'Update the user profile, role, motto, timezone, or daily rhythm targets when user fills in questionnaire details.',
      parameters: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'Full or preferred name' },
          role: { type: 'STRING', description: 'Occupation or field of study' },
          timezone: { type: 'STRING', description: 'User timezone' },
          motto: { type: 'STRING', description: 'Personal motto or philosophy' }
        }
      }
    },
    {
      name: 'manage_tasks',
      description: 'Add, update, delete, mark done, or list tasks and projects in Krishna\'s task pipeline.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: { type: 'STRING', enum: ['add', 'update', 'delete', 'mark_done', 'list', 'search'], description: 'Operation to perform' },
          id: { type: 'NUMBER', description: 'Task ID (for update/delete/mark_done)' },
          title: { type: 'STRING', description: 'Task title (for add/search)' },
          priority: { type: 'STRING', enum: ['high', 'medium', 'low'], description: 'Task priority' },
          deadline: { type: 'STRING', description: 'Deadline date in YYYY-MM-DD format' },
          project: { type: 'STRING', description: 'Project or domain this task belongs to' },
          status: { type: 'STRING', enum: ['todo', 'in-progress', 'done'], description: 'Task status (for update)' },
          filter: { type: 'STRING', enum: ['pending', 'done', 'today', 'all'], description: 'Filter for list action' },
          query: { type: 'STRING', description: 'Search query (for search action)' }
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
          action: { type: 'STRING', enum: ['add', 'update', 'delete', 'list', 'update_progress', 'complete_milestone'], description: 'Operation' },
          id: { type: 'NUMBER', description: 'Goal ID' },
          title: { type: 'STRING', description: 'Goal title' },
          emoji: { type: 'STRING', description: 'Emoji for the goal' },
          category: { type: 'STRING', description: 'Category like Study, Fitness, Finance, Dev' },
          target: { type: 'STRING', description: 'Target date YYYY-MM-DD' },
          progress: { type: 'NUMBER', description: 'Progress 0-100' },
          milestone_title: { type: 'STRING', description: 'Milestone title to mark done' }
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
          action: { type: 'STRING', enum: ['add', 'update', 'delete', 'list'], description: 'Operation' },
          id: { type: 'NUMBER', description: 'Event ID' },
          title: { type: 'STRING', description: 'Event title' },
          date: { type: 'STRING', description: 'Date in YYYY-MM-DD format' },
          time: { type: 'STRING', description: 'Time in HH:MM format' },
          duration: { type: 'NUMBER', description: 'Duration in minutes' },
          type: { type: 'STRING', description: 'Event type: class, exam, fitness, study, personal, work' },
          filter_date: { type: 'STRING', description: 'Filter events by this date (for list)' }
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
          action: { type: 'STRING', enum: ['add_transaction', 'delete_transaction', 'update_budget', 'get_summary', 'set_savings'], description: 'Operation' },
          name: { type: 'STRING', description: 'Transaction name / description' },
          amount: { type: 'NUMBER', description: 'Amount. Negative for expense (e.g. -280), positive for income (e.g. 4000)' },
          category: { type: 'STRING', description: 'Category: Food, Transport, Entertainment, Shopping, Fitness, Income, Utilities, etc.' },
          id: { type: 'NUMBER', description: 'Transaction ID (for delete)' },
          budget_limit: { type: 'NUMBER', description: 'Budget limit for update_budget' },
          savings_amount: { type: 'NUMBER', description: 'New savings total for set_savings' }
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
          action: { type: 'STRING', enum: ['log_workout', 'update_measurements', 'add_pr', 'get_summary'], description: 'Operation' },
          workout_name: { type: 'STRING', description: 'Workout name e.g. Pull Day, Push Day, Leg Day, Cardio' },
          duration: { type: 'NUMBER', description: 'Duration in minutes' },
          notes: { type: 'STRING', description: 'Workout notes or exercises' },
          weight: { type: 'NUMBER', description: 'Body weight in kg (for update_measurements)' },
          body_fat: { type: 'NUMBER', description: 'Body fat % (for update_measurements)' },
          exercise: { type: 'STRING', description: 'Exercise name (for add_pr)' },
          pr_value: { type: 'STRING', description: 'PR value e.g. "85kg x5" (for add_pr)' }
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
          action: { type: 'STRING', enum: ['log_meal', 'update_today', 'set_water', 'get_summary'], description: 'Operation' },
          meal_name: { type: 'STRING', description: 'Meal name: Breakfast, Lunch, Dinner, Snack, Pre-workout' },
          items: { type: 'STRING', description: 'Comma-separated food items' },
          calories: { type: 'NUMBER', description: 'Calories in the meal' },
          protein: { type: 'NUMBER', description: 'Protein in grams' },
          water: { type: 'NUMBER', description: 'Water consumed today in litres (for set_water)' },
          time: { type: 'STRING', description: 'Time of meal HH:MM' }
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
          action: { type: 'STRING', enum: ['list', 'update_topic', 'update_progress', 'add_subject'], description: 'Operation' },
          subject_id: { type: 'NUMBER', description: 'Subject ID (1=OS, 2=DBMS, 3=Networks)' },
          subject_name: { type: 'STRING', description: 'Subject name (to find by name)' },
          topic_name: { type: 'STRING', description: 'Topic name to update' },
          topic_status: { type: 'STRING', enum: ['done', 'partial', 'todo'], description: 'Topic completion status' },
          progress: { type: 'NUMBER', description: 'Overall subject progress 0-100' }
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
          action: { type: 'STRING', enum: ['set_mood', 'set_stress', 'log_break', 'get_summary'], description: 'Operation' },
          mood: { type: 'NUMBER', description: 'Mood score 1-5 (1=very bad, 5=excellent)' },
          stress: { type: 'NUMBER', description: 'Stress level 1-5 (1=none, 5=overwhelming)' },
          break_type: { type: 'STRING', description: 'Type of break: Walk, Stretch, Rest, Meditation' },
          break_duration: { type: 'STRING', description: 'Break duration e.g. "10 min"' }
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
          action: { type: 'STRING', enum: ['add_grocery', 'complete_grocery', 'delete_grocery', 'add_wishlist', 'delete_wishlist', 'get_list'], description: 'Operation' },
          item: { type: 'STRING', description: 'Item name' },
          qty: { type: 'STRING', description: 'Quantity e.g. "2", "500g", "1 dozen"' },
          price: { type: 'STRING', description: 'Price for wishlist items e.g. "₹4,500"' },
          priority: { type: 'STRING', enum: ['high', 'medium', 'low'], description: 'Wishlist item priority' }
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
          action: { type: 'STRING', enum: ['add', 'update', 'delete', 'list', 'mark_contacted'], description: 'Operation' },
          id: { type: 'NUMBER', description: 'Contact ID' },
          name: { type: 'STRING', description: 'Contact name' },
          category: { type: 'STRING', description: 'Category: Family, Friend, Mentor, Classmate, Colleague' },
          notes: { type: 'STRING', description: 'Notes about the contact' },
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
          action: { type: 'STRING', enum: ['add', 'delete', 'search', 'list'], description: 'Operation' },
          id: { type: 'NUMBER', description: 'Note ID (for delete)' },
          title: { type: 'STRING', description: 'Note/idea title' },
          preview: { type: 'STRING', description: 'Content or summary of the note' },
          type: { type: 'STRING', description: 'Note, Idea, Book Note, Journal, Project Idea' },
          tags: { type: 'STRING', description: 'Comma-separated tags' },
          query: { type: 'STRING', description: 'Search query' }
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
          action: { type: 'STRING', enum: ['mark_done', 'add_step', 'reset', 'get_status'], description: 'Operation' },
          routine: { type: 'STRING', enum: ['morning', 'night'], description: 'Which routine' },
          task_name: { type: 'STRING', description: 'Task name within the routine' },
          time: { type: 'STRING', description: 'Time for new step HH:MM' }
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
          action: { type: 'STRING', enum: ['add_subscription', 'delete_subscription', 'update_subscription', 'list'], description: 'Operation' },
          name: { type: 'STRING', description: 'Service name e.g. Netflix, Spotify' },
          amount: { type: 'NUMBER', description: 'Cost amount' },
          period: { type: 'STRING', description: 'Billing period: mo, yr' },
          renewal: { type: 'STRING', description: 'Renewal date YYYY-MM-DD' },
          status: { type: 'STRING', description: 'active, paused, cancelled' }
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
            enum: ['tasks', 'goals', 'calendar', 'finance', 'fitness', 'nutrition', 'study', 'wellbeing', 'shopping', 'relationships', 'knowledge', 'routines', 'digital_life', 'vehicle', 'travel', 'entertainment', 'documents', 'home', 'analytics', 'all'],
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
  async executeTool(name, args, options) {
    if (typeof window !== 'undefined' && window.ToolRegistry && window.ToolRegistry.getTool(name)) {
      return await window.ToolRegistry.execute(name, args, options);
    }
    try {
      switch (name) {

        // ---- USER MEMORY & PROFILE ----
        case 'manage_user_memory': {
          const { action, content, type, id } = args;
          if (typeof window !== 'undefined' && window.Memory) {
            if (action === 'add' && content) {
              const item = window.Memory.add(type || 'fact', content, 'user_direct');
              return { ok: true, result: { message: `Remembered: "${content}"`, id: item.id } };
            }
            if (action === 'delete' && id) {
              window.Memory.delete(id);
              return { ok: true, result: { message: 'Memory deleted.' } };
            }
            if (action === 'list') {
              return { ok: true, result: window.Memory.list() };
            }
          }
          return { ok: true, result: { message: 'Memory recorded.' } };
        }

        case 'clear_mock_data': {
          if (typeof DB !== 'undefined' && typeof DB.clearMockData === 'function') {
            DB.clearMockData();
            return { ok: true, result: { message: 'Mock data cleared cleanly. LifeOS is ready for your real data.' } };
          }
          return { ok: false, error: 'Database clearMockData not available.' };
        }

        case 'update_user_profile': {
          if (typeof DB !== 'undefined' && DB.user && DB.user.update) {
            const updated = DB.user.update(args);
            return { ok: true, result: updated };
          }
          return { ok: true, result: args };
        }

        // ---- TASKS ----
        case 'manage_tasks': {
          const { action, id, title, priority, deadline, project, status, filter, query } = args;
          if (action === 'add') return { ok: true, result: DB.tasks.add({ title, priority, deadline, project }) };
          if (action === 'update') return { ok: true, result: DB.tasks.update(id, { title, priority, deadline, project, status }) };
          if (action === 'delete') return { ok: true, result: DB.tasks.delete(id) };
          if (action === 'mark_done') return { ok: true, result: DB.tasks.markDone(id) };
          if (action === 'list') return { ok: true, result: DB.tasks.list(filter || 'pending') };
          if (action === 'search') return { ok: true, result: DB.tasks.search(query || '') };
          break;
        }

        // ---- GOALS ----
        case 'manage_goals': {
          const { action, id, title, emoji, category, target, progress, milestone_title } = args;
          if (action === 'add') return { ok: true, result: DB.goals.add({ title, emoji, category, target }) };
          if (action === 'update') return { ok: true, result: DB.goals.update(id, { title, emoji, category, target }) };
          if (action === 'delete') return { ok: true, result: DB.goals.delete(id) };
          if (action === 'list') return { ok: true, result: DB.goals.list() };
          if (action === 'update_progress') return { ok: true, result: DB.goals.updateProgress(id, progress) };
          if (action === 'complete_milestone') return { ok: true, result: DB.goals.completeMilestone(id, milestone_title) };
          break;
        }

        // ---- CALENDAR ----
        case 'manage_calendar': {
          const { action, id, title, date, time, duration, type, filter_date } = args;
          if (action === 'add') return { ok: true, result: DB.calendar.add({ title, date, time, duration, type }) };
          if (action === 'update') return { ok: true, result: DB.calendar.update(id, { title, date, time, duration, type }) };
          if (action === 'delete') return { ok: true, result: DB.calendar.delete(id) };
          if (action === 'list') return { ok: true, result: DB.calendar.list(filter_date) };
          break;
        }

        // ---- FINANCE ----
        case 'manage_finance': {
          const { action, name, amount, category, id, budget_limit, savings_amount } = args;
          if (action === 'add_transaction') return { ok: true, result: DB.finance.addTransaction({ name, amount, category, icon: amount >= 0 ? '💰' : '💸' }) };
          if (action === 'delete_transaction') return { ok: true, result: DB.finance.deleteTransaction(id) };
          if (action === 'update_budget') return { ok: true, result: DB.finance.updateBudget(category, { limit: budget_limit }) || 'updated' };
          if (action === 'set_savings') return { ok: true, result: DB.finance.setSavings(savings_amount) || 'updated' };
          if (action === 'get_summary') return { ok: true, result: DB.finance.get() };
          break;
        }

        // ---- FITNESS ----
        case 'manage_fitness': {
          const { action, workout_name, duration, notes, weight, body_fat, exercise, pr_value } = args;
          if (action === 'log_workout') return { ok: true, result: DB.fitness.logWorkout({ name: workout_name, duration, notes }) };
          if (action === 'update_measurements') {
            const patch = {};
            if (weight !== undefined) patch.weight = weight;
            if (body_fat !== undefined) patch.bodyFat = body_fat;
            return { ok: true, result: DB.fitness.updateMeasurements(patch) };
          }
          if (action === 'add_pr') return { ok: true, result: DB.fitness.addPR({ exercise, value: pr_value }) };
          if (action === 'get_summary') return { ok: true, result: DB.fitness.get() };
          break;
        }

        // ---- NUTRITION ----
        case 'manage_nutrition': {
          const { action, meal_name, items, calories, protein, water, time } = args;
          if (action === 'log_meal') return { ok: true, result: DB.nutrition.logMeal({ name: meal_name, time: time || Utils.timeNow(), items: (items || '').split(',').map(s => s.trim()), calories: calories || 0, protein: protein || 0 }) };
          if (action === 'set_water') return { ok: true, result: DB.nutrition.setWater(water) || 'updated' };
          if (action === 'get_summary') return { ok: true, result: DB.nutrition.get() };
          if (action === 'update_today') { DB.nutrition.updateToday({ calories, protein }); return { ok: true, result: 'updated' }; }
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
          if (action === 'list') return { ok: true, result: DB.study.list() };
          if (action === 'update_topic') return { ok: true, result: DB.study.updateTopic(sid, topic_name, topic_status) };
          if (action === 'update_progress') return { ok: true, result: DB.study.updateProgress(sid, progress) };
          if (action === 'add_subject') return { ok: true, result: DB.study.addSubject({ name: subject_name }) };
          break;
        }

        // ---- WELLBEING ----
        case 'manage_wellbeing': {
          const { action, mood, stress, break_type, break_duration } = args;
          if (action === 'set_mood') return { ok: true, result: DB.wellbeing.setMood(mood) || { mood } };
          if (action === 'set_stress') return { ok: true, result: DB.wellbeing.setStress(stress) || { stress } };
          if (action === 'log_break') return { ok: true, result: DB.wellbeing.logBreak({ type: break_type, duration: break_duration, time: Utils.timeNow() }) || 'logged' };
          if (action === 'get_summary') return { ok: true, result: DB.wellbeing.get() };
          break;
        }

        // ---- SHOPPING ----
        case 'manage_shopping': {
          const { action, item, qty, price, priority } = args;
          if (action === 'add_grocery') return { ok: true, result: DB.shopping.addGrocery({ item, qty }) || 'added' };
          if (action === 'complete_grocery') return { ok: true, result: DB.shopping.completeGrocery(item) || 'done' };
          if (action === 'delete_grocery') return { ok: true, result: DB.shopping.deleteGrocery(item) || 'deleted' };
          if (action === 'add_wishlist') return { ok: true, result: DB.shopping.addWishlist({ item, price, priority }) || 'added' };
          if (action === 'delete_wishlist') return { ok: true, result: DB.shopping.deleteWishlist(item) || 'deleted' };
          if (action === 'get_list') return { ok: true, result: DB.shopping.get() };
          break;
        }

        // ---- RELATIONSHIPS ----
        case 'manage_relationships': {
          const { action, id, name, category, notes, birthday } = args;
          if (action === 'add') return { ok: true, result: DB.relationships.add({ name, category, notes, birthday, emoji: '👤' }) };
          if (action === 'update') return { ok: true, result: DB.relationships.update(id, { name, category, notes }) };
          if (action === 'delete') return { ok: true, result: DB.relationships.delete(id) };
          if (action === 'list') return { ok: true, result: DB.relationships.list() };
          if (action === 'mark_contacted') {
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
          if (action === 'add') return { ok: true, result: DB.knowledge.add({ title, preview, type: type || 'Note', tags: tags ? tags.split(',').map(t => t.trim()) : [] }) };
          if (action === 'delete') return { ok: true, result: DB.knowledge.delete(id) };
          if (action === 'search') return { ok: true, result: DB.knowledge.search(query || title || '') };
          if (action === 'list') return { ok: true, result: DB.knowledge.list() };
          break;
        }

        // ---- ROUTINES ----
        case 'manage_routines': {
          const { action, routine, task_name, time } = args;
          if (action === 'mark_done') return { ok: true, result: DB.routines.markDone(routine, task_name) };
          if (action === 'add_step') return { ok: true, result: DB.routines.addStep(routine, { task: task_name, time }) || 'added' };
          if (action === 'reset') return { ok: true, result: DB.routines.resetDay() || 'reset' };
          if (action === 'get_status') return { ok: true, result: DB.routines.get() };
          break;
        }

        // ---- DIGITAL LIFE ----
        case 'manage_digital_life': {
          const { action, name, amount, period, renewal, status } = args;
          if (action === 'add_subscription') return { ok: true, result: DB.digitalLife.addSubscription({ name, amount, period, renewal, status: status || 'active' }) || 'added' };
          if (action === 'delete_subscription') return { ok: true, result: DB.digitalLife.deleteSubscription(name) || 'deleted' };
          if (action === 'update_subscription') return { ok: true, result: DB.digitalLife.updateSubscription(name, { amount, period, renewal, status }) || 'updated' };
          if (action === 'list') return { ok: true, result: DB.digitalLife.get() };
          break;
        }

        // ---- GET DOMAIN DATA ----
        case 'get_domain_data': {
          const { domain } = args;
          const dataMap = {
            tasks: () => DB.tasks.list(),
            goals: () => DB.goals.list(),
            calendar: () => DB.calendar.list(),
            finance: () => DB.finance.get(),
            fitness: () => DB.fitness.get(),
            nutrition: () => DB.nutrition.get(),
            study: () => DB.study.list(),
            wellbeing: () => DB.wellbeing.get(),
            shopping: () => DB.shopping.get(),
            relationships: () => DB.relationships.list(),
            knowledge: () => DB.knowledge.list(),
            routines: () => DB.routines.get(),
            digital_life: () => DB.digitalLife.get(),
            vehicle: () => DB.vehicle.get(),
            travel: () => DB.travel.list(),
            entertainment: () => DB.entertainment.list(),
            documents: () => DB.documents.list(),
            home: () => DB.homeModule.get(),
            analytics: () => DB.analytics.get(),
            all: () => DB.buildAISummary()
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
    } catch (e) {
      console.error(`Tool execution error [${name}]:`, e);
      return { ok: false, error: e.message };
    }
    return { ok: false, error: 'Action not handled' };
  },

  // ================================================================
  // GEMINI API CALL (with 30s timeout via AbortController)
  // ================================================================
  async _call(key, model, body, attempt = 0) {
    const cleanModel = (model || this.DEFAULT_MODEL).trim().replace(/^models\//, '');
    const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 30000) : null;
    let res;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cleanModel)}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify(body),
          signal: controller ? controller.signal : undefined
        }
      );
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Gemini request timed out after 30 seconds.');
      }
      throw err;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const j = await res.json(); msg = (j?.error?.message) || msg; } catch (e) { }

      // Automatic fallback on temporary capacity spike (503) or retired model (404)
      if ((res.status === 503 || res.status === 404) && attempt < 2) {
        const fallback = (cleanModel !== 'gemini-flash-lite-latest') ? 'gemini-flash-lite-latest' : 'gemini-3.5-flash-lite';
        console.warn(`[AI] Model "${cleanModel}" returned ${res.status} (${msg}). Auto-failing over to high-availability fallback "${fallback}"...`);
        try {
          const fallbackRes = await this._call(key, fallback, body, attempt + 1);
          this.setModel(fallback);
          if (typeof document !== 'undefined') {
            const badge = document.getElementById('reactor-model-badge');
            if (badge) badge.textContent = fallback.replace(/^gemini-/, 'Gemini ').replace(/-/g, ' ');
          }
          return fallbackRes;
        } catch (fallbackErr) {
          console.warn('[AI] Fallback model failed:', fallbackErr);
        }
      }

      if (res.status === 403) msg = 'Invalid or unauthorized API key.';
      else if (res.status === 404) msg = `Model "${cleanModel}" not found or retired. Switched to ${this.DEFAULT_MODEL}.`;
      else if (res.status === 429) msg = 'Rate limit reached. Please wait a moment.';
      else if (res.status === 503) msg = 'Gemini servers busy. Try again in a moment or switch to Gemini Flash Lite.';
      throw new Error(msg);
    }
    return res.json();
  },

  // Format history for OpenAI and Claude standard APIs
  _buildStandardHistory(history) {
    return (history || [])
      .filter(m => m && (m.role === 'user' || m.role === 'tadashi') && (m.text || m.content))
      .slice(-10)
      .map(m => ({
        role: m.role === 'tadashi' ? 'assistant' : 'user',
        content: m.text || m.content
      }));
  },

  // ----------------------------------------------------------------
  // OPENAI (CHATGPT) & OPENROUTER EXECUTION
  // ----------------------------------------------------------------
  async _callOpenAI(key, model, message, history, { onToolCall, onApprovalRequest } = {}, endpoint = 'https://api.openai.com/v1/chat/completions') {
    const headers = { 'Content-Type': 'application/json' };
    if (key) headers['Authorization'] = `Bearer ${key}`;
    if (endpoint.includes('openrouter.ai')) {
      headers['HTTP-Referer'] = 'https://tadashi.lifeos';
      headers['X-Title'] = 'TADASHI LifeOS';
    }

    const messages = [
      { role: 'system', content: this.buildSystemPrompt() },
      ...this._buildStandardHistory(history),
      { role: 'user', content: message }
    ];

    const availableTools = (typeof window !== 'undefined' && window.ToolRegistry)
      ? window.ToolRegistry.getGeminiDeclarations()
      : this.TOOLS;

    const tools = availableTools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));

    let rounds = 0;
    while (rounds < 4) {
      rounds++;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          tools,
          tool_choice: 'auto',
          temperature: 0.7
        })
      });

      if (!res.ok) {
        let errText = `HTTP ${res.status}`;
        try { const j = await res.json(); errText = j?.error?.message || errText; } catch(e) {}
        throw new Error(`Provider Error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      const msg = choice?.message;
      if (!msg) throw new Error('Empty response from AI model.');

      messages.push(msg);

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        for (const call of msg.tool_calls) {
          const fnName = call.function.name;
          let fnArgs = {};
          try { fnArgs = JSON.parse(call.function.arguments); } catch(e) {}
          const execRes = await this.executeTool(fnName, fnArgs, { onApprovalRequest });
          if (onToolCall) onToolCall(fnName, fnArgs, execRes);
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(execRes)
          });
        }
      } else {
        return msg.content || '';
      }
    }
    return messages[messages.length - 1]?.content || 'Action executed.';
  },

  // ----------------------------------------------------------------
  // ANTHROPIC CLAUDE EXECUTION (Direct browser-enabled)
  // ----------------------------------------------------------------
  async _callClaude(key, model, message, history, { onToolCall, onApprovalRequest } = {}) {
    const messages = [
      ...this._buildStandardHistory(history),
      { role: 'user', content: message }
    ];

    const availableTools = (typeof window !== 'undefined' && window.ToolRegistry)
      ? window.ToolRegistry.getGeminiDeclarations()
      : this.TOOLS;

    const tools = availableTools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters
    }));

    let rounds = 0;
    while (rounds < 4) {
      rounds++;
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model,
          max_tokens: 1500,
          system: this.buildSystemPrompt(),
          messages,
          tools
        })
      });

      if (!res.ok) {
        let errText = `HTTP ${res.status}`;
        try { const j = await res.json(); errText = j?.error?.message || errText; } catch(e) {}
        throw new Error(`Claude Error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const content = data.content || [];
      const toolUses = content.filter(p => p.type === 'tool_use');

      if (toolUses.length > 0) {
        messages.push({ role: 'assistant', content });
        const toolResults = [];
        for (const tu of toolUses) {
          const execRes = await this.executeTool(tu.name, tu.input || {}, { onApprovalRequest });
          if (onToolCall) onToolCall(tu.name, tu.input || {}, execRes);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: JSON.stringify(execRes)
          });
        }
        messages.push({ role: 'user', content: toolResults });
      } else {
        const textBlock = content.find(p => p.type === 'text');
        return textBlock ? textBlock.text : '';
      }
    }
    return 'Action executed.';
  },

  // ----------------------------------------------------------------
  // GEMINI EXECUTION
  // ----------------------------------------------------------------
  async _chatGemini(message, history, { onToolCall, onApprovalRequest } = {}) {
    // Transparently route through AIRouter when Gateway (OmniRoute/FreeLLMAPI) is enabled,
    // when local-only privacy is set, or when no Gemini cloud key is configured.
    if (typeof window !== 'undefined' && window.AIRouter && typeof window.AIRouter.chat === 'function') {
      const gatewayActive = window.GatewayProvider && typeof window.GatewayProvider.isEnabled === 'function' && window.GatewayProvider.isEnabled();
      const noGeminiKey = !this.hasKey();
      const localOnly = typeof window.AIRouter.getPrivacyMode === 'function' && window.AIRouter.getPrivacyMode() === 'local_only';

      if (gatewayActive || noGeminiKey || localOnly) {
        try {
          const res = await window.AIRouter.chat(message, history, { onToolCall, onApprovalRequest });
          if (res && typeof res.text === 'string') return res.text;
        } catch (routerErr) {
          if (!this.hasKey() || localOnly) throw routerErr;
          console.warn('AIRouter call failed; attempting direct Gemini fallback:', routerErr);
        }
      }
    }

    const key = this.getKey();
    if (!key) throw new Error('No API key configured. Provide a Gemini Key, or configure OmniRoute / FreeLLMAPI in Settings.');
    const model = this.getModel();

    // Build conversation turns
    const turns = this._buildTurns(history, message);

    // Tool declarations for Gemini (pulled dynamically from typed registry if available)
    const availableTools = (typeof window !== 'undefined' && window.ToolRegistry)
      ? window.ToolRegistry.getGeminiDeclarations()
      : this.TOOLS;

    const toolDeclarations = [{
      functionDeclarations: availableTools.map(t => ({
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

    // ---- Function calling loop (max 4 rounds, handles multiple tool calls per turn) ----
    let rounds = 0;
    while (rounds < 4) {
      const candidate = response?.candidates?.[0];
      if (!candidate) break;

      const parts = candidate?.content?.parts || [];
      const fnCalls = parts.filter(p => p.functionCall);

      if (!fnCalls.length) break; // No tool calls — we have the final text answer

      const responseParts = [];
      for (const call of fnCalls) {
        // Execute each tool through Policy Layer
        const { name, args } = call.functionCall;
        let toolResult;

        if (typeof window !== 'undefined' && window.ToolRegistry && window.ToolRegistry.getTool(name)) {
          // Evaluate approval gate first
          const check = await window.ToolRegistry.execute(name, args, { isApproved: false });
          if (check.approvalRequired) {
            if (typeof onApprovalRequest === 'function') {
              const approved = await onApprovalRequest(check.proposal);
              if (approved) {
                toolResult = await window.ToolRegistry.execute(name, args, { isApproved: true, idempotencyKey: check.proposal.id });
              } else {
                toolResult = { ok: false, rejected: true, error: 'User declined the action proposal.' };
              }
            } else {
              toolResult = { ok: false, approvalRequired: true, error: 'Action requires explicit user confirmation before executing.' };
            }
          } else {
            toolResult = check;
          }
        } else {
          toolResult = await this.executeTool(name, args);
        }

        // Notify UI
        if (onToolCall) {
          try { onToolCall(name, args, toolResult); } catch (e) { }
        }

        // Collect functionResponse part
        responseParts.push({
          functionResponse: {
            name,
            response: { content: JSON.stringify(toolResult.result ?? toolResult.error ?? toolResult) }
          }
        });
      }

      // Append model turn (the function calls) + function responses turn
      turns.push({ role: 'model', parts });
      turns.push({ role: 'user', parts: responseParts });

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

  // ----------------------------------------------------------------
  // MULTI-PROVIDER ROUTE DISPATCHER
  // ----------------------------------------------------------------
  async _dispatchChat(providerId, message, history, options = {}) {
    if (providerId === 'claude') {
      const key = this.getKey('claude');
      const model = this.getModel('claude');
      return await this._callClaude(key, model, message, history, options);
    }
    if (providerId === 'openai') {
      const key = this.getKey('openai');
      const model = this.getModel('openai');
      return await this._callOpenAI(key, model, message, history, options, 'https://api.openai.com/v1/chat/completions');
    }
    if (providerId === 'openrouter') {
      const key = this.getKey('openrouter');
      const model = this.getModel('openrouter');
      return await this._callOpenAI(key, model, message, history, options, 'https://openrouter.ai/api/v1/chat/completions');
    }
    // Default to Gemini
    return await this._chatGemini(message, history, options);
  },

  // ================================================================
  // MAIN CHAT — with multi-provider dispatch & automatic resilient failover
  // ================================================================
  async chat(message, history, { onToolCall, onApprovalRequest } = {}) {
    // 1. Transparently check AIRouter when Gateway is explicitly enabled
    if (typeof window !== 'undefined' && window.AIRouter && typeof window.AIRouter.chat === 'function') {
      const gatewayActive = window.GatewayProvider && typeof window.GatewayProvider.isEnabled === 'function' && window.GatewayProvider.isEnabled();
      const localOnly = typeof window.AIRouter.getPrivacyMode === 'function' && window.AIRouter.getPrivacyMode() === 'local_only';
      if (gatewayActive || localOnly) {
        try {
          const res = await window.AIRouter.chat(message, history, { onToolCall, onApprovalRequest });
          if (res && typeof res.text === 'string') return res.text;
        } catch (routerErr) {
          if (localOnly) throw routerErr;
          console.warn('AIRouter call failed; attempting direct multi-provider fallback:', routerErr);
        }
      }
    }

    let activeProvider = this.getActiveProvider();
    let activeKey = this.getKey(activeProvider);

    if (!activeKey) {
      await this.syncEnvironmentConfig();
      activeProvider = this.getActiveProvider();
      activeKey = this.getKey(activeProvider);
    }

    if (!activeKey && this.getConfiguredProviders().length === 0) {
      const lower = (message || '').trim().toLowerCase();
      if (/^(hi|hello|hey|greetings|hola|howdy|sup|good (morning|afternoon|evening))\b/i.test(lower)) {
        return "Hello Krishna! I'm **TADASHI**, your personal LifeOS intelligence assistant. All 23 life domains are active and operational.\n\nTo unlock full conversational reasoning (like Google or ChatGPT) across any topic, connect your Gemini API key using the button below or paste it right into the chat!";
      }
      if (/^(intro|introduction|about|app ke bare me|introduce)\b/i.test(lower)) {
        return this.getIntroContent();
      }
      if (/^(summary|daily summary|status|aaj ka summary|today summary|tldr)\b/i.test(lower)) {
        return this.getSummaryContent();
      }
      throw new Error('No AI provider API key configured. Click "Configure AI Key" to connect Google Gemini, OpenAI (ChatGPT), or Anthropic Claude, or paste your API key directly here in chat.');
    }

    // Try primary active provider
    try {
      return await this._dispatchChat(activeProvider, message, history, { onToolCall, onApprovalRequest });
    } catch (primaryErr) {
      console.warn(`[AI] Primary provider "${activeProvider}" failed: ${primaryErr.message}`);

      // Resilient Auto-Failover: if active provider experiences downtime, 503, or rate limit, fail over to other configured keys!
      if (this.isAutoFailoverEnabled()) {
        const fallbacks = this.getConfiguredProviders().filter(p => p !== activeProvider);
        for (const alt of fallbacks) {
          console.warn(`[AI] Auto-failing over from "${activeProvider}" to secondary provider "${alt}"...`);
          try {
            const altResult = await this._dispatchChat(alt, message, history, { onToolCall, onApprovalRequest });
            if (typeof window !== 'undefined' && window.showToast) {
              const pName = this.PROVIDERS[alt] ? this.PROVIDERS[alt].name : alt;
              window.showToast(`${this.PROVIDERS[activeProvider]?.name || activeProvider} busy. Answered via ${pName}!`);
            }
            return altResult;
          } catch (altErr) {
            console.warn(`[AI] Fallback provider "${alt}" also failed:`, altErr);
          }
        }
      }

      throw primaryErr;
    }
  },

  // ----------------------------------------------------------------
  // TEST KEY METHOD — verifies keys against actual live endpoints
  // ----------------------------------------------------------------
  async testKey(key, providerId, model) {
    key = (key || '').trim();
    if (!key) throw new Error('Please enter an API key to test.');
    if (providerId && !this.PROVIDERS[providerId]) providerId = null;
    const detected = this.detectProvider(key);
    providerId = providerId || (detected && this.PROVIDERS[detected] ? detected : null) || this.getActiveProvider() || 'gemini';

    if (providerId === 'gemini') {
      const cleanModel = (model || this.PROVIDERS.gemini.defaultModel).trim().replace(/^models\//, '');
      await this._call(key, cleanModel, {
        contents: [{ role: 'user', parts: [{ text: 'Reply with exactly one word: OK' }] }],
        generationConfig: { maxOutputTokens: 10 }
      });
      return { ok: true, provider: 'gemini', message: 'Google Gemini verified successfully!' };
    }

    if (providerId === 'openai') {
      const m = model || this.PROVIDERS.openai.defaultModel;
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: m,
          messages: [{ role: 'user', content: 'Reply OK' }],
          max_tokens: 5
        })
      });
      if (!res.ok) {
        let err = `HTTP ${res.status}`;
        try { const j = await res.json(); err = j?.error?.message || err; } catch(e) {}
        throw new Error(err);
      }
      return { ok: true, provider: 'openai', message: 'OpenAI (ChatGPT) verified successfully!' };
    }

    if (providerId === 'claude') {
      const m = model || this.PROVIDERS.claude.defaultModel;
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: m,
          max_tokens: 5,
          messages: [{ role: 'user', content: 'Reply OK' }]
        })
      });
      if (!res.ok) {
        let err = `HTTP ${res.status}`;
        try { const j = await res.json(); err = j?.error?.message || err; } catch(e) {}
        throw new Error(err);
      }
      return { ok: true, provider: 'claude', message: 'Anthropic Claude verified successfully!' };
    }

    if (providerId === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      if (!res.ok) {
        let err = `HTTP ${res.status}`;
        try { const j = await res.json(); err = j?.error?.message || err; } catch(e) {}
        throw new Error(err);
      }
      return { ok: true, provider: 'openrouter', message: 'OpenRouter verified successfully!' };
    }

    return { ok: true, provider: providerId, message: 'Provider key saved.' };
  },

  async syncEnvironmentConfig() {
    if (this.getKey('gemini')) return;
    if (typeof fetch === 'undefined') return;
    try {
      const res = await fetch('/api/config');
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.geminiKey && !this.getKey('gemini')) {
          this.setKey(data.geminiKey, 'gemini');
        }
      }
    } catch(e) {}
  }
};

if (typeof window !== 'undefined') {
  AI.syncEnvironmentConfig().catch(() => {});
}
