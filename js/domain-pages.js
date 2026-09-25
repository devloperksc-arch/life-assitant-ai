// ============================================================
// TADASHI LifeOS — Dedicated Domain Pages Engine (All 22 Domains)
// Provides respective dedicated pages, real-time progress metrics,
// user direct editing (CRUD & toggles), and AI autonomous control.
// ============================================================

(function(window) {
  'use strict';

  // Domain Category Colors & Names
  const CATEGORY_META = {
    core:     { label: 'Core & Execution', color: '#00d4ff', bg: 'rgba(0,212,255,0.12)' },
    vitality: { label: 'Vitality & Health', color: '#6af7ba', bg: 'rgba(106,247,186,0.12)' },
    living:   { label: 'Living & Spaces',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    systems:  { label: 'Systems & Tools',  color: '#d0bcff', bg: 'rgba(208,188,255,0.12)' }
  };

  // Master 22 Domains Registry fallback
  const DOMAINS_REGISTRY = [
    { id: 'home', num: '01', name: 'Home Dashboard', cat: 'core', icon: 'dashboard', emoji: '🏠', tag: 'Active Overview', color: '#00d4ff' },
    { id: 'tadashi', num: '02', name: 'TADASHI AI & Voice', cat: 'core', icon: 'neurology', emoji: '🧠', tag: 'Gemini Online', color: '#00d4ff' },
    { id: 'calendar', num: '03', name: 'Schedule & Calendar', cat: 'core', icon: 'calendar_today', emoji: '📅', tag: '4 Events Today', color: '#00d4ff' },
    { id: 'tasks', num: '04', name: 'Tasks & Projects', cat: 'core', icon: 'check_circle', emoji: '✅', tag: '3 Urgent Pending', color: '#00d4ff' },
    { id: 'goals', num: '05', name: 'Goals & OKRs', cat: 'core', icon: 'flag', emoji: '🎯', tag: '3 Goals Active', color: '#00d4ff' },
    { id: 'study', num: '06', name: 'Study & Learning', cat: 'core', icon: 'school', emoji: '📚', tag: 'Exam in 6d', color: '#00d4ff' },
    { id: 'fitness', num: '07', name: 'Heavy · Fitness & Workout', cat: 'vitality', icon: 'fitness_center', emoji: '🏋️‍♂️', tag: 'HEAVY WORKOUT TRACKER', color: '#00d4ff' },
    { id: 'nutrition', num: '08', name: 'Nutrition & Diet', cat: 'vitality', icon: 'restaurant', emoji: '🥗', tag: '1,840 kcal', color: '#6af7ba' },
    { id: 'finance', num: '09', name: 'Finance & Wealth', cat: 'vitality', icon: 'payments', emoji: '💰', tag: '₹36.8k spend', color: '#6af7ba' },
    { id: 'wellbeing', num: '10', name: 'Wellbeing & Mood', cat: 'vitality', icon: 'self_improvement', emoji: '🧘', tag: 'Optimal (4/5)', color: '#6af7ba' },
    { id: 'shopping', num: '11', name: 'Shopping & Inventory', cat: 'living', icon: 'shopping_bag', emoji: '🛒', tag: '3 Items Pending', color: '#f59e0b' },
    { id: 'relationships', num: '12', name: 'Relationships', cat: 'living', icon: 'group', emoji: '👥', tag: 'Mom Bday 23:15', color: '#f59e0b' },
    { id: 'home-module', num: '13', name: 'Home Care', cat: 'living', icon: 'cottage', emoji: '🏡', tag: 'Clean & Organised', color: '#d0bcff' },
    { id: 'vehicle', num: '14', name: 'Vehicle Care', cat: 'living', icon: 'two_wheeler', emoji: '🏍️', tag: 'Fuel 72%', color: '#d0bcff' },
    { id: 'travel', num: '15', name: 'Travel & Trips', cat: 'living', icon: 'flight', emoji: '✈️', tag: 'Goa (October)', color: '#d0bcff' },
    { id: 'entertainment', num: '16', name: 'Entertainment', cat: 'living', icon: 'theater_comedy', emoji: '🎭', tag: '3 In-Progress', color: '#d0bcff' },
    { id: 'documents', num: '17', name: 'Document Vault', cat: 'systems', icon: 'folder_shared', emoji: '📁', tag: 'Encrypted Vault', color: '#00d4ff' },
    { id: 'knowledge', num: '18', name: 'Knowledge Base', cat: 'systems', icon: 'lightbulb', emoji: '💡', tag: '1,420 Notes', color: '#d0bcff' },
    { id: 'routines', num: '19', name: 'Routines & Habits', cat: 'systems', icon: 'bedtime', emoji: '🌅', tag: 'Streak 12d', color: '#6af7ba' },
    { id: 'digital-life', num: '20', name: 'Digital Life', cat: 'systems', icon: 'laptop', emoji: '💻', tag: '5 Subs Active', color: '#a8e8ff' },
    { id: 'analytics', num: '21', name: 'System Analytics', cat: 'systems', icon: 'query_stats', emoji: '📊', tag: 'LifeScore 84', color: '#00d4ff' },
    { id: 'settings', num: '22', name: 'Settings & Voice', cat: 'systems', icon: 'settings', emoji: '⚙️', tag: 'Gemini Active', color: '#00d4ff' }
  ];
  if (!window.DOMAINS || !window.DOMAINS.length) {
    window.DOMAINS = DOMAINS_REGISTRY;
  }

  // Alias map for consistent domain identification
  const ALIAS_MAP = {
    'homecare': 'home-module',
    'vault': 'documents',
    'digital': 'digital-life',
    'workspace': 'home'
  };

  function normalizeDomainId(id) {
    if (!id) return 'home';
    const clean = id.toLowerCase().trim();
    return ALIAS_MAP[clean] || clean;
  }

  // Active page state
  let currentDomainId = 'home';

  // Master open function
  function openDomainPage(id) {
    const domainId = normalizeDomainId(id);
    currentDomainId = domainId;

    // Desktop view switching
    if (typeof window.switchTab === 'function') {
      try { window.switchTab('view-domain-page'); } catch(e) {}
    }
    document.querySelectorAll('.view-panel').forEach(p => {
      p.classList.add('hidden');
      p.style.display = 'none';
    });
    const target = document.getElementById('view-domain-page');
    if (target) {
      target.classList.remove('hidden');
      target.style.display = 'block';
    }

    // Only update mobile view if on mobile screen
    if (window.innerWidth < 1024) {
      const mobileModal = document.getElementById('mobile-domains-modal');
      if (mobileModal) {
        mobileModal.classList.add('hidden');
        mobileModal.classList.remove('flex');
      }
      const mobileDomainView = document.getElementById('mobile-domain-view');
      if (mobileDomainView) {
        mobileDomainView.classList.remove('hidden');
        mobileDomainView.scrollIntoView({ behavior: 'smooth' });
      }
    }

    // Render the page contents
    renderDomainPage(domainId);

    // Hide redundant generic HUD subbar on dedicated domain pages to remove empty top space
    const hud = document.getElementById('hud-subbar');
    if (hud) hud.style.display = 'none';

    // Scroll instantly to top of main workspace
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const mainEl = document.querySelector('#desktop-app main') || document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;

    // Diagnostic log
    if (mainEl) {
      Array.from(mainEl.children).forEach(c => {
        const cs = window.getComputedStyle(c);
        if (cs.display !== 'none' || c.offsetHeight > 0) {
          console.warn(`[VISIBLE-CHECK] id="${c.id}" display="${cs.display}" offsetTop=${c.offsetTop} offsetHeight=${c.offsetHeight}`);
        }
      });
    }

    // Update URL hash for easy sharing/bookmarking
    try {
      history.replaceState(null, '', '#' + domainId);
    } catch(e) {}
  }

  // Master render function
  function renderDomainPage(id) {
    const domainId = normalizeDomainId(id);
    const domain = (window.DOMAINS || []).find(d => d.id === domainId) || {
      id: domainId, num: '00', name: domainId.toUpperCase(), cat: 'core', icon: 'dashboard', emoji: '❖', color: '#00d4ff'
    };

    const container = document.getElementById('view-domain-page');
    if (!container) return;

    // Build the respective domain content
    const contentHtml = getDomainSpecificHtml(domainId, domain);

    container.innerHTML = `
      <!-- Domain Top Navigation Bar & Breadcrumb -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-outline-variant/15">
        <div class="flex items-center gap-3">
          <button onclick="returnToDomainsHub()" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-surface hover:bg-surface-container border border-outline-variant/25 text-xs font-mono text-outline hover:text-white transition-all active:scale-95 group">
            <span class="material-symbols-outlined text-[16px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
            <span>All Domains Hub</span>
          </button>
          <span class="text-outline/40">/</span>
          <div class="flex items-center gap-2">
            <span class="text-sm font-mono font-semibold" style="color:${domain.color}">${domain.num} · ${domain.name}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider font-semibold" style="background:${CATEGORY_META[domain.cat]?.bg||'rgba(0,212,255,0.1)'};color:${CATEGORY_META[domain.cat]?.color||'#00d4ff'};border:1px solid ${CATEGORY_META[domain.cat]?.color||'#00d4ff'}30">
              ${CATEGORY_META[domain.cat]?.label||domain.cat}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/20 text-xs font-mono">
            <span class="w-2 h-2 rounded-full animate-pulse" style="background:${domain.color}"></span>
            <span class="text-outline">TADASHI AI Control:</span>
            <span class="text-tertiary font-semibold">Active</span>
          </div>
          <button onclick="quickDomainAIHelp('${domainId}')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-primary-container/20 to-secondary-container/20 border border-primary-container/40 text-primary-container hover:border-primary-container text-xs font-mono font-semibold transition-all active:scale-95 shadow-[0_0_12px_rgba(0,212,255,0.15)]">
            <span class="material-symbols-outlined text-[16px]">smart_toy</span>
            <span>AI Copilot</span>
          </button>
        </div>
      </div>

      <!-- Domain Hero Banner -->
      <div class="relative rounded-2xl glass-surface p-6 border border-outline-variant/20 overflow-hidden shadow-2xl">
        <div class="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-20" style="background:${domain.color}"></div>
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg border border-white/10 shrink-0" style="background:${domain.color}20;color:${domain.color}">
              <span class="material-symbols-outlined text-[36px]" style="font-variation-settings:'FILL' 1">${domain.icon}</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-2xl font-bold text-white tracking-tight">${domain.name}</h1>
                <span class="text-xl">${domain.emoji}</span>
              </div>
              <p class="text-xs text-outline mt-1 font-mono max-w-xl">
                ${getDomainDescription(domainId)}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button onclick="openDomainAddModal('${domainId}')" class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-container text-surface-container-lowest font-mono text-xs font-bold hover:bg-surface-tint cyan-glow active:scale-95 transition-all shadow-[0_0_18px_rgba(0,212,255,0.3)]">
              <span class="material-symbols-outlined text-[18px]">add_circle</span>
              <span>+ Add ${getDomainAddLabel(domainId)}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Domain Respective Interactive Body -->
      ${contentHtml}

      <!-- AI Autonomous Copilot & Edit Box -->
      <div class="rounded-2xl glass-surface p-6 border border-primary-container/25 shadow-xl relative overflow-hidden">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary-container text-[22px]">auto_fix_high</span>
            <h3 class="text-base font-semibold text-white">TADASHI AI Autonomous Copilot · ${domain.name}</h3>
          </div>
          <span class="text-[10px] font-mono px-2.5 py-1 rounded-full bg-secondary-container/30 text-secondary border border-secondary/40 font-semibold tracking-wider">
            AI-EDITABLE &amp; PERSISTENT
          </span>
        </div>
        <p class="text-xs text-outline font-mono mb-4">
          TADASHI has full programmatic agency over this domain. Trigger autonomous optimizations below or provide direct natural language instructions.
        </p>

        <!-- Domain-Specific AI Quick Actions -->
        <div class="flex flex-wrap gap-2.5 mb-4" id="ai-quick-actions-${domainId}">
          ${getDomainAIActionButtons(domainId)}
        </div>

        <!-- AI Input Form -->
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-container text-[18px]">chat</span>
            <input type="text" id="domain-ai-prompt-${domainId}" placeholder="Instruct TADASHI to add, update, reschedule, or rebalance this domain..." 
                   class="w-full bg-surface-container-lowest/80 border border-outline-variant/30 focus:border-primary-container rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder:text-outline/50 font-mono outline-none transition-colors"
                   onkeydown="if(event.key==='Enter') executeDomainAIPrompt('${domainId}')" />
          </div>
          <button onclick="executeDomainAIPrompt('${domainId}')" class="px-5 py-3 rounded-xl bg-gradient-to-r from-primary-container to-surface-tint text-surface-container-lowest font-mono text-xs font-bold cyan-glow hover:opacity-95 active:scale-95 transition-all flex items-center gap-1.5 shrink-0">
            <span>Execute</span>
            <span class="material-symbols-outlined text-[16px]">send</span>
          </button>
        </div>
      </div>
    `;

    // Also update mobile domain view if present
    const mobileContainer = document.getElementById('mobile-domain-view-content');
    if (mobileContainer) {
      mobileContainer.innerHTML = container.innerHTML;
    }
  }

  function returnToDomainsHub() {
    const hud = document.getElementById('hud-subbar');
    if (hud) hud.style.display = 'flex';
    if (typeof window.switchTab === 'function') {
      window.switchTab('view-manage');
    } else {
      document.querySelectorAll('.view-panel').forEach(p => p.classList.add('hidden'));
      const target = document.getElementById('view-manage');
      if (target) target.classList.remove('hidden');
    }
    const mobileDomainView = document.getElementById('mobile-domain-view');
    if (mobileDomainView) mobileDomainView.classList.add('hidden');
    try { history.replaceState(null, '', '#manage'); } catch(e) {}
  }

  function getDomainDescription(id) {
    const descs = {
      'home': 'Central executive cockpit, priority matrix, cognitive energy tracking, and unified daily telemetry.',
      'tadashi': 'Autonomous conversational intelligence with speech synthesis, function calling, and invariant safety.',
      'calendar': 'Energy-aligned time blocking, conflict avoidance, dynamic scheduling, and event agenda.',
      'tasks': 'Prioritized commitment pipeline, project hierarchies, sprint velocity, and task completion.',
      'goals': 'Quarterly objectives, measurable key results (OKRs), milestone tracking, and completion telemetry.',
      'study': 'Operating Systems exam countdown, formula drills, assignment tracking, and active retention.',
      'fitness': 'HEAVY workout tracker: live log sets x reps x kg, rest timer, Big 4 PRs, 1RM calculator & routine splits.',
      'nutrition': 'Caloric & macronutrient balance, clean hydration tracking, meal timing, and dietary planning.',
      'finance': 'Monthly budget allocations, liquid net balance, transaction categorization, and savings goals.',
      'wellbeing': 'Emotional equilibrium, daily mood check-ins, sleep architecture, and stress recovery intervals.',
      'shopping': 'Smart inventory tracking, grocery essentials, and prioritized wishlist items with budget estimates.',
      'relationships': 'Interaction cadences, meaningful touchpoints, milestone alerts, and contact interaction notes.',
      'home-module': 'Household maintenance schedules, cleaning rotations, appliance care, and utility tracking.',
      'vehicle': 'Odometer telemetry, fuel efficiency logs, service countdowns, and maintenance records.',
      'travel': 'Upcoming trip itineraries, interactive packing checklists, flight reservations, and trip timelines.',
      'entertainment': 'Reading lists with progress percentage, movie watchlists, media backlogs, and recreational balance.',
      'documents': 'Encrypted document vault, expiration alert timelines, categorization, and digital backups.',
      'knowledge': 'Second-brain digital garden, concept synthesis, reference notes, and study bookmarks.',
      'routines': 'Morning wake protocols, evening neuro-reset, habit streaks, and behavioral consistency design.',
      'digital-life': 'Active subscription audits, cloud storage hygiene, digital clutter reduction, and tool management.',
      'analytics': 'Holistic Life Quality Index (84/100), domain health balance radar, and predictive trend metrics.',
      'settings': 'Google Gemini API configuration, voice parameters, autonomy thresholds, and database management.'
    };
    return descs[id] || 'Dedicated domain management for your autonomous LifeOS.';
  }

  function getDomainAddLabel(id) {
    const labels = {
      'tasks': 'Task',
      'goals': 'Goal',
      'calendar': 'Event',
      'fitness': 'Workout',
      'nutrition': 'Meal',
      'finance': 'Transaction',
      'study': 'Topic / Task',
      'shopping': 'Item',
      'relationships': 'Contact',
      'home-module': 'Chore',
      'vehicle': 'Fuel Log',
      'travel': 'Packing Item',
      'entertainment': 'Media',
      'documents': 'Document',
      'knowledge': 'Note',
      'routines': 'Habit',
      'digital-life': 'Subscription',
      'wellbeing': 'Mood Check-in',
      'analytics': 'Telemetry Metric',
      'settings': 'API Config',
      'home': 'Priority Item',
      'tadashi': 'Memory Fact'
    };
    return labels[id] || 'Entry';
  }

  // Domain AI Quick Action Buttons
  function getDomainAIActionButtons(id) {
    const actionsMap = {
      'home': [
        { label: '⚡ AI: Re-prioritize Daily Matrix', prompt: 'Re-prioritize my tasks for today based on high energy in the morning and OS exam readiness.' },
        { label: '⚡ AI: Generate Life Debrief', prompt: 'Give me an executive debrief of my LifeOS across all active domains.' },
        { label: '⚡ AI: Optimize Cognitive Load', prompt: 'Analyze my current schedule and reduce context switching.' }
      ],
      'tadashi': [
        { label: '⚡ AI: Run Holistic Life Audit', prompt: 'Perform an invariant audit across all 22 domains and detect potential conflicts.' },
        { label: '⚡ AI: Memory Context Summary', prompt: 'Summarize all persistent memory items loaded into your neural context.' },
        { label: '⚡ AI: Proactive Replanning', prompt: 'Review my upcoming deadlines and propose proactive schedule adjustments.' }
      ],
      'calendar': [
        { label: '⚡ AI: Auto-Block 2h Focus Time', prompt: 'Find the optimal 2-hour free block today and schedule an OS Deep Study block.' },
        { label: '⚡ AI: Resolve Schedule Collisions', prompt: 'Detect any overlapping events or tight buffers in my schedule and resolve them.' },
        { label: '⚡ AI: Align Schedule with Energy', prompt: 'Adjust my time blocks so heavy cognitive work happens during my peak energy hours.' }
      ],
      'tasks': [
        { label: '⚡ AI: Prioritize Backlog by Urgency', prompt: 'Reorder all pending tasks by urgency and impact for my upcoming exam and commitments.' },
        { label: '⚡ AI: Break Down OS Project', prompt: 'Break down the Operating Systems Assignment into 4 actionable subtasks.' },
        { label: '⚡ AI: Auto-Complete Finished Tasks', prompt: 'Review completed items and mark verified tasks as done.' }
      ],
      'goals': [
        { label: '⚡ AI: Generate Actionable Milestones', prompt: 'Generate 3 high-impact milestones for my active quarterly goals.' },
        { label: '⚡ AI: Check OKR Feasibility', prompt: 'Evaluate whether my goal deadlines are realistic given my current velocity.' },
        { label: '⚡ AI: Accelerate Lagging Goal', prompt: 'Identify the goal with the lowest progress and propose immediate catch-up actions.' }
      ],
      'study': [
        { label: '⚡ AI: 6-Day OS Exam Plan', prompt: 'Generate a day-by-day 6-day revision schedule for my Operating Systems exam covering Memory Management, Scheduling, and Deadlocks.' },
        { label: '⚡ AI: Generate 5 Rapid Flashcards', prompt: 'Create 5 quick flashcard questions and answers on Virtual Memory and Paging.' },
        { label: '⚡ AI: Log 45m Focus Session', prompt: 'Record a completed 45-minute deep focus study block on Operating Systems.' }
      ],
      'fitness': [
        { label: '⚡ AI: Progressive Overload Plan', prompt: 'Calculate the next weight targets for Bench Press and Squats using progressive overload.' },
        { label: '⚡ AI: Auto-Adjust for High Fatigue', prompt: 'I feel high fatigue today. Adjust my Push Day workout to reduce CNS strain.' },
        { label: '⚡ AI: Log Today\'s Workout Completed', prompt: 'Mark today\'s workout as completed with 520 kcal burned and log personal records.' }
      ],
      'nutrition': [
        { label: '⚡ AI: High-Protein Dinner Suggestion', prompt: 'Suggest a healthy 450 kcal dinner with at least 35g of protein using clean ingredients.' },
        { label: '⚡ AI: Auto-Log +500ml Water', prompt: 'Log 500ml of hydration in my nutrition tracker.' },
        { label: '⚡ AI: Balance Remaining Macros', prompt: 'Calculate remaining calories and macros needed to hit my 2,200 kcal target today.' }
      ],
      'finance': [
        { label: '⚡ AI: Calculate Safe-to-Spend', prompt: 'Calculate my daily safe-to-spend limit for the rest of this month based on my ₹50k budget.' },
        { label: '⚡ AI: Audit Discretionary Spend', prompt: 'Identify the top 3 categories where I spent the most money this month.' },
        { label: '⚡ AI: Log ₹450 Grocery Expense', prompt: 'Log an expense of ₹450 under Groceries category.' }
      ],
      'wellbeing': [
        { label: '⚡ AI: Evening Neuro-Reset Debrief', prompt: 'Guide me through a 2-minute evening mental wind-down debrief.' },
        { label: '⚡ AI: Stress Mitigation Protocol', prompt: 'Analyze my current stress indicators and suggest 3 rapid relaxation techniques.' },
        { label: '⚡ AI: Log Mood 4/5 (Optimal)', prompt: 'Record today\'s mood score as 4/5 (Optimal & Focused).' }
      ],
      'shopping': [
        { label: '⚡ AI: Generate Grocery List from Diet', prompt: 'Generate a shopping list with essential groceries needed for high-protein meals this week.' },
        { label: '⚡ AI: Pantry Restock Prediction', prompt: 'Predict which pantry items need restocking based on weekly consumption.' },
        { label: '⚡ AI: Price Watch on Wishlist', prompt: 'Check if any items on my wishlist have upcoming discount periods.' }
      ],
      'relationships': [
        { label: '⚡ AI: Draft Birthday Call Talking Points', prompt: 'Give me 3 heartwarming talking points and birthday wishes for my Mom\'s call tonight.' },
        { label: '⚡ AI: Check Overdue Touchpoints', prompt: 'Check which friends or family members I haven\'t reached out to in over 2 weeks.' },
        { label: '⚡ AI: Log Call with Mom', prompt: 'Log completed 15-minute phone call with Mom under Relationships.' }
      ],
      'home-module': [
        { label: '⚡ AI: Optimize Chore Rotation', prompt: 'Create an optimized cleaning chore schedule that does not conflict with my exam hours.' },
        { label: '⚡ AI: Appliance Care Checklist', prompt: 'Generate a monthly preventative maintenance checklist for household appliances.' },
        { label: '⚡ AI: Mark Room Cleaning Done', prompt: 'Mark room cleaning and laundry chores as completed.' }
      ],
      'vehicle': [
        { label: '⚡ AI: Estimate Fuel for Weekend Trip', prompt: 'Estimate the fuel volume and cost required for a 160km weekend ride on my Yamaha MT-15.' },
        { label: '⚡ AI: Service Interval Check', prompt: 'Review my bike odometer (8,420 km) and give recommendations for the upcoming 10,000 km service.' },
        { label: '⚡ AI: Log Fuel Refill (₹650)', prompt: 'Log a fuel refill of 6.2 Liters costing ₹650 at 8,420 km odometer.' }
      ],
      'travel': [
        { label: '⚡ AI: Tailor Goa Packing Checklist', prompt: 'Review my Goa trip packing list and add essentials for coastal weather and beach sports.' },
        { label: '⚡ AI: Optimize 4-Day Itinerary', prompt: 'Refine the 4-day Goa itinerary to balance relaxation, cafes, and scenic sightseeing.' },
        { label: '⚡ AI: Check All Travel Documents', prompt: 'Verify that all necessary tickets, IDs, and hotel vouchers are ready.' }
      ],
      'entertainment': [
        { label: '⚡ AI: Recommend Next Sci-Fi Book', prompt: 'Recommend a compelling sci-fi book similar to Project Hail Mary and Three-Body Problem.' },
        { label: '⚡ AI: Curate 2h Movie Watchlist', prompt: 'Suggest 2 top-tier thriller or sci-fi movies for a weekend unwind.' },
        { label: '⚡ AI: Log Reading 25 Pages', prompt: 'Log 25 pages read in Designing Data-Intensive Applications.' }
      ],
      'documents': [
        { label: '⚡ AI: Document Expiry Audit', prompt: 'Scan all registered documents in the vault and identify any expiring within 60 days.' },
        { label: '⚡ AI: Security & Redundancy Check', prompt: 'Verify that essential documents (Passport, Aadhaar, Transcripts) have secure backup status.' },
        { label: '⚡ AI: Organize Document Tags', prompt: 'Standardize tags and categories across all personal and legal documents.' }
      ],
      'knowledge': [
        { label: '⚡ AI: Synthesize OS Knowledge Graph', prompt: 'Create a conceptual summary linking Paging, TLB, Page Faults, and Thrashing.' },
        { label: '⚡ AI: Extract Action Items from Notes', prompt: 'Scan recent study notes and extract key review questions for this week.' },
        { label: '⚡ AI: Quick Capture Key Insight', prompt: 'Create a new knowledge note on Little\'s Law and Queuing Theory.' }
      ],
      'routines': [
        { label: '⚡ AI: Optimize Morning Protocol', prompt: 'Adjust my morning wake protocol for peak focus and alertness.' },
        { label: '⚡ AI: Habit Stacking Recommendation', prompt: 'Recommend a habit stacking combination to link stretching with my morning coffee.' },
        { label: '⚡ AI: Mark Morning Routine Done', prompt: 'Mark all 4 morning protocol steps as completed for today.' }
      ],
      'digital-life': [
        { label: '⚡ AI: Subscription Value Audit', prompt: 'Analyze my 5 active subscriptions and suggest potential bundling or cancellation options.' },
        { label: '⚡ AI: Cloud Storage Cleanup Guide', prompt: 'Identify strategies to free up 20 GB of cloud storage without losing data.' },
        { label: '⚡ AI: Digital Declutter Tasks', prompt: 'Generate 3 high-impact digital hygiene tasks for this week.' }
      ],
      'analytics': [
        { label: '⚡ AI: Deep Cross-Domain Audit', prompt: 'Execute a holistic cross-domain telemetry analysis and provide a life balance index.' },
        { label: '⚡ AI: Weekly Executive Debrief', prompt: 'Generate a comprehensive weekly summary of achievements, risks, and velocity.' },
        { label: '⚡ AI: Re-calculate LifeScore', prompt: 'Re-compute my overall Life Score based on current task, health, and budget data.' }
      ],
      'settings': [
        { label: '⚡ AI: Run Neural Link Diagnostic', prompt: 'Test all 15 Gemini function calling tools and confirm database read/write integrity.' },
        { label: '⚡ AI: Test Voice Synthesis Link', prompt: 'Run a speech synthesis diagnostic test and confirm audio output.' },
        { label: '⚡ AI: Optimize System Autonomy', prompt: 'Recommend autonomy thresholds for automated calendar replanning and task triage.' }
      ]
    };

    const actions = actionsMap[id] || [
      { label: `⚡ AI: Optimize ${id}`, prompt: `Optimize my ${id} domain and report progress.` },
      { label: `⚡ AI: Summarize Status`, prompt: `Give me a full status report on ${id}.` }
    ];

    return actions.map(act => `
      <button onclick="executeDomainAIAction('${id}', '${encodeURIComponent(act.prompt)}')" 
              class="px-3 py-1.5 rounded-xl glass-surface hover:bg-surface-container border border-primary-container/20 hover:border-primary-container/40 text-xs font-mono text-on-surface hover:text-primary-container transition-all active:scale-95 flex items-center gap-1.5">
        <span>${act.label}</span>
      </button>
    `).join('');
  }

  // Execute AI action from quick button
  window.executeDomainAIAction = function(domainId, encodedPrompt) {
    const prompt = decodeURIComponent(encodedPrompt);
    const inputEl = document.getElementById(`domain-ai-prompt-${domainId}`);
    if (inputEl) inputEl.value = prompt;
    executeDomainAIPrompt(domainId);
  };

  // Execute prompt typed into input
  window.executeDomainAIPrompt = async function(domainId) {
    const inputEl = document.getElementById(`domain-ai-prompt-${domainId}`);
    if (!inputEl) return;
    const prompt = inputEl.value.trim();
    if (!prompt) {
      if (typeof window.showToast === 'function') window.showToast('Please enter an instruction for TADASHI');
      return;
    }

    if (typeof window.showToast === 'function') {
      window.showToast(`🧠 TADASHI AI processing: "${prompt.slice(0, 35)}..."`);
    }

    // Call AI engine if available
    try {
      if (window.AI && typeof window.AI.chat === 'function') {
        const reply = await window.AI.chat(prompt, window.chatHistory || []);
        if (window.Voice && typeof window.Voice.speak === 'function') {
          window.Voice.speak(reply.slice(0, 140));
        }
        if (typeof window.showToast === 'function') {
          window.showToast(`✨ TADASHI executed AI action on ${domainId}!`);
        }
      } else {
        // Simulated AI execution with live DB update
        executeSimulatedAIAction(domainId, prompt);
      }
    } catch (err) {
      console.warn('AI execution error, applying fallback DB mutation:', err);
      executeSimulatedAIAction(domainId, prompt);
    }

    inputEl.value = '';
    // Re-render current domain page to show updated progress & records!
    setTimeout(() => {
      renderDomainPage(domainId);
    }, 400);
  };

  // Simulated fallback that updates DB directly
  function executeSimulatedAIAction(domainId, prompt) {
    const p = prompt.toLowerCase();
    const db = window.DB;
    if (!db) return;

    if (domainId === 'tasks') {
      db.tasks.add({ title: 'AI: ' + prompt.slice(0, 40), project: 'LifeOS', priority: 'high' });
    } else if (domainId === 'goals') {
      const goals = db.goals.list();
      if (goals.length > 0) {
        db.goals.update(goals[0].id, { progress: Math.min(100, (goals[0].progress || 50) + 10) });
      }
    } else if (domainId === 'fitness') {
      db.fitness.logWorkout({ name: 'Push Day (AI Optimized)', duration: 55, calories: 540 });
    } else if (domainId === 'nutrition') {
      db.nutrition.setWater(3.0);
      db.nutrition.logMeal({ name: 'High-Protein Shake (AI)', calories: 340, protein: 36, carbs: 22, fats: 4 });
    } else if (domainId === 'finance') {
      db.finance.addTransaction({ name: 'Expense (AI Categorized)', amount: -450, category: 'Groceries' });
    } else if (domainId === 'shopping') {
      db.shopping.addGrocery('Greek Yogurt & Oats (AI)');
    } else if (domainId === 'study') {
      db.study.logSession({ subject: 'Operating Systems', duration: 45, topic: 'Memory Paging' });
    } else if (domainId === 'routines') {
      db.routines.markDone('morning', 'Hydrate 500ml');
      db.routines.markDone('morning', 'Sunlight exposure');
    } else if (domainId === 'wellbeing') {
      db.wellbeing.setMood(5);
    } else if (domainId === 'travel') {
      db.travel.togglePacking('Goa Trip', 'Swimwear & Beach Towel');
    }

    if (typeof window.showToast === 'function') {
      window.showToast(`✨ TADASHI AI: Updated ${domainId} in LocalStorage!`);
    }
  }

  // Quick Help Trigger
  window.quickDomainAIHelp = function(domainId) {
    if (typeof window.switchTab === 'function') {
      if (typeof window.populatePrompt === 'function') {
        window.populatePrompt(`Analyze my current ${domainId} domain status and provide 3 immediate autonomous optimizations.`);
      }
      window.switchTab('view-tadashi');
    }
  };

  // Quick Add Item Modal for any domain
  window.openDomainAddModal = function(domainId) {
    const label = getDomainAddLabel(domainId);
    const title = prompt(`Enter new ${label} for ${domainId.toUpperCase()}:`, `New ${label}`);
    if (!title) return;

    const db = window.DB;
    if (!db) return;

    if (domainId === 'tasks') {
      db.tasks.add({ title: title, project: 'General', priority: 'medium' });
    } else if (domainId === 'goals') {
      db.goals.add({ title: title, category: 'Personal', target: '2026-12-31', progress: 10 });
    } else if (domainId === 'finance') {
      const amtStr = prompt('Enter Amount (negative for expense, positive for income):', '-500');
      const amt = parseFloat(amtStr) || -500;
      db.finance.addTransaction({ name: title, amount: amt, category: 'General' });
    } else if (domainId === 'shopping') {
      db.shopping.addGrocery(title);
    } else if (domainId === 'study') {
      db.study.addSubject({ name: title, code: 'STUDY-101', progress: 0 });
    } else if (domainId === 'fitness') {
      db.fitness.logWorkout({ name: title, duration: 45, calories: 400 });
    } else if (domainId === 'nutrition') {
      db.nutrition.logMeal({ name: title, calories: 400, protein: 25, carbs: 45, fats: 12 });
    } else if (domainId === 'relationships') {
      db.relationships.add({ name: title, role: 'Friend', cadence: 'Weekly' });
    } else if (domainId === 'home-module') {
      db.homeModule.addChore({ task: title, room: 'Living Room', frequency: 'Weekly' });
    } else if (domainId === 'vehicle') {
      db.vehicle.logFuel({ liters: 5, cost: 550, odo: 8500 });
    } else if (domainId === 'travel') {
      db.travel.addTrip({ name: title, dates: 'Upcoming', progress: 10 });
    } else if (domainId === 'entertainment') {
      db.entertainment.add({ title: title, type: 'book', progress: 0 });
    } else if (domainId === 'documents') {
      db.documents.add({ name: title, category: 'General', expires: '2027-01-01' });
    } else if (domainId === 'knowledge') {
      db.knowledge.add({ title: title, content: 'Captured via TADASHI LifeOS', tags: ['general'] });
    } else if (domainId === 'routines') {
      db.routines.addStep('morning', title);
    } else if (domainId === 'digital-life') {
      db.digitalLife.addSubscription({ name: title, cost: 499, cycle: 'Monthly' });
    } else if (domainId === 'calendar') {
      db.calendar.add({ title: title, time: '12:00', domain: 'General' });
    }

    if (typeof window.showToast === 'function') {
      window.showToast(`Added "${title}" to ${domainId}!`);
    }

    renderDomainPage(domainId);
  };

  // Checkbox togglers that update DB and re-render
  window.toggleTaskItem = function(id) {
    if (!window.DB) return;
    const task = window.DB.tasks.get(id);
    if (task) {
      const nextStatus = task.status === 'done' ? 'todo' : 'done';
      window.DB.tasks.update(id, { status: nextStatus });
      renderDomainPage('tasks');
    }
  };

  window.deleteTaskItem = function(id) {
    if (!window.DB) return;
    if (!confirm('Are you sure you want to permanently delete this task?')) return;
    window.DB.tasks.delete(id);
    if (typeof window.showToast === 'function') window.showToast('Task deleted');
    renderDomainPage('tasks');
  };

  window.toggleGoalMilestone = function(goalId, milestoneTitle) {
    if (!window.DB) return;
    window.DB.goals.completeMilestone(goalId, milestoneTitle);
    renderDomainPage('goals');
  };

  window.toggleGroceryItem = function(name) {
    if (!window.DB) return;
    window.DB.shopping.completeGrocery(name);
    renderDomainPage('shopping');
  };

  window.toggleChoreItem = function(name) {
    if (!window.DB) return;
    window.DB.homeModule.markChoreDone(name);
    renderDomainPage('home-module');
  };

  window.toggleRoutineItem = function(type, step) {
    if (!window.DB) return;
    window.DB.routines.markDone(type, step);
    renderDomainPage('routines');
  };

  window.logQuickMood = function(score) {
    if (!window.DB) return;
    window.DB.wellbeing.setMood(score);
    if (typeof window.showToast === 'function') window.showToast(`Logged mood: ${score}/5 ✨`);
    renderDomainPage('wellbeing');
  };

  window.addQuickWater = function(liters) {
    if (!window.DB) return;
    const cur = (window.DB.nutrition.get().today?.water || 2.4);
    window.DB.nutrition.setWater(Math.round((cur + liters) * 10) / 10);
    if (typeof window.showToast === 'function') window.showToast(`+${liters * 1000}ml water logged! 💧`);
    renderDomainPage('nutrition');
  };

  // ============================================================
  // DOMAIN-SPECIFIC TEMPLATE BUILDERS
  // ============================================================
  function getDomainSpecificHtml(id, domain) {
    const data = window.DATA || {};
    const db = window.DB;
    const dbState = db ? db.getAll() : data;

    switch (id) {
      case 'home':
        return renderHomeDomain(dbState);
      case 'tadashi':
        return renderTadashiDomain(dbState);
      case 'calendar':
        return renderCalendarDomain(dbState);
      case 'tasks':
        return renderTasksDomain(dbState);
      case 'goals':
        return renderGoalsDomain(dbState);
      case 'study':
        return renderStudyDomain(dbState);
      case 'fitness':
        return renderFitnessDomain(dbState);
      case 'nutrition':
        return renderNutritionDomain(dbState);
      case 'finance':
        return renderFinanceDomain(dbState);
      case 'wellbeing':
        return renderWellbeingDomain(dbState);
      case 'shopping':
        return renderShoppingDomain(dbState);
      case 'relationships':
        return renderRelationshipsDomain(dbState);
      case 'home-module':
        return renderHomeModuleDomain(dbState);
      case 'vehicle':
        return renderVehicleDomain(dbState);
      case 'travel':
        return renderTravelDomain(dbState);
      case 'entertainment':
        return renderEntertainmentDomain(dbState);
      case 'documents':
        return renderDocumentsDomain(dbState);
      case 'knowledge':
        return renderKnowledgeDomain(dbState);
      case 'routines':
        return renderRoutinesDomain(dbState);
      case 'digital-life':
        return renderDigitalLifeDomain(dbState);
      case 'analytics':
        return renderAnalyticsDomain(dbState);
      case 'settings':
        return renderSettingsDomain(dbState);
      default:
        return renderGenericDomain(id, domain, dbState);
    }
  }

  // --- 01. HOME DASHBOARD ---
  function renderHomeDomain(s) {
    const user = s.user || { name: 'Krishna', lifeScore: 84, energyScore: 68 };
    const tasks = s.tasks || [];
    const doneTasks = tasks.filter(t => t.status === 'done').length;
    const pendingTasks = tasks.filter(t => t.status !== 'done').length;

    return `
      <!-- Telemetry Stats Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="glass-surface p-4 rounded-xl border border-primary-container/20">
          <p class="text-[10px] font-mono uppercase text-outline">Life Quality Score</p>
          <div class="text-2xl font-black text-primary-container mt-1">${user.lifeScore}<span class="text-xs font-normal text-outline">/100</span></div>
          <p class="text-[10px] text-tertiary mt-1 font-mono">↑ +3 pts this week</p>
        </div>
        <div class="glass-surface p-4 rounded-xl border border-amber-400/20">
          <p class="text-[10px] font-mono uppercase text-outline">Cognitive Energy</p>
          <div class="text-2xl font-black text-amber-400 mt-1">${user.energyScore}%</div>
          <p class="text-[10px] text-outline mt-1 font-mono">Moderate · Prime for focus</p>
        </div>
        <div class="glass-surface p-4 rounded-xl border border-tertiary/20">
          <p class="text-[10px] font-mono uppercase text-outline">Tasks Execution</p>
          <div class="text-2xl font-black text-tertiary mt-1">${doneTasks}<span class="text-xs font-normal text-outline">/${tasks.length}</span></div>
          <p class="text-[10px] text-outline mt-1 font-mono">${pendingTasks} pending</p>
        </div>
        <div class="glass-surface p-4 rounded-xl border border-rose-400/20">
          <p class="text-[10px] font-mono uppercase text-outline">Active Invariant Risks</p>
          <div class="text-2xl font-black text-rose-400 mt-1">2</div>
          <p class="text-[10px] text-rose-400 mt-1 font-mono">OS Exam + Birthday Call</p>
        </div>
      </div>

      <!-- Priority Matrix & Executive Flow -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/10">
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              <span class="material-symbols-outlined text-primary-container text-[18px]">bolt</span>
              Urgent Priority Action Items
            </h4>
            <span class="text-[10px] font-mono text-outline">Auto-Triaged</span>
          </div>
          <div class="space-y-2">
            <div class="p-3 rounded-lg bg-surface-container-lowest/70 border-l-4 border-amber-400 flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-white">OS Memory Deep Study (Unit 4)</p>
                <p class="text-[10px] text-outline font-mono">Target: 22:00 - 23:15 · 42% syllabus gap remaining</p>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded bg-amber-400/20 text-amber-400 font-mono font-bold">URGENT</span>
            </div>
            <div class="p-3 rounded-lg bg-surface-container-lowest/70 border-l-4 border-primary-container flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-white">Mom's Birthday Call</p>
                <p class="text-[10px] text-outline font-mono">Scheduled: 23:15 IST · Relationship Invariant</p>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded bg-primary-container/20 text-primary-container font-mono font-bold">MILESTONE</span>
            </div>
            <div class="p-3 rounded-lg bg-surface-container-lowest/70 border-l-4 border-tertiary flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-white">Evening Neuro-Reset Protocol</p>
                <p class="text-[10px] text-outline font-mono">Target: 23:30 · Chamomile tea + No screens</p>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded bg-tertiary/20 text-tertiary font-mono font-bold">RECOVERY</span>
            </div>
          </div>
        </div>

        <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/10">
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              <span class="material-symbols-outlined text-tertiary text-[18px]">verified</span>
              Daily Autopilot Control Switches
            </h4>
            <span class="text-[10px] font-mono text-tertiary">Real-Time Sync</span>
          </div>
          <div class="space-y-3 pt-1">
            <div class="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-lowest/50">
              <div>
                <p class="text-xs font-medium text-white">Autonomous Replanning Threshold</p>
                <p class="text-[10px] text-outline">Auto-resolve schedule collisions &gt; 15 mins</p>
              </div>
              <span class="text-xs font-mono text-tertiary font-bold">ACTIVE</span>
            </div>
            <div class="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-lowest/50">
              <div>
                <p class="text-xs font-medium text-white">Energy-Based Load Shedding</p>
                <p class="text-[10px] text-outline">Defer low-priority chores if energy &lt; 40%</p>
              </div>
              <span class="text-xs font-mono text-primary-container font-bold">ENABLED</span>
            </div>
            <div class="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-lowest/50">
              <div>
                <p class="text-xs font-medium text-white">Voice Briefing Push</p>
                <p class="text-[10px] text-outline">Auto-speak summary upon app launch</p>
              </div>
              <span class="text-xs font-mono text-secondary font-bold">ONLINE</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --- 02. TADASHI AI & VOICE ---
  function renderTadashiDomain(s) {
    return `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="glass-surface p-4 rounded-xl border border-primary-container/25">
          <p class="text-[10px] font-mono uppercase text-outline">Neural Bridge Model</p>
          <div class="text-xl font-bold text-primary-container mt-1">Gemini 3.5 Flash</div>
          <p class="text-[10px] text-tertiary mt-1 font-mono">Function Calling: 15 Tools Active</p>
        </div>
        <div class="glass-surface p-4 rounded-xl border border-secondary/25">
          <p class="text-[10px] font-mono uppercase text-outline">Voice Synthesis Engine</p>
          <div class="text-xl font-bold text-secondary mt-1">Web Speech API</div>
          <p class="text-[10px] text-outline mt-1 font-mono">Bidirectional STT / TTS</p>
        </div>
        <div class="glass-surface p-4 rounded-xl border border-tertiary/25">
          <p class="text-[10px] font-mono uppercase text-outline">Autonomous Agency</p>
          <div class="text-xl font-bold text-tertiary mt-1">Full Read &amp; Write</div>
          <p class="text-[10px] text-outline mt-1 font-mono">22 Domains In-Memory</p>
        </div>
      </div>

      <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-outline-variant/10">
          <h4 class="text-sm font-bold text-white flex items-center gap-2">
            <span class="material-symbols-outlined text-primary-container text-[18px]">neurology</span>
            Direct Voice &amp; Chat Bridge
          </h4>
          <button onclick="if(typeof openVoiceModal==='function') openVoiceModal()" class="px-3 py-1 rounded-lg bg-primary-container/20 text-primary-container border border-primary-container/40 text-xs font-mono font-bold hover:bg-primary-container/30">
            🎙️ Start Holographic Voice Link
          </button>
        </div>
        <p class="text-xs text-outline leading-relaxed font-mono">
          TADASHI interacts autonomously across tasks, calendar events, fitness sets, budgets, and relationships. Click below to enter the full conversational AI canvas.
        </p>
        <div class="flex gap-3">
          <button onclick="switchTab('view-tadashi')" class="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary-container/30 to-secondary-container/30 border border-primary-container/50 text-white font-mono text-xs font-bold hover:border-primary-container flex items-center justify-center gap-2 transition-all">
            <span class="material-symbols-outlined text-[18px]">chat</span>
            <span>Open Full TADASHI AI Canvas →</span>
          </button>
        </div>
      </div>
    `;
  }

  // --- 03. SCHEDULE & CALENDAR ---
  function renderCalendarDomain(s) {
    const events = s.calendarEvents || [];
    return `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="glass-surface p-4 rounded-xl border border-primary-container/20">
          <p class="text-[10px] font-mono text-outline uppercase">Scheduled Events</p>
          <div class="text-2xl font-bold text-white mt-1">${events.length || 4} Events</div>
          <p class="text-[10px] text-primary-container font-mono">Today's Timeline</p>
        </div>
        <div class="glass-surface p-4 rounded-xl border border-tertiary/20">
          <p class="text-[10px] font-mono text-outline uppercase">Free Cognitive Block</p>
          <div class="text-2xl font-bold text-tertiary mt-1">2.5 Hours</div>
          <p class="text-[10px] text-outline font-mono">15:00 - 17:30</p>
        </div>
        <div class="glass-surface p-4 rounded-xl border border-amber-400/20">
          <p class="text-[10px] font-mono text-outline uppercase">Schedule Collisions</p>
          <div class="text-2xl font-bold text-amber-400 mt-1">0 Collisions</div>
          <p class="text-[10px] text-tertiary font-mono">Optimal Buffer Maintained</p>
        </div>
        <div class="glass-surface p-4 rounded-xl border border-secondary/20">
          <p class="text-[10px] font-mono text-outline uppercase">Time Allocation</p>
          <div class="text-2xl font-bold text-secondary mt-1">70% Study</div>
          <p class="text-[10px] text-outline font-mono">15% Gym · 15% Leisure</p>
        </div>
      </div>

      <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-outline-variant/10">
          <h4 class="text-sm font-bold text-white flex items-center gap-2">
            <span class="material-symbols-outlined text-primary-container text-[18px]">calendar_month</span>
            Interactive Calendar &amp; Schedule
          </h4>
          <button onclick="switchTab('view-schedule')" class="text-xs text-primary-container hover:underline font-mono">
            Open Full Screen Calendar Grid →
          </button>
        </div>
        <div class="space-y-2">
          ${(events.length ? events : [
            { time: '19:30 - 20:30', title: 'Zone 2 Aerobic Run', domain: 'Fitness', color: '#6af7ba' },
            { time: '22:00 - 23:15', title: 'OS Memory Management Deep Study', domain: 'Study', color: '#00d4ff' },
            { time: '23:15 - 23:30', title: 'Mom\'s Birthday Call', domain: 'Relationships', color: '#f59e0b' },
            { time: '23:30 - 00:00', title: 'Wind-Down & Neuro-Reset', domain: 'Routine', color: '#d0bcff' }
          ]).map(ev => `
            <div class="p-3 rounded-xl bg-surface-container-lowest/60 border border-outline-variant/15 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="w-3 h-3 rounded-full" style="background:${ev.color||'#00d4ff'}"></span>
                <div>
                  <p class="text-xs font-semibold text-white">${ev.title}</p>
                  <p class="text-[10px] text-outline font-mono">${ev.time} · ${ev.domain||'Life'}</p>
                </div>
              </div>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded" style="background:${ev.color||'#00d4ff'}15;color:${ev.color||'#00d4ff'}">
                CONFIRMED
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // --- 04. TASKS & PROJECTS ---
  function renderTasksDomain(s) {
    const tasks = s.tasks || [];
    const todoTasks = tasks.filter(t => t.status !== 'done');
    const doneTasks = tasks.filter(t => t.status === 'done');
    const pct = tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

    return `
      <!-- Progress Bar & KPIs -->
      <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-mono text-outline uppercase tracking-wider">Sprint Velocity &amp; Completion</span>
          <span class="text-sm font-mono font-bold text-tertiary">${pct}% Completed (${doneTasks.length}/${tasks.length})</span>
        </div>
        <div class="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
          <div class="bg-gradient-to-r from-primary-container to-tertiary h-full rounded-full transition-all duration-500" style="width:${pct}%"></div>
        </div>
      </div>

      <!-- Task Lists -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <!-- Pending Tasks -->
        <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/10">
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              Active Queue (${todoTasks.length})
            </h4>
            <span class="text-[10px] font-mono text-outline">Click checkbox to complete</span>
          </div>
          <div class="space-y-2">
            ${todoTasks.length ? todoTasks.map(t => `
              <div class="p-3 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/20 hover:border-primary-container/40 flex items-center justify-between gap-3 transition-colors">
                <div class="flex items-center gap-3 min-w-0">
                  <input type="checkbox" onchange="toggleTaskItem(${t.id})" class="w-4 h-4 rounded bg-surface-container border-outline-variant/40 text-primary-container focus:ring-0 cursor-pointer" />
                  <div class="min-w-0">
                    <p class="text-xs font-semibold text-white truncate">${t.title}</p>
                    <p class="text-[10px] text-outline font-mono">${t.project||'General'} · Due: ${t.deadline||'Today'}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-[9px] px-2 py-0.5 rounded font-mono font-bold ${t.priority==='high'?'bg-rose-400/20 text-rose-400':t.priority==='medium'?'bg-amber-400/20 text-amber-400':'bg-primary-container/20 text-primary-container'}">
                    ${(t.priority||'MED').toUpperCase()}
                  </span>
                  <button aria-label="Delete task" onclick="deleteTaskItem(${t.id})" class="text-outline hover:text-rose-400 text-xs p-1" title="Delete">✕</button>
                </div>
              </div>
            `).join('') : '<p class="text-xs text-outline py-4 text-center font-mono">All tasks completed! 🎉</p>'}
          </div>
        </div>

        <!-- Completed Tasks -->
        <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/10">
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
              Completed Archive (${doneTasks.length})
            </h4>
            <span class="text-[10px] font-mono text-tertiary">Verified</span>
          </div>
          <div class="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
            ${doneTasks.length ? doneTasks.map(t => `
              <div class="p-3 rounded-xl bg-surface-container-lowest/40 border border-outline-variant/10 flex items-center justify-between gap-3 opacity-70">
                <div class="flex items-center gap-3 min-w-0">
                  <input type="checkbox" checked onchange="toggleTaskItem(${t.id})" class="w-4 h-4 rounded bg-tertiary border-tertiary text-surface-container-lowest focus:ring-0 cursor-pointer" />
                  <p class="text-xs line-through text-outline truncate">${t.title}</p>
                </div>
                <span class="text-[9px] px-2 py-0.5 rounded bg-tertiary/20 text-tertiary font-mono">DONE</span>
              </div>
            `).join('') : '<p class="text-xs text-outline py-4 text-center font-mono">No tasks marked done yet.</p>'}
          </div>
        </div>
      </div>
    `;
  }

  // --- 05. GOALS & OKRs ---
  function renderGoalsDomain(s) {
    const goals = s.goals || [];
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        ${goals.map(g => {
          const milestones = g.milestones || [];
          const doneMs = milestones.filter(m => m.done).length;
          const pct = milestones.length ? Math.round((doneMs / milestones.length) * 100) : (g.progress || 50);

          return `
            <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-4 shadow-lg">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <span class="text-2xl">${g.emoji||'🎯'}</span>
                  <div>
                    <h4 class="text-base font-bold text-white">${g.title}</h4>
                    <p class="text-[10px] text-outline font-mono">Target: ${g.target||'2026'} · ${g.category||'General'}</p>
                  </div>
                </div>
                <span class="text-xs font-mono font-bold text-primary-container px-2.5 py-1 rounded-lg bg-primary-container/10 border border-primary-container/30">
                  ${pct}%
                </span>
              </div>

              <!-- Progress Bar -->
              <div class="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                <div class="bg-gradient-to-r from-primary-container to-tertiary h-full rounded-full transition-all" style="width:${pct}%"></div>
              </div>

              <!-- Milestones Checklist -->
              <div class="space-y-2 pt-1">
                <p class="text-[10px] font-mono text-outline uppercase tracking-wider">Key Milestones (Click to toggle)</p>
                ${milestones.map(m => `
                  <div onclick="toggleGoalMilestone(${g.id}, '${m.title.replace(/'/g, "\\'")}')" 
                       class="p-2 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/15 flex items-center justify-between cursor-pointer hover:bg-surface-container transition-colors">
                    <div class="flex items-center gap-2.5">
                      <span class="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${m.done?'bg-tertiary text-black':'border border-outline-variant'}">
                        ${m.done ? '✓' : ''}
                      </span>
                      <span class="text-xs ${m.done?'line-through text-outline':'text-white'}">${m.title}</span>
                    </div>
                    <span class="text-[9px] font-mono text-outline">${m.done?'DONE':'PENDING'}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // --- 06. STUDY & LEARNING ---
  function renderStudyDomain(s) {
    const study = s.study || {};
    const subjects = study.subjects || [
      { name: 'Operating Systems', code: 'CS-401', progress: 58, examDate: '6 Days Remaining' },
      { name: 'Distributed Systems', code: 'CS-402', progress: 40, examDate: '18 Days' },
      { name: 'Machine Learning', code: 'CS-405', progress: 75, examDate: '24 Days' }
    ];

    return `
      <!-- Exam Urgent Banner -->
      <div class="glass-surface p-5 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-400/10 via-surface-container-lowest to-transparent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center text-2xl font-bold font-mono">
            6d
          </div>
          <div>
            <span class="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold">PRIMARY IMMINENT DEADLINE</span>
            <h3 class="text-base font-bold text-white">Operating Systems Semester Exam</h3>
            <p class="text-xs text-outline font-mono">Virtual Memory, Page Replacement, &amp; Deadlock Prevention focus needed.</p>
          </div>
        </div>
        <button onclick="executeDomainAIAction('study', 'Generate a 6-day intensive OS revision syllabus')" class="px-4 py-2 rounded-xl bg-amber-400 text-black font-mono text-xs font-bold hover:bg-amber-300 transition-colors shrink-0">
          ⚡ AI 6-Day Study Plan
        </button>
      </div>

      <!-- Subject Progress Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        ${subjects.map(sub => `
          <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono text-outline">${sub.code||'CS'}</span>
              <span class="text-xs font-mono font-bold text-primary-container">${sub.progress}% Ready</span>
            </div>
            <h4 class="text-base font-bold text-white">${sub.name}</h4>
            <div class="w-full bg-surface-container h-2 rounded-full overflow-hidden">
              <div class="bg-primary-container h-full rounded-full" style="width:${sub.progress}%"></div>
            </div>
            <p class="text-[10px] font-mono text-outline">Target: ${sub.examDate||'Upcoming'}</p>
          </div>
        `).join('')}
      </div>
    `;
  }


  // ============================================================
  // HEAVY WORKOUT ENGINE (Site Name: HEAVY)
  // Modeled precisely after the Heavy / Hevy workout tracking app:
  // Live workout logger, sets x reps x kg table, active rest timer,
  // Big 4 PRs, 1RM calculator, routine splits, and muscle heatmap.
  // ============================================================

  // Persistent Heavy in-memory state
  window.heavyState = window.heavyState || {
    activeTab: 'logger', // 'logger', 'routines', 'prs', 'heatmap', 'history'
    restSecondsLeft: 90,
    restTotalSeconds: 90,
    restTimerRunning: false,
    timerInterval: null,
    calcWeight: 100,
    calcReps: 6,
    activeSession: {
      name: 'Heavy Push A (Chest, Shoulders & Triceps)',
      elapsedSeconds: 2322, // 38m 42s
      isLive: true,
      exercises: [
        {
          id: 'ex-1',
          name: 'Barbell Bench Press',
          muscle: 'Chest',
          equipment: 'Barbell',
          sets: [
            { num: 'W', prev: '60 kg × 12', weight: 60, reps: 12, rpe: '6.0', done: true },
            { num: '1', prev: '90 kg × 8', weight: 90, reps: 8, rpe: '8.0', done: true },
            { num: '2', prev: '100 kg × 6', weight: 100, reps: 6, rpe: '8.5', done: true },
            { num: '3', prev: '105 kg × 5', weight: 105, reps: 5, rpe: '9.5', done: false }
          ]
        },
        {
          id: 'ex-2',
          name: 'Incline Dumbbell Press',
          muscle: 'Upper Chest',
          equipment: 'Dumbbell',
          sets: [
            { num: '1', prev: '34 kg × 10', weight: 34, reps: 10, rpe: '8.0', done: true },
            { num: '2', prev: '36 kg × 8', weight: 36, reps: 8, rpe: '8.5', done: true },
            { num: '3', prev: '36 kg × 8', weight: 36, reps: 8, rpe: '9.0', done: false }
          ]
        },
        {
          id: 'ex-3',
          name: 'Standing Overhead Press (OHP)',
          muscle: 'Shoulders',
          equipment: 'Barbell',
          sets: [
            { num: '1', prev: '60 kg × 8', weight: 60, reps: 8, rpe: '8.0', done: true },
            { num: '2', prev: '65 kg × 6', weight: 65, reps: 6, rpe: '8.5', done: false },
            { num: '3', prev: '70 kg × 5', weight: 70, reps: 5, rpe: '9.0', done: false }
          ]
        },
        {
          id: 'ex-4',
          name: 'Dumbbell Lateral Raise',
          muscle: 'Lateral Delts',
          equipment: 'Dumbbell',
          sets: [
            { num: '1', prev: '14 kg × 15', weight: 14, reps: 15, rpe: '8.5', done: true },
            { num: '2', prev: '14 kg × 15', weight: 14, reps: 15, rpe: '9.0', done: false },
            { num: 'D', prev: '10 kg × 15', weight: 10, reps: 15, rpe: '10.0', done: false }
          ]
        },
        {
          id: 'ex-5',
          name: 'Tricep Rope Pushdown',
          muscle: 'Triceps',
          equipment: 'Cable',
          sets: [
            { num: '1', prev: '32 kg × 12', weight: 32, reps: 12, rpe: '8.0', done: true },
            { num: '2', prev: '36 kg × 10', weight: 36, reps: 10, rpe: '9.0', done: false },
            { num: 'F', prev: '36 kg × 10', weight: 36, reps: 10, rpe: '10.0', done: false }
          ]
        }
      ]
    },
    routines: [
      { id: 'push-a', name: 'Heavy Push A', split: 'Chest / Front & Lateral Delts / Triceps', exercisesCount: 5, setsCount: 18, estTime: '55 min', focus: 'Hypertrophy & Strength' },
      { id: 'pull-a', name: 'Heavy Pull A', split: 'Lats / Upper Back / Rear Delts / Biceps', exercisesCount: 5, setsCount: 17, estTime: '50 min', focus: 'Back Width & Thickness' },
      { id: 'legs-a', name: 'Heavy Legs & Calves', split: 'Quads / Hamstrings / Glutes / Calves', exercisesCount: 6, setsCount: 20, estTime: '65 min', focus: 'Lower Body Power' },
      { id: 'upper-p', name: 'Heavy Upper Power', split: 'Flat Bench, Barbell Row, OHP, Chins', exercisesCount: 4, setsCount: 16, estTime: '50 min', focus: 'Maximal Strength' },
      { id: 'lower-p', name: 'Heavy Lower Power', split: 'Back Squat, Romanian Deadlift, Leg Press', exercisesCount: 4, setsCount: 16, estTime: '55 min', focus: 'Posterior Chain' },
      { id: 'zone-2', name: 'Heavy Zone 2 & Core', split: 'Incline Treadmill, Concept2 Row, Hanging Raises', exercisesCount: 3, setsCount: 10, estTime: '45 min', focus: 'Cardiovascular Base' }
    ],
    prs: [
      { name: 'Barbell Bench Press', value: '110 kg', oneRm: '125 kg', date: 'Sept 10, 2026', note: '5 reps @ 105 kg' },
      { name: 'Barbell Back Squat', value: '145 kg', oneRm: '165 kg', date: 'Sept 14, 2026', note: '4 reps @ 135 kg' },
      { name: 'Conventional Deadlift', value: '180 kg', oneRm: '205 kg', date: 'Aug 28, 2026', note: '3 reps @ 170 kg' },
      { name: 'Standing Overhead Press', value: '75 kg', oneRm: '85 kg', date: 'Sept 18, 2026', note: '5 reps @ 70 kg' }
    ],
    history: [
      { name: 'Heavy Pull A', date: 'Yesterday (Sept 24)', duration: '52 min', volume: '13,420 kg', sets: 17, prs: 2 },
      { name: 'Heavy Legs & Calves', date: 'Sept 22, 2026', duration: '64 min', volume: '17,890 kg', sets: 20, prs: 1 },
      { name: 'Heavy Push A', date: 'Sept 20, 2026', duration: '58 min', volume: '15,100 kg', sets: 18, prs: 3 },
      { name: 'Heavy Upper Power', date: 'Sept 18, 2026', duration: '49 min', volume: '12,950 kg', sets: 16, prs: 1 }
    ]
  };

  // Helper functions exposed on window
  window.setHeavyTab = function(tabName) {
    window.heavyState.activeTab = tabName;
    renderDomainPage('fitness');
  };

  window.toggleHeavySet = function(exIdx, setIdx) {
    const ex = window.heavyState.activeSession.exercises[exIdx];
    if (!ex) return;
    const s = ex.sets[setIdx];
    if (!s) return;
    s.done = !s.done;

    // If marked done, trigger rest timer
    if (s.done) {
      window.startHeavyRestTimer(90);
      if (typeof window.showToast === 'function') {
        window.showToast(`✓ Set completed! Rest timer started: 90s`);
      }
    }
    renderDomainPage('fitness');
  };

  window.addHeavySet = function(exIdx) {
    const ex = window.heavyState.activeSession.exercises[exIdx];
    if (!ex) return;
    const lastSet = ex.sets[ex.sets.length - 1];
    const newWeight = lastSet ? lastSet.weight : 50;
    const newReps = lastSet ? lastSet.reps : 10;
    const nextNum = ex.sets.length + 1;
    ex.sets.push({
      num: String(nextNum),
      prev: `${newWeight} kg × ${newReps}`,
      weight: newWeight,
      reps: newReps,
      rpe: '8.5',
      done: false
    });
    renderDomainPage('fitness');
  };

  window.deleteHeavySet = function(exIdx, setIdx) {
    const ex = window.heavyState.activeSession.exercises[exIdx];
    if (!ex) return;
    if (!confirm(`Delete set ${setIdx + 1} from ${ex.name}?`)) return;
    ex.sets.splice(setIdx, 1);
    if (typeof window.showToast === 'function') window.showToast('Set removed');
    renderDomainPage('fitness');
  };

  window.updateHeavySetVal = function(exIdx, setIdx, field, val) {
    const ex = window.heavyState.activeSession.exercises[exIdx];
    if (!ex) return;
    const s = ex.sets[setIdx];
    if (!s) return;
    s[field] = parseFloat(val) || val;
  };

  window.startHeavyRestTimer = function(seconds) {
    const hs = window.heavyState;
    if (hs.timerInterval) clearInterval(hs.timerInterval);
    hs.restTotalSeconds = seconds || hs.restTotalSeconds || 90;
    hs.restSecondsLeft = hs.restTotalSeconds;
    hs.restTimerRunning = true;

    hs.timerInterval = setInterval(() => {
      if (hs.restSecondsLeft > 0) {
        hs.restSecondsLeft--;
        const timerEl = document.getElementById('heavy-rest-display');
        const barEl = document.getElementById('heavy-rest-bar');
        if (timerEl) {
          const m = String(Math.floor(hs.restSecondsLeft / 60)).padStart(2, '0');
          const sec = String(hs.restSecondsLeft % 60).padStart(2, '0');
          timerEl.textContent = `${m}:${sec}`;
        }
        if (barEl) {
          const pct = Math.max(0, Math.min(100, (hs.restSecondsLeft / hs.restTotalSeconds) * 100));
          barEl.style.width = pct + '%';
        }
      } else {
        clearInterval(hs.timerInterval);
        hs.restTimerRunning = false;
        if (typeof window.showToast === 'function') {
          window.showToast('🔔 Rest time is UP! Ready for the next Heavy set!');
        }
        const timerEl = document.getElementById('heavy-rest-display');
        if (timerEl) timerEl.textContent = '00:00';
      }
    }, 1000);
  };

  window.stopHeavyRestTimer = function() {
    const hs = window.heavyState;
    if (hs.timerInterval) clearInterval(hs.timerInterval);
    hs.restTimerRunning = false;
    hs.restSecondsLeft = 0;
    const timerEl = document.getElementById('heavy-rest-display');
    const barEl = document.getElementById('heavy-rest-bar');
    if (timerEl) timerEl.textContent = '00:00';
    if (barEl) barEl.style.width = '0%';
  };

  window.addHeavyRestTime = function(sec) {
    const hs = window.heavyState;
    hs.restSecondsLeft = (hs.restSecondsLeft || 0) + sec;
    hs.restTotalSeconds = Math.max(hs.restTotalSeconds, hs.restSecondsLeft);
    if (!hs.restTimerRunning) window.startHeavyRestTimer(hs.restSecondsLeft);
  };

  window.calculateHeavy1RM = function() {
    const wEl = document.getElementById('heavy-1rm-weight');
    const rEl = document.getElementById('heavy-1rm-reps');
    if (!wEl || !rEl) return;
    const w = parseFloat(wEl.value) || 100;
    const r = Math.min(15, Math.max(1, parseInt(rEl.value) || 1));
    window.heavyState.calcWeight = w;
    window.heavyState.calcReps = r;

    // Epley formula: w * (1 + r / 30)
    const epley = Math.round(w * (1 + r / 30));
    // Brzycki: w * (36 / (37 - r))
    const brzycki = Math.round(w * (36 / (37 - r)));
    const avg1rm = Math.round((epley + brzycki) / 2);

    const outEl = document.getElementById('heavy-1rm-result');
    if (outEl) outEl.textContent = `${avg1rm} kg`;

    // Update percentage table
    const pcts = [95, 90, 85, 80, 75, 70];
    pcts.forEach(p => {
      const el = document.getElementById(`heavy-pct-${p}`);
      if (el) el.textContent = `${Math.round(avg1rm * (p / 100))} kg`;
    });
  };

  window.startHeavyRoutine = function(routineId) {
    const r = window.heavyState.routines.find(rt => rt.id === routineId);
    if (r) {
      window.heavyState.activeSession.name = `${r.name} (${r.split})`;
      window.heavyState.activeTab = 'logger';
      if (typeof window.showToast === 'function') {
        window.showToast(`🏋️ Started routine: ${r.name}`);
      }
      renderDomainPage('fitness');
    }
  };

  window.finishHeavyWorkout = function() {
    let totalVolume = 0;
    let totalSets = 0;
    window.heavyState.activeSession.exercises.forEach(ex => {
      ex.sets.forEach(s => {
        if (s.done) {
          totalVolume += (s.weight || 0) * (s.reps || 0);
          totalSets++;
        }
      });
    });

    const newEntry = {
      name: window.heavyState.activeSession.name,
      date: 'Just now',
      duration: '42 min',
      volume: `${totalVolume.toLocaleString()} kg`,
      sets: totalSets,
      prs: 1
    };
    window.heavyState.history.unshift(newEntry);
    if (window.DB && window.DB.fitness && typeof window.DB.fitness.logWorkout === 'function') {
      window.DB.fitness.logWorkout({ name: newEntry.name, duration: 42, calories: 540 });
    }
    if (typeof window.showToast === 'function') {
      window.showToast(`🎉 Workout Finished! ${totalVolume.toLocaleString()} kg lifted across ${totalSets} sets!`);
    }
    window.heavyState.activeTab = 'history';
    renderDomainPage('fitness');
  };

  window.openHeavyAddExercise = function() {
    const name = prompt('Enter exercise name (e.g. Incline Bench Press, Dumbbell Row, Barbell Squat):', 'Cable Rope Face Pull');
    if (!name) return;
    const muscle = prompt('Enter primary muscle group (Chest, Back, Shoulders, Legs, Arms, Core):', 'Shoulders') || 'General';
    window.heavyState.activeSession.exercises.push({
      id: 'ex-' + Date.now(),
      name: name,
      muscle: muscle,
      equipment: 'Cable',
      sets: [
        { num: '1', prev: '25 kg × 12', weight: 25, reps: 12, rpe: '8.0', done: false },
        { num: '2', prev: '25 kg × 12', weight: 25, reps: 12, rpe: '8.5', done: false },
        { num: '3', prev: '30 kg × 10', weight: 30, reps: 10, rpe: '9.0', done: false }
      ]
    });
    renderDomainPage('fitness');
  };

  // --- 07. HEAVY FITNESS DOMAIN RENDERER ---
  function renderFitnessDomain(s) {
    const hs = window.heavyState;
    const activeTab = hs.activeTab || 'logger';
    const session = hs.activeSession;

    // Calculate current live volume
    let liveVolume = 0;
    let completedSetsCount = 0;
    let totalSetsCount = 0;
    session.exercises.forEach(ex => {
      ex.sets.forEach(st => {
        totalSetsCount++;
        if (st.done) {
          liveVolume += (st.weight || 0) * (st.reps || 0);
          completedSetsCount++;
        }
      });
    });

    const restMin = String(Math.floor(hs.restSecondsLeft / 60)).padStart(2, '0');
    const restSec = String(hs.restSecondsLeft % 60).padStart(2, '0');
    const restPct = Math.max(0, Math.min(100, (hs.restSecondsLeft / hs.restTotalSeconds) * 100));

    return `
      <!-- ========================================== -->
      <!-- HEAVY SITE BRAND HEADER & TOP NAV STRIP    -->
      <!-- ========================================== -->
      <div class="rounded-2xl glass-surface p-5 sm:p-6 border border-primary-container/30 shadow-2xl relative overflow-hidden">
        <div class="absolute -top-12 -right-12 w-64 h-64 bg-primary-container/15 rounded-full blur-3xl pointer-events-none"></div>
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-container/30 to-surface-tint/20 border border-primary-container/50 flex items-center justify-center text-primary-container shadow-[0_0_20px_rgba(0,212,255,0.35)]">
                <span class="material-symbols-outlined text-[28px]" style="font-variation-settings:'FILL' 1">fitness_center</span>
              </div>
              <div>
                <div class="flex items-center gap-2.5">
                  <h2 class="text-3xl font-black tracking-tight text-white font-mono uppercase">HEAVY</h2>
                  <span class="px-2.5 py-0.5 rounded-full bg-primary-container/20 text-primary-container border border-primary-container/40 text-[10px] font-mono font-bold tracking-wider">
                    PRO ATHLETE · GYM LOG
                  </span>
                </div>
                <p class="text-xs text-outline font-mono mt-0.5">
                  The Heavy Workout Tracker · Sets, Reps &amp; Overload Engine
                </p>
              </div>
            </div>
          </div>

          <!-- Heavy Quick Telemetry KPI Badges -->
          <div class="flex items-center gap-2.5 flex-wrap">
            <div class="px-3.5 py-2 rounded-xl bg-surface-container-lowest/80 border border-amber-400/25 text-xs font-mono">
              <span class="text-outline text-[10px] uppercase block">Streak</span>
              <span class="font-bold text-amber-400 text-sm">5 Days 🔥</span>
            </div>
            <div class="px-3.5 py-2 rounded-xl bg-surface-container-lowest/80 border border-tertiary/25 text-xs font-mono">
              <span class="text-outline text-[10px] uppercase block">This Week</span>
              <span class="font-bold text-tertiary text-sm">4 / 5 Done</span>
            </div>
            <div class="px-3.5 py-2 rounded-xl bg-surface-container-lowest/80 border border-primary-container/25 text-xs font-mono">
              <span class="text-outline text-[10px] uppercase block">Week Volume</span>
              <span class="font-bold text-primary-container text-sm">48,250 kg</span>
            </div>
            <div class="px-3.5 py-2 rounded-xl bg-surface-container-lowest/80 border border-secondary/25 text-xs font-mono">
              <span class="text-outline text-[10px] uppercase block">Bodyweight</span>
              <span class="font-bold text-secondary text-sm">74.2 kg</span>
            </div>
          </div>
        </div>

        <!-- Heavy Segmented Navigation Tabs -->
        <div class="flex items-center gap-2 mt-5 pt-4 border-t border-outline-variant/15 overflow-x-auto no-scrollbar">
          <button onclick="setHeavyTab('logger')" 
                  class="px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab==='logger' ? 'bg-primary-container text-surface-container-lowest shadow-[0_0_16px_rgba(0,212,255,0.4)]' : 'glass-surface text-outline hover:text-white'}">
            <span class="material-symbols-outlined text-[16px]">timer</span>
            <span>Live Workout Logger</span>
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>
          <button onclick="setHeavyTab('routines')" 
                  class="px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab==='routines' ? 'bg-primary-container text-surface-container-lowest shadow-[0_0_16px_rgba(0,212,255,0.4)]' : 'glass-surface text-outline hover:text-white'}">
            <span class="material-symbols-outlined text-[16px]">list_alt</span>
            <span>Routines (${hs.routines.length})</span>
          </button>
          <button onclick="setHeavyTab('prs')" 
                  class="px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab==='prs' ? 'bg-primary-container text-surface-container-lowest shadow-[0_0_16px_rgba(0,212,255,0.4)]' : 'glass-surface text-outline hover:text-white'}">
            <span class="material-symbols-outlined text-[16px]">trophy</span>
            <span>1RM Calculator &amp; PRs</span>
          </button>
          <button onclick="setHeavyTab('heatmap')" 
                  class="px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab==='heatmap' ? 'bg-primary-container text-surface-container-lowest shadow-[0_0_16px_rgba(0,212,255,0.4)]' : 'glass-surface text-outline hover:text-white'}">
            <span class="material-symbols-outlined text-[16px]">accessibility_new</span>
            <span>Muscle Heatmap</span>
          </button>
          <button onclick="setHeavyTab('history')" 
                  class="px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab==='history' ? 'bg-primary-container text-surface-container-lowest shadow-[0_0_16px_rgba(0,212,255,0.4)]' : 'glass-surface text-outline hover:text-white'}">
            <span class="material-symbols-outlined text-[16px]">history</span>
            <span>History (${hs.history.length})</span>
          </button>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- TAB 1: LIVE WORKOUT LOGGER                 -->
      <!-- ========================================== -->
      ${activeTab === 'logger' ? `
        <!-- Active Session Banner & Rest Countdown Bar -->
        <div class="glass-surface rounded-2xl p-5 border border-primary-container/25 space-y-4">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <span class="flex h-3 w-3 relative">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <h3 class="text-lg font-bold text-white font-mono flex items-center gap-2">
                  <span>${session.name}</span>
                </h3>
                <p class="text-xs text-outline font-mono mt-0.5">
                  ⏱ Elapsed: 00:38:42 · Completed Sets: <strong class="text-tertiary">${completedSetsCount}/${totalSetsCount}</strong> · Session Volume: <strong class="text-primary-container">${liveVolume.toLocaleString()} kg</strong>
                </p>
              </div>
            </div>

            <!-- Heavy Rest Timer Control Widget -->
            <div class="glass-surface p-3 rounded-xl border border-outline-variant/30 flex items-center gap-3 shrink-0">
              <div class="text-center">
                <span class="text-[10px] font-mono uppercase text-outline block">Rest Timer</span>
                <span class="text-xl font-mono font-black text-primary-container tracking-wider" id="heavy-rest-display">${restMin}:${restSec}</span>
              </div>
              <div class="flex items-center gap-1">
                <button onclick="startHeavyRestTimer(90)" class="px-2 py-1 rounded bg-surface-container hover:bg-surface-tint/20 text-[11px] font-mono text-outline hover:text-white" title="90 seconds">1:30</button>
                <button onclick="startHeavyRestTimer(120)" class="px-2 py-1 rounded bg-surface-container hover:bg-surface-tint/20 text-[11px] font-mono text-outline hover:text-white" title="2 minutes">2:00</button>
                <button onclick="startHeavyRestTimer(180)" class="px-2 py-1 rounded bg-surface-container hover:bg-surface-tint/20 text-[11px] font-mono text-outline hover:text-white" title="3 minutes">3:00</button>
                <button onclick="addHeavyRestTime(30)" class="px-2 py-1 rounded bg-primary-container/20 text-primary-container text-[11px] font-mono font-bold hover:bg-primary-container/30">+30s</button>
                <button onclick="stopHeavyRestTimer()" class="px-2 py-1 rounded bg-rose-400/20 text-rose-400 text-[11px] font-mono hover:bg-rose-400/30">Skip</button>
              </div>
            </div>
          </div>

          <!-- Rest progress line -->
          <div class="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
            <div id="heavy-rest-bar" class="bg-gradient-to-r from-primary-container to-tertiary h-full rounded-full transition-all duration-300" style="width: ${restPct}%"></div>
          </div>
        </div>

        <!-- Heavy Exercise List with Sets Table -->
        <div class="space-y-4">
          ${session.exercises.map((ex, exIdx) => `
            <div class="glass-surface rounded-2xl p-5 border border-outline-variant/20 hover:border-primary-container/30 transition-all space-y-3">
              <div class="flex items-center justify-between pb-2 border-b border-outline-variant/15">
                <div class="flex items-center gap-3">
                  <span class="w-7 h-7 rounded-lg bg-primary-container/15 text-primary-container flex items-center justify-center font-mono font-bold text-xs">${exIdx + 1}</span>
                  <div>
                    <h4 class="text-base font-bold text-white tracking-wide">${ex.name}</h4>
                    <span class="text-[11px] font-mono text-outline">${ex.muscle} · ${ex.equipment}</span>
                  </div>
                </div>
                <button onclick="addHeavySet(${exIdx})" class="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-xs font-mono text-primary-container hover:underline flex items-center gap-1 active:scale-95 transition-all">
                  <span class="material-symbols-outlined text-[14px]">add</span>
                  <span>Add Set</span>
                </button>
              </div>

              <!-- Sets Table -->
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs font-mono">
                  <thead>
                    <tr class="text-outline/70 border-b border-outline-variant/10 text-[10px] uppercase">
                      <th class="py-2 px-2 w-12 text-center">SET</th>
                      <th class="py-2 px-3">PREVIOUS</th>
                      <th class="py-2 px-3 w-28">KG</th>
                      <th class="py-2 px-3 w-24">REPS</th>
                      <th class="py-2 px-3 w-20">RPE</th>
                      <th class="py-2 px-3 w-16 text-center">DONE</th>
                      <th class="py-2 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-outline-variant/10">
                    ${ex.sets.map((st, setIdx) => `
                      <tr class="hover:bg-surface-container-lowest/40 transition-colors ${st.done ? 'bg-emerald-500/5' : ''}">
                        <td class="py-2 px-2 text-center">
                          <span class="inline-block w-6 h-6 leading-6 rounded-md font-bold text-xs ${st.num === 'W' ? 'bg-amber-400/20 text-amber-400' : st.num === 'D' ? 'bg-purple-400/20 text-purple-400' : st.num === 'F' ? 'bg-rose-400/20 text-rose-400' : 'bg-surface-container text-white'}">
                            ${st.num}
                          </span>
                        </td>
                        <td class="py-2 px-3 text-outline">
                          ${st.prev}
                        </td>
                        <td class="py-2 px-3">
                          <input type="number" step="0.5" value="${st.weight}" 
                                 onchange="updateHeavySetVal(${exIdx}, ${setIdx}, 'weight', this.value)"
                                 class="w-20 bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-2.5 py-1 text-white font-bold font-mono focus:border-primary-container outline-none" />
                        </td>
                        <td class="py-2 px-3">
                          <input type="number" value="${st.reps}" 
                                 onchange="updateHeavySetVal(${exIdx}, ${setIdx}, 'reps', this.value)"
                                 class="w-16 bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-2.5 py-1 text-white font-bold font-mono focus:border-primary-container outline-none" />
                        </td>
                        <td class="py-2 px-3">
                          <input type="text" value="${st.rpe || '8.0'}" 
                                 onchange="updateHeavySetVal(${exIdx}, ${setIdx}, 'rpe', this.value)"
                                 class="w-14 bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-2 py-1 text-outline font-mono focus:border-primary-container outline-none text-center" />
                        </td>
                        <td class="py-2 px-3 text-center">
                          <button onclick="toggleHeavySet(${exIdx}, ${setIdx})" 
                                  class="w-8 h-8 rounded-lg flex items-center justify-center transition-all ${st.done ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)] font-bold scale-105' : 'bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-outline hover:text-white'}">
                            <span class="material-symbols-outlined text-[18px]">${st.done ? 'check' : 'check'}</span>
                          </button>
                        </td>
                        <td class="py-2 px-2 text-center">
                          <button aria-label="Delete set" onclick="deleteHeavySet(${exIdx}, ${setIdx})" class="text-outline/40 hover:text-rose-400 text-xs p-1" title="Delete set">✕</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Bottom Session Actions Bar -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <button onclick="openHeavyAddExercise()" class="w-full sm:w-auto px-5 py-3 rounded-xl glass-surface hover:bg-surface-container border border-primary-container/30 hover:border-primary-container text-xs font-mono font-bold text-primary-container hover:text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg">
            <span class="material-symbols-outlined text-[18px]">add_circle</span>
            <span>+ Add Exercise to Session</span>
          </button>
          <div class="flex items-center gap-3 w-full sm:w-auto">
            <button onclick="finishHeavyWorkout()" class="flex-1 sm:flex-none px-7 py-3 rounded-xl bg-gradient-to-r from-primary-container via-surface-tint to-tertiary text-surface-container-lowest font-mono text-xs font-black cyan-glow hover:shadow-[0_0_24px_rgba(0,212,255,0.6)] active:scale-95 transition-all flex items-center justify-center gap-2">
              <span class="material-symbols-outlined text-[18px]" style="font-variation-settings:'FILL' 1">check_circle</span>
              <span>Finish Workout (${liveVolume.toLocaleString()} kg)</span>
            </button>
          </div>
        </div>
      ` : ''}

      <!-- ========================================== -->
      <!-- TAB 2: ROUTINES & SPLITS                   -->
      <!-- ========================================== -->
      ${activeTab === 'routines' ? `
        <div class="space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/15">
            <div>
              <h3 class="text-lg font-bold text-white font-mono">Heavy Routine Templates</h3>
              <p class="text-xs text-outline font-mono">Choose a pre-built heavy split or create your own</p>
            </div>
            <button onclick="openHeavyAddExercise()" class="px-4 py-2 rounded-xl bg-primary-container text-surface-container-lowest font-mono text-xs font-bold hover:bg-surface-tint transition-all cyan-glow">
              + Custom Routine
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${hs.routines.map(r => `
              <div class="glass-surface rounded-2xl p-5 border border-outline-variant/20 hover:border-primary-container/40 transition-all flex flex-col justify-between space-y-4 group">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-primary-container/15 text-primary-container border border-primary-container/30 font-bold uppercase">
                      ${r.focus}
                    </span>
                    <span class="text-xs text-outline font-mono">⏱ ${r.estTime}</span>
                  </div>
                  <h4 class="text-base font-bold text-white group-hover:text-primary-container transition-colors">${r.name}</h4>
                  <p class="text-xs text-outline mt-1 font-mono">${r.split}</p>
                  <div class="mt-3 flex items-center gap-3 text-xs font-mono text-outline/80">
                    <span>${r.exercisesCount} Exercises</span>
                    <span>·</span>
                    <span>${r.setsCount} Total Sets</span>
                  </div>
                </div>
                <button onclick="startHeavyRoutine('${r.id}')" class="w-full py-2.5 rounded-xl bg-primary-container/20 hover:bg-primary-container text-primary-container hover:text-surface-container-lowest border border-primary-container/40 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95">
                  <span class="material-symbols-outlined text-[16px]">play_arrow</span>
                  <span>Start Routine →</span>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- ========================================== -->
      <!-- TAB 3: PRs & 1RM CALCULATOR                -->
      <!-- ========================================== -->
      ${activeTab === 'prs' ? `
        <div class="space-y-6">
          <!-- Big 4 PR Showcase -->
          <div>
            <h3 class="text-lg font-bold text-white font-mono mb-3 flex items-center gap-2">
              <span class="material-symbols-outlined text-amber-400">trophy</span>
              <span>Big 4 Heavy Personal Records (PRs)</span>
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              ${hs.prs.map(pr => `
                <div class="glass-surface rounded-2xl p-5 border border-amber-400/25 relative overflow-hidden">
                  <div class="text-[10px] font-mono uppercase text-outline flex items-center justify-between">
                    <span>${pr.date}</span>
                    <span class="text-amber-400 font-bold">🏆 PR</span>
                  </div>
                  <div class="text-3xl font-black text-amber-400 mt-2 font-mono">${pr.value}</div>
                  <p class="text-sm font-bold text-white mt-1">${pr.name}</p>
                  <p class="text-xs text-outline font-mono mt-0.5">${pr.note}</p>
                  <div class="mt-3 pt-2 border-t border-outline-variant/10 text-[11px] font-mono text-tertiary">
                    Estimated 1RM: <strong>${pr.oneRm}</strong>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Interactive 1RM Calculator Tool -->
          <div class="glass-surface rounded-2xl p-6 border border-primary-container/30 space-y-5">
            <div class="flex items-center justify-between pb-3 border-b border-outline-variant/15">
              <div>
                <h4 class="text-base font-bold text-white font-mono flex items-center gap-2">
                  <span class="material-symbols-outlined text-primary-container text-[20px]">calculate</span>
                  <span>Heavy 1-Rep Max (1RM) Calculator</span>
                </h4>
                <p class="text-xs text-outline font-mono mt-0.5">Calculated using combined Epley &amp; Brzycki load formulas</p>
              </div>
              <div class="text-right">
                <span class="text-[10px] font-mono text-outline uppercase block">Calculated 1RM</span>
                <span class="text-2xl font-black text-primary-container font-mono" id="heavy-1rm-result">120 kg</span>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div class="space-y-4">
                <div>
                  <label class="block text-xs font-mono text-outline mb-1.5 uppercase">Weight Lifted (kg)</label>
                  <input type="number" id="heavy-1rm-weight" value="${hs.calcWeight}" oninput="calculateHeavy1RM()" 
                         class="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2.5 text-white font-mono font-bold focus:border-primary-container outline-none" />
                </div>
                <div>
                  <label class="block text-xs font-mono text-outline mb-1.5 uppercase">Repetitions Performed (1 - 15)</label>
                  <input type="number" id="heavy-1rm-reps" value="${hs.calcReps}" min="1" max="15" oninput="calculateHeavy1RM()" 
                         class="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2.5 text-white font-mono font-bold focus:border-primary-container outline-none" />
                </div>
              </div>

              <!-- Percentage Load Table -->
              <div class="glass-surface rounded-xl p-4 border border-outline-variant/15">
                <p class="text-xs font-mono text-outline uppercase mb-2 font-bold">Training Intensity Percentages</p>
                <div class="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div class="p-2 rounded bg-surface-container-lowest/80 flex justify-between">
                    <span class="text-outline">95% (2 reps)</span>
                    <strong class="text-white" id="heavy-pct-95">114 kg</strong>
                  </div>
                  <div class="p-2 rounded bg-surface-container-lowest/80 flex justify-between">
                    <span class="text-outline">90% (4 reps)</span>
                    <strong class="text-white" id="heavy-pct-90">108 kg</strong>
                  </div>
                  <div class="p-2 rounded bg-surface-container-lowest/80 flex justify-between">
                    <span class="text-outline">85% (6 reps)</span>
                    <strong class="text-white" id="heavy-pct-85">102 kg</strong>
                  </div>
                  <div class="p-2 rounded bg-surface-container-lowest/80 flex justify-between">
                    <span class="text-outline">80% (8 reps)</span>
                    <strong class="text-white" id="heavy-pct-80">96 kg</strong>
                  </div>
                  <div class="p-2 rounded bg-surface-container-lowest/80 flex justify-between">
                    <span class="text-outline">75% (10 reps)</span>
                    <strong class="text-white" id="heavy-pct-75">90 kg</strong>
                  </div>
                  <div class="p-2 rounded bg-surface-container-lowest/80 flex justify-between">
                    <span class="text-outline">70% (12 reps)</span>
                    <strong class="text-white" id="heavy-pct-70">84 kg</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- ========================================== -->
      <!-- TAB 4: MUSCLE HEATMAP & VOLUME GAUGES      -->
      <!-- ========================================== -->
      ${activeTab === 'heatmap' ? `
        <div class="space-y-5">
          <div class="pb-2 border-b border-outline-variant/15">
            <h3 class="text-lg font-bold text-white font-mono">Weekly Volume &amp; Muscle Recovery</h3>
            <p class="text-xs text-outline font-mono">Direct tracking of sets completed per muscle group against weekly hypertrophy targets</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="glass-surface rounded-2xl p-5 border border-outline-variant/20 space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white text-sm">Chest (Pectorals)</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">🟢 Ready</span>
              </div>
              <div class="text-2xl font-black text-primary-container font-mono">14 <span class="text-xs text-outline font-normal">/ 16 sets</span></div>
              <div class="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                <div class="bg-primary-container h-full rounded-full" style="width: 88%"></div>
              </div>
              <p class="text-[10px] text-outline font-mono">Flat Bench, Incline DB, Cable Fly</p>
            </div>

            <div class="glass-surface rounded-2xl p-5 border border-outline-variant/20 space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white text-sm">Back &amp; Lats</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">🟢 Target Met</span>
              </div>
              <div class="text-2xl font-black text-tertiary font-mono">16 <span class="text-xs text-outline font-normal">/ 16 sets</span></div>
              <div class="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                <div class="bg-tertiary h-full rounded-full" style="width: 100%"></div>
              </div>
              <p class="text-[10px] text-outline font-mono">Deadlifts, Barbell Rows, Lat Pulldowns</p>
            </div>

            <div class="glass-surface rounded-2xl p-5 border border-outline-variant/20 space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white text-sm">Quads &amp; Hamstrings</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/30">🟡 Recovering (24h)</span>
              </div>
              <div class="text-2xl font-black text-amber-400 font-mono">12 <span class="text-xs text-outline font-normal">/ 18 sets</span></div>
              <div class="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                <div class="bg-amber-400 h-full rounded-full" style="width: 67%"></div>
              </div>
              <p class="text-[10px] text-outline font-mono">Back Squats, Romanian Deadlifts, Leg Press</p>
            </div>

            <div class="glass-surface rounded-2xl p-5 border border-outline-variant/20 space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white text-sm">Shoulders (Deltoids)</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">🟢 Ready</span>
              </div>
              <div class="text-2xl font-black text-primary-container font-mono">12 <span class="text-xs text-outline font-normal">/ 14 sets</span></div>
              <div class="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                <div class="bg-primary-container h-full rounded-full" style="width: 86%"></div>
              </div>
              <p class="text-[10px] text-outline font-mono">Overhead Press, Lateral Raises, Face Pulls</p>
            </div>

            <div class="glass-surface rounded-2xl p-5 border border-outline-variant/20 space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white text-sm">Biceps &amp; Triceps</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">🟢 Ready</span>
              </div>
              <div class="text-2xl font-black text-secondary font-mono">14 <span class="text-xs text-outline font-normal">/ 16 sets</span></div>
              <div class="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                <div class="bg-secondary h-full rounded-full" style="width: 88%"></div>
              </div>
              <p class="text-[10px] text-outline font-mono">Incline Curls, Rope Pushdowns, Skullcrushers</p>
            </div>

            <div class="glass-surface rounded-2xl p-5 border border-outline-variant/20 space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white text-sm">Abs &amp; Core</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">🟢 Ready</span>
              </div>
              <div class="text-2xl font-black text-tertiary font-mono">8 <span class="text-xs text-outline font-normal">/ 10 sets</span></div>
              <div class="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                <div class="bg-tertiary h-full rounded-full" style="width: 80%"></div>
              </div>
              <p class="text-[10px] text-outline font-mono">Hanging Leg Raises, Cable Crunches, Planks</p>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- ========================================== -->
      <!-- TAB 5: WORKOUT HISTORY                     -->
      <!-- ========================================== -->
      ${activeTab === 'history' ? `
        <div class="space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/15">
            <div>
              <h3 class="text-lg font-bold text-white font-mono">Heavy Workout History</h3>
              <p class="text-xs text-outline font-mono">Past recorded gym sessions, volume tonnage, and PR achievements</p>
            </div>
            <button onclick="setHeavyTab('logger')" class="px-4 py-2 rounded-xl bg-primary-container text-surface-container-lowest font-mono text-xs font-bold hover:bg-surface-tint cyan-glow">
              + Log New Workout
            </button>
          </div>

          <div class="space-y-3">
            ${hs.history.map(item => `
              <div class="glass-surface rounded-2xl p-5 border border-outline-variant/20 hover:border-primary-container/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-bold text-white">${item.name}</span>
                    ${item.prs ? `<span class="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-400 text-[10px] font-mono font-bold">🏆 ${item.prs} PRs</span>` : ''}
                  </div>
                  <p class="text-xs text-outline font-mono">📅 ${item.date} · ⏱ ${item.duration} · ${item.sets} Sets completed</p>
                </div>
                <div class="text-left sm:text-right shrink-0">
                  <span class="text-[10px] font-mono uppercase text-outline block">Total Volume Lifted</span>
                  <span class="text-xl font-black text-primary-container font-mono">${item.volume}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
  }


  // --- 08. NUTRITION & DIET ---
  function renderNutritionDomain(s) {
    const nut = s.nutrition || {};
    const today = nut.today || { calories: 1840, targetCalories: 2200, protein: 124, targetProtein: 140, water: 2.4 };
    const meals = nut.meals || [
      { name: 'Oatmeal & Whey Protein', cal: 450, time: '08:30' },
      { name: 'Grilled Chicken, Rice & Greens', cal: 720, time: '13:30' },
      { name: 'Greek Yogurt & Almonds', cal: 280, time: '17:45' }
    ];

    return `
      <!-- Macro Overview -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="glass-surface p-4 rounded-xl border border-primary-container/20">
          <p class="text-[10px] font-mono uppercase text-outline">Calorie Balance</p>
          <div class="text-2xl font-bold text-primary-container mt-1">${today.calories} <span class="text-xs font-normal text-outline">/ ${today.targetCalories} kcal</span></div>
          <p class="text-[10px] text-tertiary font-mono">360 kcal remaining</p>
        </div>
        <div class="glass-surface p-4 rounded-xl border border-tertiary/20">
          <p class="text-[10px] font-mono uppercase text-outline">Protein Goal</p>
          <div class="text-2xl font-bold text-tertiary mt-1">${today.protein}g <span class="text-xs font-normal text-outline">/ ${today.targetProtein}g</span></div>
          <p class="text-[10px] text-tertiary font-mono">88% of target</p>
        </div>
        <div class="glass-surface p-4 rounded-xl border border-cyan-400/20">
          <p class="text-[10px] font-mono uppercase text-outline">Daily Hydration</p>
          <div class="text-2xl font-bold text-cyan-400 mt-1">${today.water} L <span class="text-xs font-normal text-outline">/ 3.5 L</span></div>
          <div class="flex gap-2 mt-2">
            <button onclick="addQuickWater(0.25)" class="px-2 py-0.5 rounded bg-cyan-400/20 text-cyan-400 text-[10px] font-mono hover:bg-cyan-400/30">+250ml</button>
            <button onclick="addQuickWater(0.5)" class="px-2 py-0.5 rounded bg-cyan-400/20 text-cyan-400 text-[10px] font-mono hover:bg-cyan-400/30">+500ml</button>
          </div>
        </div>
        <div class="glass-surface p-4 rounded-xl border border-amber-400/20">
          <p class="text-[10px] font-mono uppercase text-outline">Clean Eating Score</p>
          <div class="text-2xl font-bold text-amber-400 mt-1">92 / 100</div>
          <p class="text-[10px] text-outline font-mono">Zero processed sugar today</p>
        </div>
      </div>

      <!-- Meal Logs -->
      <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-3">
        <h4 class="text-sm font-bold text-white flex items-center gap-2">
          <span class="material-symbols-outlined text-tertiary text-[18px]">restaurant</span>
          Today's Logged Meals
        </h4>
        <div class="space-y-2">
          ${meals.map(m => `
            <div class="p-3 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/15 flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-white">${m.name}</p>
                <p class="text-[10px] text-outline font-mono">${m.time} · Clean Nutrition</p>
              </div>
              <span class="text-xs font-mono font-bold text-primary-container">${m.cal} kcal</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // --- 09. FINANCE & WEALTH ---
  function renderFinanceDomain(s) {
    const f = s.finance || { balance: 42650, monthlyIncome: 65000, monthlyExpenses: 36800, savings: 145000, savingsGoal: 200000 };
    const txs = f.transactions || [
      { name: 'Grocery Market', amount: -1420, category: 'Food', date: '2026-09-21' },
      { name: 'Freelance Frontend Stipend', amount: 15000, category: 'Income', date: '2026-09-20' },
      { name: 'AWS Cloud Hosting', amount: -680, category: 'Tech', date: '2026-09-18' }
    ];

    return `
      <!-- Financial Overview -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="glass-surface p-4 rounded-xl border border-tertiary/20">
          <p class="text-[10px] font-mono uppercase text-outline">Liquid Net Balance</p>
          <div class="text-2xl font-bold text-tertiary mt-1">₹${f.balance.toLocaleString()}</div>
          <p class="text-[10px] text-tertiary font-mono">Checking + Liquid Cash</p>
        </div>
        <div class="glass-surface p-4 rounded-xl border border-rose-400/20">
          <p class="text-[10px] font-mono uppercase text-outline">Monthly Spend</p>
          <div class="text-2xl font-bold text-rose-400 mt-1">₹${f.monthlyExpenses.toLocaleString()}</div>
          <p class="text-[10px] text-outline font-mono">73% of ₹50k limit</p>
        </div>
        <div class="glass-surface p-4 rounded-xl border border-primary-container/20">
          <p class="text-[10px] font-mono uppercase text-outline">Monthly Inflow</p>
          <div class="text-2xl font-bold text-primary-container mt-1">₹${f.monthlyIncome.toLocaleString()}</div>
          <p class="text-[10px] text-outline font-mono">Stipend &amp; Projects</p>
        </div>
        <div class="glass-surface p-4 rounded-xl border border-amber-400/20">
          <p class="text-[10px] font-mono uppercase text-outline">Emergency Savings</p>
          <div class="text-2xl font-bold text-amber-400 mt-1">₹${f.savings.toLocaleString()}</div>
          <p class="text-[10px] text-amber-400 font-mono">72% of ₹2.0L goal</p>
        </div>
      </div>

      <!-- Live Transactions Stream -->
      <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-outline-variant/10">
          <h4 class="text-sm font-bold text-white flex items-center gap-2">
            <span class="material-symbols-outlined text-secondary text-[18px]">receipt_long</span>
            Recent Financial Transactions
          </h4>
          <span class="text-[10px] font-mono text-outline">Live Ledger</span>
        </div>
        <div class="space-y-2">
          ${txs.map(tx => `
            <div class="p-3 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/15 flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-white">${tx.name}</p>
                <p class="text-[10px] text-outline font-mono">${tx.category} · ${tx.date}</p>
              </div>
              <span class="text-xs font-mono font-bold ${tx.amount>0?'text-tertiary':'text-rose-400'}">
                ${tx.amount > 0 ? '+' : ''}₹${Math.abs(tx.amount).toLocaleString()}
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // --- 10. WELLBEING & MOOD ---
  function renderWellbeingDomain(s) {
    const wb = s.wellbeing || { todayMood: 4, stressLevel: 2, sleepHours: 7.2 };
    return `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="glass-surface p-4 rounded-xl border border-tertiary/20">
          <p class="text-[10px] font-mono uppercase text-outline">Today's Mood Score</p>
          <div class="text-2xl font-bold text-tertiary mt-1">${wb.todayMood || 4} / 5</div>
          <p class="text-[10px] text-outline font-mono">Optimal &amp; Focused</p>
        </div>
        <div class="glass-surface p-4 rounded-xl border border-primary-container/20">
          <p class="text-[10px] font-mono uppercase text-outline">Sleep Duration</p>
          <div class="text-2xl font-bold text-primary-container mt-1">${wb.sleepHours || 7.2} Hours</div>
          <p class="text-[10px] text-tertiary font-mono">1.8h Deep Sleep</p>
        </div>
        <div class="glass-surface p-4 rounded-xl border border-amber-400/20">
          <p class="text-[10px] font-mono uppercase text-outline">Stress Metric</p>
          <div class="text-2xl font-bold text-amber-400 mt-1">${wb.stressLevel || 2} / 5 (Low)</div>
          <p class="text-[10px] text-outline font-mono">Nominal telemetry</p>
        </div>
        <div class="glass-surface p-4 rounded-xl border border-secondary/20">
          <p class="text-[10px] font-mono uppercase text-outline">Mindfulness Streak</p>
          <div class="text-2xl font-bold text-secondary mt-1">8 Days</div>
          <p class="text-[10px] text-outline font-mono">Daily meditation</p>
        </div>
      </div>

      <!-- Quick Mood Check-in -->
      <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-3">
        <h4 class="text-sm font-bold text-white flex items-center gap-2">
          <span class="material-symbols-outlined text-tertiary text-[18px]">mood</span>
          Rapid Mood Check-in (Tap to Log)
        </h4>
        <div class="flex justify-around py-3">
          <button onclick="logQuickMood(1)" class="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-surface-container transition-all">
            <span class="text-2xl">😫</span>
            <span class="text-[10px] font-mono text-outline">Exhausted</span>
          </button>
          <button onclick="logQuickMood(2)" class="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-surface-container transition-all">
            <span class="text-2xl">😣</span>
            <span class="text-[10px] font-mono text-outline">Stressed</span>
          </button>
          <button onclick="logQuickMood(3)" class="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-surface-container transition-all">
            <span class="text-2xl">😐</span>
            <span class="text-[10px] font-mono text-outline">Neutral</span>
          </button>
          <button onclick="logQuickMood(4)" class="flex flex-col items-center gap-1 p-3 rounded-xl bg-surface-container border border-primary-container/30 transition-all">
            <span class="text-2xl">😊</span>
            <span class="text-[10px] font-mono text-primary-container font-bold">Good (4)</span>
          </button>
          <button onclick="logQuickMood(5)" class="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-surface-container transition-all">
            <span class="text-2xl">🚀</span>
            <span class="text-[10px] font-mono text-outline">Peak Flow</span>
          </button>
        </div>
      </div>
    `;
  }

  // --- 11. SHOPPING & INVENTORY ---
  function renderShoppingDomain(s) {
    const shop = s.shopping || {};
    const groceries = shop.groceries || [
      { name: 'Oat Milk (Almond)', done: false },
      { name: 'Rolled Oats 1kg', done: false },
      { name: 'Peanut Butter (Unsweetened)', done: true },
      { name: 'Bananas & Apples', done: false }
    ];

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/10">
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              <span class="material-symbols-outlined text-amber-400 text-[18px]">shopping_cart</span>
              Pantry &amp; Grocery List
            </h4>
            <span class="text-[10px] font-mono text-outline">Click to mark bought</span>
          </div>
          <div class="space-y-2">
            ${groceries.map(g => `
              <div onclick="toggleGroceryItem('${g.name.replace(/'/g, "\\'")}')" 
                   class="p-2.5 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/15 flex items-center justify-between cursor-pointer hover:bg-surface-container transition-colors">
                <div class="flex items-center gap-2.5">
                  <span class="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${g.done?'bg-tertiary text-black':'border border-outline-variant'}">
                    ${g.done ? '✓' : ''}
                  </span>
                  <span class="text-xs ${g.done?'line-through text-outline':'text-white'}">${g.name}</span>
                </div>
                <span class="text-[9px] font-mono ${g.done?'text-tertiary':'text-outline'}">${g.done?'BOUGHT':'NEEDED'}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/10">
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              <span class="material-symbols-outlined text-primary-container text-[18px]">favorite</span>
              Tech &amp; Gear Wishlist
            </h4>
            <span class="text-[10px] font-mono text-outline">Prioritized</span>
          </div>
          <div class="space-y-2">
            <div class="p-2.5 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/15 flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-white">Logitech MX Master 3S</p>
                <p class="text-[10px] text-outline font-mono">Ergonomics · High Priority</p>
              </div>
              <span class="text-xs font-mono font-bold text-primary-container">₹7,995</span>
            </div>
            <div class="p-2.5 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/15 flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-white">4K Monitor Stand with USB-C</p>
                <p class="text-[10px] text-outline font-mono">Desk Setup · Medium Priority</p>
              </div>
              <span class="text-xs font-mono font-bold text-outline">₹2,499</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --- 12. RELATIONSHIPS ---
  function renderRelationshipsDomain(s) {
    const contacts = s.relationships || [
      { name: 'Mom', role: 'Family', cadence: 'Daily', last: 'Yesterday', birthday: 'Today! 🎉' },
      { name: 'Dad', role: 'Family', cadence: '2x / week', last: '2 days ago' },
      { name: 'Rohan Sharma', role: 'Friend', cadence: 'Weekly', last: '6 days ago' },
      { name: 'Vikram (Mentor)', role: 'Career', cadence: 'Monthly', last: '12 days ago' }
    ];

    return `
      <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-outline-variant/10">
          <h4 class="text-sm font-bold text-white flex items-center gap-2">
            <span class="material-symbols-outlined text-pink-400 text-[18px]">favorite</span>
            Key Relationships &amp; Cadence Telemetry
          </h4>
          <span class="text-[10px] font-mono text-pink-400">Never let important bonds drift</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${contacts.map(c => `
            <div class="p-3.5 rounded-xl bg-surface-container-lowest/60 border border-outline-variant/15 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-pink-400/15 text-pink-400 flex items-center justify-center font-bold text-sm">
                  ${c.name.slice(0, 1)}
                </div>
                <div>
                  <div class="flex items-center gap-1.5">
                    <p class="text-xs font-bold text-white">${c.name}</p>
                    ${c.birthday ? `<span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-400 font-mono font-bold">${c.birthday}</span>` : ''}
                  </div>
                  <p class="text-[10px] text-outline font-mono">${c.role} · Cadence: ${c.cadence}</p>
                </div>
              </div>
              <button onclick="if(window.showToast) showToast('Interaction logged with ${c.name}!');" class="px-2.5 py-1 rounded-lg glass-surface hover:bg-surface-container text-[10px] font-mono text-outline hover:text-white border border-outline-variant/25">
                Log Call
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // --- 13. HOME CARE ---
  function renderHomeModuleDomain(s) {
    const chores = s.homeModule?.chores || [
      { task: 'Clean Study Desk & Cable Hygiene', done: true, frequency: 'Daily' },
      { task: 'Laundry & Ironing', done: false, frequency: 'Weekly' },
      { task: 'Vacuum Living Room & Balcony', done: false, frequency: 'Weekly' },
      { task: 'Water Plants', done: true, frequency: 'Daily' }
    ];

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-3">
          <h4 class="text-sm font-bold text-white flex items-center gap-2">
            <span class="material-symbols-outlined text-primary-container text-[18px]">cleaning_services</span>
            Household Chores Rotation
          </h4>
          <div class="space-y-2">
            ${chores.map(c => `
              <div onclick="toggleChoreItem('${c.task.replace(/'/g, "\\'")}')" 
                   class="p-2.5 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/15 flex items-center justify-between cursor-pointer hover:bg-surface-container transition-colors">
                <div class="flex items-center gap-2.5">
                  <span class="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${c.done?'bg-tertiary text-black':'border border-outline-variant'}">
                    ${c.done ? '✓' : ''}
                  </span>
                  <span class="text-xs ${c.done?'line-through text-outline':'text-white'}">${c.task}</span>
                </div>
                <span class="text-[9px] font-mono ${c.done?'text-tertiary':'text-outline'}">${c.frequency}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-3">
          <h4 class="text-sm font-bold text-white flex items-center gap-2">
            <span class="material-symbols-outlined text-secondary text-[18px]">bolt</span>
            Utilities &amp; Appliances Status
          </h4>
          <div class="space-y-2">
            <div class="p-2.5 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/15 flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-white">Electricity Bill</p>
                <p class="text-[10px] text-outline font-mono">Due in 12 days · ₹1,840 est.</p>
              </div>
              <span class="text-[9px] px-2 py-0.5 rounded bg-tertiary/20 text-tertiary font-mono">ON TRACK</span>
            </div>
            <div class="p-2.5 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/15 flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-white">Water Purifier Filter</p>
                <p class="text-[10px] text-outline font-mono">Filter life: 74%</p>
              </div>
              <span class="text-[9px] px-2 py-0.5 rounded bg-primary-container/20 text-primary-container font-mono">NOMINAL</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --- 14. VEHICLE CARE ---
  function renderVehicleDomain(s) {
    const v = s.vehicle || { make: 'Yamaha MT-15 (2023)', fuel: 72, odometer: 8420, nextService: 10000 };
    return `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="glass-surface p-4 rounded-xl border border-primary-container/20">
          <p class="text-[10px] font-mono uppercase text-outline">Vehicle Profile</p>
          <div class="text-base font-bold text-white mt-1 truncate">${v.make}</div>
          <p class="text-[10px] text-primary-container font-mono">Motorcycle</p>
        </div>
        <div class="glass-surface p-4 rounded-xl border border-tertiary/20">
          <p class="text-[10px] font-mono uppercase text-outline">Fuel Tank Gauge</p>
          <div class="text-2xl font-bold text-tertiary mt-1">${v.fuel}%</div>
          <p class="text-[10px] text-outline font-mono">~280 km range remaining</p>
        </div>
        <div class="glass-surface p-4 rounded-xl border border-secondary/20">
          <p class="text-[10px] font-mono uppercase text-outline">Odometer Reading</p>
          <div class="text-2xl font-bold text-secondary mt-1">${v.odometer} km</div>
          <p class="text-[10px] text-outline font-mono">Next service in ${v.nextService - v.odometer} km</p>
        </div>
        <div class="glass-surface p-4 rounded-xl border border-amber-400/20">
          <p class="text-[10px] font-mono uppercase text-outline">Insurance &amp; PUC</p>
          <div class="text-2xl font-bold text-amber-400 mt-1">Valid</div>
          <p class="text-[10px] text-outline font-mono">Expires in 142 days</p>
        </div>
      </div>
    `;
  }

  // --- 15. TRAVEL & TRIPS ---
  function renderTravelDomain(s) {
    const travel = s.travel || {};
    const trip = (travel.trips && travel.trips[0]) || { name: 'Goa Coastal Retreat', dates: 'October 18 - 22, 2026', progress: 57 };
    const packing = [
      { item: 'Beachwear & Towel', done: true },
      { item: 'MacBook & Type-C GaN Charger', done: true },
      { item: 'Sunglasses & Sunscreen SPF 50', done: false },
      { item: 'Identity Docs & Driving License', done: true },
      { item: 'First Aid & Motion Sickness Meds', done: false }
    ];

    return `
      <div class="glass-surface p-5 rounded-xl border border-primary-container/20 space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-outline-variant/10">
          <div>
            <span class="text-[10px] font-mono text-primary-container uppercase font-bold">UPCOMING EXPEDITION</span>
            <h3 class="text-lg font-bold text-white">${trip.name}</h3>
            <p class="text-xs text-outline font-mono">${trip.dates} · Flight Confirmed</p>
          </div>
          <span class="text-xs font-mono font-bold text-primary-container px-3 py-1 rounded-lg bg-primary-container/10 border border-primary-container/30">
            26 Days Countdown
          </span>
        </div>

        <div>
          <p class="text-[11px] font-mono text-outline uppercase tracking-wider mb-2">Packing Checklist (Click to check off)</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            ${packing.map(p => `
              <div onclick="this.querySelector('.check-box').innerText = this.querySelector('.check-box').innerText==='✓'?'':'✓'; this.classList.toggle('opacity-50')" 
                   class="p-2.5 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/15 flex items-center gap-2.5 cursor-pointer hover:bg-surface-container transition-all">
                <span class="check-box w-4 h-4 rounded border border-outline-variant flex items-center justify-center text-[10px] font-bold ${p.done?'bg-tertiary text-black border-tertiary':''}">
                  ${p.done ? '✓' : ''}
                </span>
                <span class="text-xs text-white">${p.item}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // --- 16. ENTERTAINMENT ---
  function renderEntertainmentDomain(s) {
    const books = [
      { title: 'Designing Data-Intensive Applications', progress: 64, type: 'Book' },
      { title: 'Project Hail Mary', progress: 100, type: 'Book (Done)' },
      { title: 'Severance (Season 2)', progress: 20, type: 'Series' }
    ];

    return `
      <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-3">
        <h4 class="text-sm font-bold text-white flex items-center gap-2">
          <span class="material-symbols-outlined text-purple-400 text-[18px]">menu_book</span>
          Reading Progress &amp; Leisure Queue
        </h4>
        <div class="space-y-3">
          ${books.map(b => `
            <div class="p-3 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/15 space-y-2">
              <div class="flex items-center justify-between">
                <p class="text-xs font-bold text-white">${b.title}</p>
                <span class="text-xs font-mono font-bold text-purple-400">${b.progress}%</span>
              </div>
              <div class="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                <div class="bg-purple-400 h-full rounded-full" style="width:${b.progress}%"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // --- 17. DOCUMENTS ---
  function renderDocumentsDomain(s) {
    const docs = [
      { name: 'Passport (Republic of India)', exp: 'Valid until 2031', cat: 'Identity' },
      { name: 'Aadhaar Card (Verified)', exp: 'Permanent', cat: 'Identity' },
      { name: 'University Grade Transcripts', exp: 'Semester 1-6', cat: 'Academic' },
      { name: 'Yamaha Two-Wheeler Insurance Policy', exp: 'Expires in 142 days', cat: 'Vehicle' }
    ];

    return `
      <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-3">
        <h4 class="text-sm font-bold text-white flex items-center gap-2">
          <span class="material-symbols-outlined text-primary-container text-[18px]">lock</span>
          Encrypted Document Vault Catalog
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${docs.map(d => `
            <div class="p-3 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/15 flex items-center justify-between">
              <div>
                <p class="text-xs font-bold text-white">${d.name}</p>
                <p class="text-[10px] text-outline font-mono">${d.cat} · ${d.exp}</p>
              </div>
              <span class="text-[9px] px-2 py-0.5 rounded bg-primary-container/15 text-primary-container font-mono">VERIFIED</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // --- 18. KNOWLEDGE ---
  function renderKnowledgeDomain(s) {
    const notes = [
      { title: 'Operating Systems: Virtual Memory & Thrashing', tags: '#cs #os #memory' },
      { title: 'Distributed Systems: Consensus & Raft Protocol', tags: '#cs #distributed #raft' },
      { title: 'Progressive Overload & Hypertrophy Rep Ranges', tags: '#fitness #science' }
    ];

    return `
      <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-outline-variant/10">
          <h4 class="text-sm font-bold text-white flex items-center gap-2">
            <span class="material-symbols-outlined text-yellow-400 text-[18px]">lightbulb</span>
            Second-Brain Notes (1,420 Entries)
          </h4>
          <span class="text-[10px] font-mono text-outline">Searchable via Ctrl+K</span>
        </div>
        <div class="space-y-2">
          ${notes.map(n => `
            <div class="p-3 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/15 flex items-center justify-between">
              <div>
                <p class="text-xs font-bold text-white">${n.title}</p>
                <p class="text-[10px] text-primary-container font-mono">${n.tags}</p>
              </div>
              <button onclick="if(window.showToast) showToast('Opening note...');" class="text-outline hover:text-white text-xs font-mono">View →</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // --- 19. ROUTINES ---
  function renderRoutinesDomain(s) {
    const morning = [
      { step: '06:30 Wakeup without snooze', done: true },
      { step: '500ml Water + Himalayan pink salt', done: true },
      { step: '10 mins outdoor sunlight exposure', done: true },
      { step: 'Cold shower reset', done: false }
    ];

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/10">
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              <span class="material-symbols-outlined text-amber-400 text-[18px]">light_mode</span>
              Morning Protocol
            </h4>
            <span class="text-[10px] font-mono text-tertiary">12-Day Streak 🔥</span>
          </div>
          <div class="space-y-2">
            ${morning.map(m => `
              <div onclick="toggleRoutineItem('morning', '${m.step.replace(/'/g, "\\'")}')" 
                   class="p-2.5 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/15 flex items-center justify-between cursor-pointer hover:bg-surface-container transition-colors">
                <div class="flex items-center gap-2.5">
                  <span class="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${m.done?'bg-tertiary text-black':'border border-outline-variant'}">
                    ${m.done ? '✓' : ''}
                  </span>
                  <span class="text-xs ${m.done?'line-through text-outline':'text-white'}">${m.step}</span>
                </div>
                <span class="text-[9px] font-mono ${m.done?'text-tertiary':'text-outline'}">${m.done?'DONE':'PENDING'}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/10">
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              <span class="material-symbols-outlined text-secondary text-[18px]">bedtime</span>
              Evening Neuro-Reset (23:30)
            </h4>
            <span class="text-[10px] font-mono text-outline">Sleep Hygiene</span>
          </div>
          <div class="space-y-2">
            <div class="p-2.5 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/15 flex items-center gap-2.5">
              <span class="w-4 h-4 rounded border border-outline-variant flex items-center justify-center text-[10px]"></span>
              <span class="text-xs text-white">Screens off &amp; Night shift filter</span>
            </div>
            <div class="p-2.5 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/15 flex items-center gap-2.5">
              <span class="w-4 h-4 rounded border border-outline-variant flex items-center justify-center text-[10px]"></span>
              <span class="text-xs text-white">Chamomile tea &amp; 10m fiction reading</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --- 20. DIGITAL LIFE ---
  function renderDigitalLifeDomain(s) {
    const subs = [
      { name: 'GitHub Copilot Pro', cost: 850, date: 'Renews 5th' },
      { name: 'Spotify Premium Family', cost: 179, date: 'Renews 12th' },
      { name: 'Google One 200GB Storage', cost: 210, date: 'Renews 18th' },
      { name: 'Netflix 4K Tier', cost: 649, date: 'Renews 28th' }
    ];

    return `
      <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-outline-variant/10">
          <h4 class="text-sm font-bold text-white flex items-center gap-2">
            <span class="material-symbols-outlined text-cyan-400 text-[18px]">devices</span>
            Active Subscriptions &amp; Monthly Burn
          </h4>
          <span class="text-xs font-mono font-bold text-amber-400">Total: ₹2,840 / mo</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${subs.map(sb => `
            <div class="p-3 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/15 flex items-center justify-between">
              <div>
                <p class="text-xs font-bold text-white">${sb.name}</p>
                <p class="text-[10px] text-outline font-mono">${sb.date}</p>
              </div>
              <span class="text-xs font-mono font-bold text-primary-container">₹${sb.cost}/mo</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // --- 21. ANALYTICS ---
  function renderAnalyticsDomain(s) {
    return `
      <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-outline-variant/10">
          <h4 class="text-sm font-bold text-white flex items-center gap-2">
            <span class="material-symbols-outlined text-primary-container text-[18px]">query_stats</span>
            Holistic Life Quality Index: 84 / 100
          </h4>
          <span class="text-xs font-mono text-tertiary font-bold">Optimal Balance</span>
        </div>
        <p class="text-xs text-outline font-mono leading-relaxed">
          System analytics aggregates live invariant telemetry across all 22 life domains. 
          Current strength: Physical Vitality (91%) &amp; Routines (95%). 
          Focus area: Operating Systems Exam syllabus gap (42% remaining).
        </p>
      </div>
    `;
  }

  // --- 22. SETTINGS ---
  function renderSettingsDomain(s) {
    return `
      <div class="glass-surface p-5 rounded-xl border border-outline-variant/20 space-y-4">
        <h4 class="text-sm font-bold text-white flex items-center gap-2">
          <span class="material-symbols-outlined text-primary-container text-[18px]">settings</span>
          System Engine &amp; AI Preferences
        </h4>
        <div class="space-y-3">
          <div class="p-3 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/15 flex items-center justify-between">
            <div>
              <p class="text-xs font-bold text-white">Google Gemini API Key</p>
              <p class="text-[10px] text-outline font-mono">Embedded client-side key for function calling</p>
            </div>
            <button onclick="const k=prompt('Enter Gemini API Key:'); if(k){localStorage.setItem('tadashi_gemini_key', k); if(window.showToast) showToast('Gemini Key saved!');}" class="px-3 py-1 rounded bg-primary-container text-black font-mono text-xs font-bold">
              Configure Key
            </button>
          </div>
          <div class="p-3 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p class="text-xs font-bold text-white">LocalStorage Database &amp; Backups</p>
              <p class="text-[10px] text-outline font-mono">Export, import, or safely reset persistent LifeOS state across all 22 domains</p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <input type="file" id="tadashi-import-input" accept=".json,application/json" class="hidden" onchange="window.importData(event)">
              <button onclick="window.exportData()" class="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-white font-mono text-xs font-semibold flex items-center gap-1.5 transition-all">
                <span class="material-symbols-outlined text-[15px]">download</span>
                <span>Export JSON</span>
              </button>
              <button onclick="document.getElementById('tadashi-import-input').click()" class="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-primary-container font-mono text-xs font-semibold flex items-center gap-1.5 transition-all">
                <span class="material-symbols-outlined text-[15px]">upload</span>
                <span>Import JSON</span>
              </button>
              ${(window.DB && window.DB.hasPreResetBackup && window.DB.hasPreResetBackup()) ? `
                <button onclick="window.restoreResetBackup()" class="px-3 py-1.5 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono text-xs font-semibold flex items-center gap-1.5 hover:bg-amber-400/30 transition-all">
                  <span class="material-symbols-outlined text-[15px]">history</span>
                  <span>Restore Backup</span>
                </button>
              ` : ''}
              <button onclick="window.confirmResetDB()" class="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 font-mono text-xs font-bold hover:bg-rose-500/30 transition-all">
                Reset DB
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderGenericDomain(id, domain, s) {
    return `
      <div class="glass-surface p-6 rounded-xl border border-outline-variant/20 space-y-3">
        <h4 class="text-base font-bold text-white">${domain.name}</h4>
        <p class="text-xs text-outline font-mono">Interactive management for ${domain.name}. Real-time telemetry synchronized with persistent LocalStorage DB.</p>
      </div>
    `;
  }

  // Expose to window
  window.openDomainPage = openDomainPage;
  window.renderDomainPage = renderDomainPage;
  window.returnToDomainsHub = returnToDomainsHub;

  // Listen to DB changes and re-render if current domain page is visible
  document.addEventListener('DOMContentLoaded', () => {
    if (window.DB && typeof window.DB.onChange === 'function') {
      window.DB.onChange((change) => {
        const page = document.getElementById('view-domain-page');
        if (page && !page.classList.contains('hidden') && currentDomainId) {
          renderDomainPage(currentDomainId);
        }
      });
    }

    // Check URL hash on page load
    const hash = window.location.hash ? window.location.hash.replace('#', '') : '';
    if (hash && (window.DOMAINS || []).some(d => d.id === hash || ALIAS_MAP[hash])) {
      openDomainPage(hash);
    }
  });

  // Export LifeOS data as downloadable JSON
  window.exportData = function() {
    if (!window.DB) return;
    const dataStr = JSON.stringify(window.DB.getAll(), null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tadashi-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    if (typeof window.showToast === 'function') window.showToast('LifeOS data exported successfully! 💾');
  };

  // Import LifeOS data from user JSON file with validation & backup
  window.importData = function(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Root structure must be a JSON object');
        }
        if (confirm('Importing this file will replace your current LifeOS database. A safety snapshot will be kept. Proceed?')) {
          if (window.DB && typeof window.DB.importState === 'function') {
            window.DB.importState(parsed);
          } else if (window.DB) {
            window.DB._state = parsed;
            window.DB._save();
          }
          if (typeof window.showToast === 'function') window.showToast('Data imported successfully! Reloading...');
          setTimeout(() => location.reload(), 500);
        }
      } catch(err) {
        alert('Failed to import data: Invalid or corrupted JSON file (' + err.message + ')');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  // Safe guarded reset with pre-reset snapshot
  window.confirmResetDB = function() {
    if (confirm('CRITICAL WARNING: This will reset all 22 TADASHI domains back to default seed data.\n\nA safety backup will be stored before reset, so you can restore if needed.\n\nDo you wish to proceed?')) {
      if (window.DB) {
        window.DB.reset();
        if (typeof window.showToast === 'function') window.showToast('Database reset to defaults!');
        setTimeout(() => location.reload(), 400);
      }
    }
  };

  // Restore pre-reset backup
  window.restoreResetBackup = function() {
    if (!window.DB || !window.DB.hasPreResetBackup || !window.DB.hasPreResetBackup()) {
      alert('No safety backup found.');
      return;
    }
    if (confirm('Restore your data from the safety backup saved before the last reset?')) {
      if (window.DB.restorePreResetBackup()) {
        alert('Safety backup restored successfully! Reloading...');
        location.reload();
      } else {
        alert('Failed to restore backup.');
      }
    }
  };

})(window);
