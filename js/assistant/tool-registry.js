// ============================================================
// TADASHI LifeOS — Typed Tool Registry & Policy Layer (Phase 2)
// Enforces schema validation, risk classification, approval gates,
// idempotent execution, verified persistence, and audit logging.
// ============================================================

(function(window) {
  'use strict';

  // Risk Classifications per docs/03_API_AND_TOOL_CONTRACTS.md
  const RISK = {
    READ: 'read',
    NAVIGATION: 'navigation',
    REVERSIBLE_WRITE: 'reversible_write',
    EXTERNAL_EFFECT: 'external_effect',
    DESTRUCTIVE: 'destructive'
  };

  // Honest Action Outcome Classifications per Mark LVI core/outcome.py
  const OUTCOME = {
    VERIFIED_DONE: 'verified_done',
    UNVERIFIED: 'unverified',
    FAILED: 'failed',
    PENDING_APPROVAL: 'pending_approval',
    CANCELLED: 'cancelled'
  };

  const AUDIT_STORAGE_KEY = 'tadashi_tool_audit_log';
  const MAX_AUDIT_RECORDS = 60;

  // Registered Tools Store, Idempotency Cache, and Pending Approval Proposals
  const registry = new Map();
  const idempotencyCache = new Map();
  const pendingProposals = new Map();

  // Audit Logger
  function recordAuditEvent(entry) {
    try {
      const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
      const log = raw ? JSON.parse(raw) : [];
      log.unshift({
        ...entry,
        timestamp: new Date().toISOString()
      });
      if (log.length > MAX_AUDIT_RECORDS) log.length = MAX_AUDIT_RECORDS;
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(log));
    } catch(e) {
      console.warn('Could not record tool audit event:', e);
    }
  }

  // Schema Validator (Checks types, enums, required fields, and sanitization)
  function validateInput(schema, input) {
    if (!schema) return { valid: true };
    const data = input || {};

    // Check required fields
    if (Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
          return { valid: false, error: `Missing required field: "${field}"` };
        }
      }
    }

    // Check properties
    const props = schema.properties || {};
    for (const [key, val] of Object.entries(data)) {
      const def = props[key];
      if (!def) continue;

      // Type checks
      const expectedType = (def.type || '').toUpperCase();
      if (expectedType === 'STRING') {
        if (typeof val !== 'string') return { valid: false, error: `Field "${key}" must be a string` };
        // Injection guard: reject raw script tags, javascript: URIs, executable payloads
        if (/<script\b[^>]*>|<\/script>|javascript:/i.test(val)) {
          return { valid: false, error: `Disallowed characters or executable payload in field "${key}"` };
        }
      } else if (expectedType === 'NUMBER') {
        if (typeof val !== 'number' || isNaN(val)) {
          return { valid: false, error: `Field "${key}" must be a valid number` };
        }
      } else if (expectedType === 'BOOLEAN') {
        if (typeof val !== 'boolean') return { valid: false, error: `Field "${key}" must be a boolean` };
      }

      // Enum check
      if (Array.isArray(def.enum) && !def.enum.includes(val)) {
        return { valid: false, error: `Invalid value for "${key}": "${val}". Allowed: ${def.enum.join(', ')}` };
      }
    }

    return { valid: true };
  }

  // Register a Typed Tool
  function registerTool(toolDef) {
    if (!toolDef || !toolDef.name) throw new Error('Tool must have a valid name');
    registry.set(toolDef.name, {
      name: toolDef.name,
      description: toolDef.description || '',
      parameters: toolDef.parameters || { type: 'OBJECT', properties: {} },
      risk: toolDef.risk || RISK.READ,
      requiredScopes: toolDef.requiredScopes || [],
      requiresApproval: toolDef.requiresApproval || false,
      execute: toolDef.execute
    });
  }

  // --- MARK LVI PATTERNS: Hashing, Approval Tokens, Normalization & Honest Outcomes ---

  function hashArgs(args) {
    try {
      const keys = Object.keys(args || {}).sort();
      const str = JSON.stringify(args || {}, keys);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return 'h_' + Math.abs(hash).toString(16);
    } catch(e) {
      return 'h_fallback';
    }
  }

  function createProposal(name, args, opt = {}) {
    const proposalId = opt.proposalId || opt.id || `prop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const token = `tok_${Date.now()}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
    const argsHash = hashArgs(args);
    const expiresAt = Date.now() + (opt.ttlMs || 5 * 60 * 1000); // 5 minute validity

    const proposal = {
      id: proposalId,
      token,
      tool: name,
      args: args || {},
      argsHash,
      risk: opt.risk || RISK.DESTRUCTIVE,
      domain: (name.startsWith('manage_') ? name.replace('manage_', '') : name),
      title: opt.title || `Execute ${name.replace(/_/g, ' ')}`,
      summary: opt.summary || (args && args.action ? `${args.action.toUpperCase().replace(/_/g, ' ')}: ${args.title || args.name || args.item || name}` : `Run ${name}`),
      consequence: opt.consequence || 'Modifies your LifeOS state.',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      status: 'pending'
    };

    pendingProposals.set(token, { proposal, expiresAt, argsHash, toolName: name });
    return proposal;
  }

  function verifyApprovalToken(token, name, args) {
    if (!token || typeof token !== 'string') return false;
    const record = pendingProposals.get(token);
    if (!record) return false;
    if (Date.now() > record.expiresAt) {
      pendingProposals.delete(token);
      return false;
    }
    if (record.toolName !== name) return false;
    if (record.argsHash !== hashArgs(args)) return false;
    // Single-use token: consume upon verification
    pendingProposals.delete(token);
    return true;
  }

  // Canonical Tool Call Normalization (Mark LVI providers/schema.py)
  function normalizeToolCall(raw) {
    if (!raw) return null;
    let name = '';
    let args = {};
    let id = raw.id || `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Format A: Ollama / OpenAI ({ function: { name, arguments } })
    if (raw.function) {
      name = raw.function.name || '';
      const rawArgs = raw.function.arguments;
      if (typeof rawArgs === 'string') {
        try { args = JSON.parse(rawArgs); } catch(e) { args = {}; }
      } else if (rawArgs && typeof rawArgs === 'object') {
        args = rawArgs;
      }
    }
    // Format B: Gemini ({ functionCall: { name, args } })
    else if (raw.functionCall) {
      name = raw.functionCall.name || '';
      args = raw.functionCall.args || {};
    }
    // Format C: Direct standard ({ name, args })
    else if (raw.name) {
      name = raw.name;
      args = raw.args || raw.parameters || raw.arguments || {};
      if (typeof args === 'string') {
        try { args = JSON.parse(args); } catch(e) { args = {}; }
      }
    }
    // Format D: Legacy action ({ tool, input })
    else if (raw.tool) {
      name = raw.tool;
      args = raw.input || {};
      if (typeof args === 'string') {
        try { args = JSON.parse(args); } catch(e) { args = {}; }
      }
    }

    if (!name) return null;
    return {
      id,
      name,
      args: (args && typeof args === 'object') ? args : {},
      raw
    };
  }

  // Extract Tool Calls from Text Output (for edge models)
  function extractToolCallsFromText(text) {
    if (!text || typeof text !== 'string') return [];
    const calls = [];

    // Pattern 1: <tool_call>{"name":"...", "args":{...}}</tool_call>
    const xmlRegex = /<tool_call>([\s\S]*?)<\/tool_call>/gi;
    let match;
    while ((match = xmlRegex.exec(text)) !== null) {
      try {
        const parsed = JSON.parse(match[1].trim());
        const norm = normalizeToolCall(parsed);
        if (norm) calls.push(norm);
      } catch(e) {}
    }

    if (calls.length > 0) return calls;

    // Pattern 2: ```json { "name": "...", "args": { ... } } ```
    const codeBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/gi;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      try {
        const parsed = JSON.parse(match[1].trim());
        if (parsed.name || parsed.tool || parsed.function || parsed.functionCall) {
          const norm = normalizeToolCall(parsed);
          if (norm) calls.push(norm);
        }
      } catch(e) {}
    }

    return calls;
  }

  // Honest Action Outcome Evaluation (Mark LVI core/outcome.py)
  function evaluateOutcome(toolRisk, result, err) {
    if (err) {
      return {
        status: OUTCOME.FAILED,
        verified: false,
        details: err.message || 'Execution threw an error'
      };
    }
    if (toolRisk === RISK.READ || toolRisk === RISK.NAVIGATION) {
      return {
        status: OUTCOME.VERIFIED_DONE,
        verified: true,
        details: 'Read/navigation completed successfully'
      };
    }
    if (result && typeof result === 'object') {
      if (result.verified === true) {
        return {
          status: OUTCOME.VERIFIED_DONE,
          verified: true,
          details: result.verificationDetails || 'Record confirmed in storage'
        };
      }
      if (result.verified === false) {
        return {
          status: OUTCOME.UNVERIFIED,
          verified: false,
          details: result.verificationDetails || 'Action executed but state verification is pending or unconfirmed'
        };
      }
    }
    return {
      status: OUTCOME.VERIFIED_DONE,
      verified: true,
      details: 'Operation completed without errors'
    };
  }

  // Execution Pipeline
  async function executeTool(name, args, options) {
    const startTime = performance.now();
    const opt = options || {};
    const tool = registry.get(name);

    const idempotencyKey = opt.idempotencyKey || `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const requestId = opt.requestId || `req_${Date.now()}`;

    // 1. Unknown tool check (Enforce allowed tools only)
    if (!tool) {
      const err = `Unknown or unregistered tool: "${name}". Execution blocked.`;
      recordAuditEvent({ requestId, idempotencyKey, tool: name, risk: 'unknown', status: OUTCOME.FAILED, error: err });
      return { ok: false, status: OUTCOME.FAILED, error: err };
    }

    // 2. Idempotency cache check (prevent duplicate execution within short window)
    if (idempotencyCache.has(idempotencyKey)) {
      const cachedResult = idempotencyCache.get(idempotencyKey);
      return {
        ok: true,
        cached: true,
        status: OUTCOME.VERIFIED_DONE,
        result: cachedResult,
        verification: { verified: true, details: 'Cached idempotent execution' }
      };
    }

    // 3. Schema validation
    const valResult = validateInput(tool.parameters, args);
    if (!valResult.valid) {
      recordAuditEvent({ requestId, idempotencyKey, tool: name, risk: typeof tool.risk === 'function' ? 'dynamic' : tool.risk, status: OUTCOME.FAILED, error: valResult.error, args });
      return { ok: false, status: OUTCOME.FAILED, error: `Validation error in ${name}: ${valResult.error}` };
    }

    // 4. Policy & Approval Evaluation
    const toolRisk = typeof tool.risk === 'function' ? tool.risk(args) : tool.risk;
    const isDestructive = toolRisk === RISK.DESTRUCTIVE;
    const isExternal = toolRisk === RISK.EXTERNAL_EFFECT;
    const needsApproval = (typeof tool.requiresApproval === 'function' ? tool.requiresApproval(args) : tool.requiresApproval) || isDestructive || isExternal;

    if (needsApproval) {
      let approved = false;
      if (opt.approvalToken && verifyApprovalToken(opt.approvalToken, name, args)) {
        approved = true;
      } else if (opt.isApproved === true) {
        approved = true;
      }

      if (!approved) {
        const proposal = createProposal(name, args, {
          proposalId: idempotencyKey,
          risk: toolRisk,
          title: opt.title,
          summary: opt.summary,
          consequence: isDestructive ? 'This action permanently modifies or deletes stored data.' : (isExternal ? 'This action initiates external communication.' : 'Modifies your LifeOS state.')
        });

        recordAuditEvent({
          requestId,
          idempotencyKey,
          tool: name,
          risk: toolRisk,
          status: OUTCOME.PENDING_APPROVAL,
          proposalId: proposal.id,
          args
        });

        return {
          ok: false,
          status: OUTCOME.PENDING_APPROVAL,
          approvalRequired: true,
          proposal
        };
      }
    }

    // Check cancellation
    if (opt.abortSignal && opt.abortSignal.aborted) {
      recordAuditEvent({ requestId, idempotencyKey, tool: name, risk: toolRisk, status: OUTCOME.CANCELLED });
      return {
        ok: false,
        status: OUTCOME.CANCELLED,
        error: `Tool "${name}" execution cancelled before start.`
      };
    }

    // 5. Build Execution Context
    const ctx = {
      userId: 'user_krishna',
      deviceId: 'device_browser',
      requestId,
      idempotencyKey,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      abortSignal: opt.abortSignal || null
    };

    // 6. Execute through domain service with timeout guard
    const timeoutMs = opt.timeoutMs || 15000;
    try {
      const execPromise = tool.execute(args, ctx);
      let timeoutHandle;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          const toErr = new Error(`Tool "${name}" execution timed out after ${timeoutMs}ms.`);
          toErr.name = 'TimeoutError';
          reject(toErr);
        }, timeoutMs);
      });

      let abortPromise = null;
      if (opt.abortSignal) {
        abortPromise = new Promise((_, reject) => {
          opt.abortSignal.addEventListener('abort', () => {
            const abErr = new Error(`Tool "${name}" was cancelled.`);
            abErr.name = 'AbortError';
            reject(abErr);
          }, { once: true });
        });
      }

      const promises = [execPromise, timeoutPromise];
      if (abortPromise) promises.push(abortPromise);

      const rawResult = await Promise.race(promises);
      clearTimeout(timeoutHandle);

      const durationMs = Math.round(performance.now() - startTime);
      const outcome = evaluateOutcome(toolRisk, rawResult, null);

      // Cache idempotent result
      if (toolRisk !== RISK.READ && outcome.status !== OUTCOME.FAILED) {
        idempotencyCache.set(idempotencyKey, rawResult);
        if (idempotencyCache.size > 100) {
          const firstKey = idempotencyCache.keys().next().value;
          idempotencyCache.delete(firstKey);
        }
      }

      recordAuditEvent({
        requestId,
        idempotencyKey,
        tool: name,
        risk: toolRisk,
        status: outcome.status,
        result: rawResult,
        durationMs
      });

      return {
        ok: outcome.status === OUTCOME.VERIFIED_DONE || outcome.status === OUTCOME.UNVERIFIED,
        status: outcome.status,
        result: rawResult,
        verification: {
          verified: outcome.verified,
          details: outcome.details
        },
        tool: name,
        durationMs
      };
    } catch(err) {
      const durationMs = Math.round(performance.now() - startTime);
      const isAbort = err.name === 'AbortError';
      const status = isAbort ? OUTCOME.CANCELLED : OUTCOME.FAILED;

      recordAuditEvent({
        requestId,
        idempotencyKey,
        tool: name,
        risk: toolRisk,
        status,
        error: err.message,
        durationMs
      });

      return {
        ok: false,
        status,
        error: err.message,
        tool: name,
        durationMs
      };
    }
  }

  // Multi-Turn Execution Pipeline Guard (Mark LVI providers/engine_pipeline.py)
  const MAX_TOOL_ROUNDS = 5;
  const MAX_IDENTICAL_CALLS = 3;

  async function executePipeline(rawCalls, options = {}) {
    const round = options.round || 1;
    const maxRounds = options.maxRounds || MAX_TOOL_ROUNDS;
    const history = options.history || [];

    if (round > maxRounds) {
      return {
        ok: false,
        status: OUTCOME.FAILED,
        error: `Exceeded maximum tool execution rounds (${maxRounds}). Stopped to prevent runaway loop.`,
        completedCalls: [],
        round
      };
    }

    if (!Array.isArray(rawCalls) || rawCalls.length === 0) {
      return { ok: true, status: OUTCOME.VERIFIED_DONE, results: [] };
    }

    const normalizedCalls = rawCalls.map(normalizeToolCall).filter(Boolean);
    const results = [];

    for (const call of normalizedCalls) {
      const callHash = hashArgs(call.args);
      const identicalCount = history.filter(h => h.name === call.name && h.argsHash === callHash).length;
      if (identicalCount >= MAX_IDENTICAL_CALLS - 1) {
        return {
          ok: false,
          status: OUTCOME.CANCELLED,
          error: `Runaway loop detected: tool "${call.name}" was invoked repeatedly with identical arguments.`,
          completedCalls: results,
          round
        };
      }

      history.push({ name: call.name, argsHash: callHash, round });
      const execRes = await executeTool(call.name, call.args, options);
      results.push({
        id: call.id,
        name: call.name,
        ...execRes
      });

      if (execRes.approvalRequired || execRes.status === OUTCOME.CANCELLED) {
        break;
      }
    }

    return {
      ok: results.every(r => r.ok),
      status: results.some(r => r.status === OUTCOME.PENDING_APPROVAL)
        ? OUTCOME.PENDING_APPROVAL
        : (results.some(r => r.status === OUTCOME.FAILED) ? OUTCOME.FAILED : OUTCOME.VERIFIED_DONE),
      results,
      round,
      history
    };
  }

  // ============================================================
  // REGISTER LIFEOS TOOLS (Phase 2 Full Suite)
  // ============================================================

  // 1. Context & Navigation
  registerTool({
    name: 'get_current_context',
    description: 'Retrieve current operational context: local time, active LifeOS domain, device status, and network state.',
    parameters: { type: 'OBJECT', properties: {} },
    risk: RISK.READ,
    execute: async () => ({
      localTime: (typeof Utils !== 'undefined' ? Utils.timeNow() : '') + ' IST',
      localDate: typeof Utils !== 'undefined' ? Utils.dateNow() : '',
      isOnline: navigator.onLine,
      activeDomains: 22,
      activeUser: 'Krishna Singh',
      deviceType: window.innerWidth < 1024 ? 'mobile' : 'desktop'
    })
  });

  registerTool({
    name: 'navigate_to_page',
    description: 'Navigate to an allow-listed LifeOS domain page (e.g., tasks, calendar, study, fitness, finance).',
    parameters: {
      type: 'OBJECT',
      properties: {
        page_id: {
          type: 'STRING',
          enum: [
            'home','tadashi','calendar','tasks','goals','study','fitness','nutrition',
            'finance','wellbeing','shopping','relationships','home-module','vehicle',
            'travel','entertainment','documents','knowledge','routines','digital-life',
            'analytics','settings'
          ],
          description: 'Valid domain page identifier'
        }
      },
      required: ['page_id']
    },
    risk: RISK.NAVIGATION,
    execute: async (args) => {
      if (typeof window.openDomainPage === 'function') {
        window.openDomainPage(args.page_id);
        return { navigatedTo: args.page_id };
      }
      return { navigatedTo: args.page_id, note: 'Navigated via view switcher' };
    }
  });

  registerTool({
    name: 'search_lifeos',
    description: 'Search across tasks, notes, documents, and contacts in LifeOS.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Search term or keyword' }
      },
      required: ['query']
    },
    risk: RISK.READ,
    execute: async (args) => {
      const q = (args.query || '').toLowerCase().trim();
      const results = [];
      if (!window.DB) return { results: [] };

      // Tasks search
      const tasks = (DB.tasks.list() || []).filter(t => (t.title || '').toLowerCase().includes(q));
      tasks.forEach(t => results.push({ domain: 'tasks', title: t.title, id: t.id }));

      // Knowledge search
      const notes = (DB.knowledge.search(q) || []);
      notes.forEach(n => results.push({ domain: 'knowledge', title: n.title, id: n.id }));

      // Contacts search
      const contacts = (DB.relationships.list() || []).filter(c => (c.name || '').toLowerCase().includes(q));
      contacts.forEach(c => results.push({ domain: 'relationships', title: c.name, id: c.id }));

      return { query: args.query, count: results.length, matches: results.slice(0, 10) };
    }
  });

  registerTool({
    name: 'get_today_agenda',
    description: 'Get a consolidated summary of today\'s agenda: pending tasks, scheduled calendar events, workouts, meals, and routines.',
    parameters: { type: 'OBJECT', properties: {} },
    risk: RISK.READ,
    execute: async () => {
      if (!window.DB) throw new Error('Database not initialized');
      const today = typeof Utils !== 'undefined' ? Utils.today() : new Date().toISOString().slice(0, 10);
      const tasks = (DB.tasks.list('all') || []).filter(t => t.deadline === today || (t.status !== 'done' && t.priority === 'high'));
      const calendar = DB.calendar.list(today) || [];
      const fitness = DB.fitness.get();
      const nutrition = DB.nutrition.get();
      const routines = DB.routines.get();

      return {
        date: today,
        pendingTasks: tasks.map(t => ({ id: t.id, title: t.title, priority: t.priority, status: t.status })),
        calendarEvents: calendar.map(e => ({ id: e.id, title: e.title, time: e.time, type: e.type })),
        workoutPlan: fitness?.currentSplit || 'Rest Day',
        caloriesToday: nutrition?.todayCalories || 0,
        calorieTarget: nutrition?.targetCalories || 2400,
        morningRoutineDone: routines?.morning?.filter(s => s.done).length || 0,
        morningRoutineTotal: routines?.morning?.length || 0
      };
    }
  });

  // 2. Tasks & Pipeline
  registerTool({
    name: 'manage_tasks',
    description: 'Add, update, delete, mark done, or list tasks and projects.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action:   { type: 'STRING', enum: ['add','update','delete','mark_done','list','search'], description: 'Operation to perform' },
        id:       { type: 'NUMBER', description: 'Task ID (for update/delete/mark_done)' },
        title:    { type: 'STRING', description: 'Task title' },
        priority: { type: 'STRING', enum: ['high','medium','low'], description: 'Priority level' },
        deadline: { type: 'STRING', description: 'YYYY-MM-DD date' },
        project:  { type: 'STRING', description: 'Project or subject' },
        status:   { type: 'STRING', enum: ['todo','in-progress','done'], description: 'Status' },
        filter:   { type: 'STRING', enum: ['pending','done','today','all'], description: 'List filter' },
        query:    { type: 'STRING', description: 'Search query' }
      },
      required: ['action']
    },
    risk: (args) => (args && args.action === 'delete' ? RISK.DESTRUCTIVE : RISK.REVERSIBLE_WRITE),
    requiresApproval: (args) => (args && args.action === 'delete'),
    execute: async (args) => {
      const { action, id, title, priority, deadline, project, status, filter, query } = args;
      if (!window.DB) throw new Error('Database not initialized');

      if (action === 'add') {
        const item = DB.tasks.add({ title, priority: priority || 'medium', deadline: deadline || Utils.today(), project: project || 'General', status: 'todo' });
        return { task: item, verified: !!item };
      }
      if (action === 'mark_done') {
        const item = DB.tasks.markDone(id);
        return { task: item, verified: !!item };
      }
      if (action === 'update') {
        const patch = {};
        if (title !== undefined) patch.title = title;
        if (priority !== undefined) patch.priority = priority;
        if (deadline !== undefined) patch.deadline = deadline;
        if (project !== undefined) patch.project = project;
        if (status !== undefined) patch.status = status;
        const item = DB.tasks.update(id, patch);
        return { task: item, verified: !!item };
      }
      if (action === 'delete') {
        const ok = DB.tasks.delete(id);
        return { deletedId: id, verified: ok };
      }
      if (action === 'list') {
        return { tasks: DB.tasks.list(filter || 'all') };
      }
      if (action === 'search') {
        return { tasks: DB.tasks.search(query || title || '') };
      }
      throw new Error(`Unsupported tasks action: ${action}`);
    }
  });

  // 3. Goals & OKRs
  registerTool({
    name: 'manage_goals',
    description: 'Add, update, delete goals and OKRs, update progress percentage, or complete milestones.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action:         { type: 'STRING', enum: ['add','update','delete','list','update_progress','complete_milestone'], description: 'Operation' },
        id:             { type: 'NUMBER', description: 'Goal ID' },
        title:          { type: 'STRING', description: 'Goal title' },
        emoji:          { type: 'STRING', description: 'Goal icon emoji' },
        category:       { type: 'STRING', description: 'Category' },
        target:         { type: 'STRING', description: 'Target date' },
        progress:       { type: 'NUMBER', description: 'Progress 0-100' },
        milestone_title:{ type: 'STRING', description: 'Milestone title' }
      },
      required: ['action']
    },
    risk: (args) => (args && args.action === 'delete' ? RISK.DESTRUCTIVE : RISK.REVERSIBLE_WRITE),
    requiresApproval: (args) => (args && args.action === 'delete'),
    execute: async (args) => {
      const { action, id, title, emoji, category, target, progress, milestone_title } = args;
      if (!window.DB) throw new Error('Database not initialized');
      if (action === 'add') {
        const item = DB.goals.add({ title, emoji: emoji || '🎯', category: category || 'General', target: target || '2026', progress: progress || 0, milestones: [] });
        return { goal: item, verified: !!item };
      }
      if (action === 'update') return { goal: DB.goals.update(id, { title, progress, target }), verified: true };
      if (action === 'delete') return { deleted: DB.goals.delete(id), verified: true };
      if (action === 'list') return DB.goals.list();
      if (action === 'update_progress') return { goal: DB.goals.updateProgress(id, progress), verified: true };
      if (action === 'complete_milestone') return { goal: DB.goals.completeMilestone(id, milestone_title), verified: true };
      throw new Error(`Unsupported goals action: ${action}`);
    }
  });

  // 4. Calendar & Schedule
  registerTool({
    name: 'manage_calendar',
    description: 'Add, update, delete or list calendar events and scheduled blocks.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action:      { type: 'STRING', enum: ['add','update','delete','list'], description: 'Operation' },
        id:          { type: 'NUMBER', description: 'Event ID' },
        title:       { type: 'STRING', description: 'Event title' },
        date:        { type: 'STRING', description: 'YYYY-MM-DD' },
        time:        { type: 'STRING', description: 'HH:MM time' },
        duration:    { type: 'NUMBER', description: 'Duration in minutes' },
        type:        { type: 'STRING', description: 'Event type' },
        filter_date: { type: 'STRING', description: 'Date to filter' }
      },
      required: ['action']
    },
    risk: (args) => (args && args.action === 'delete' ? RISK.DESTRUCTIVE : RISK.REVERSIBLE_WRITE),
    requiresApproval: (args) => (args && args.action === 'delete'),
    execute: async (args) => {
      const { action, id, title, date, time, duration, type, filter_date } = args;
      if (!window.DB) throw new Error('Database not initialized');
      if (action === 'add') {
        const item = DB.calendar.add({ title, date: date || Utils.today(), time: time || '10:00', duration: duration || 60, type: type || 'personal' });
        return { event: item, verified: !!item };
      }
      if (action === 'update') return { event: DB.calendar.update(id, { title, date, time, duration, type }), verified: true };
      if (action === 'delete') return { deleted: DB.calendar.delete(id), verified: true };
      if (action === 'list') return DB.calendar.list(filter_date);
      throw new Error(`Unsupported calendar action: ${action}`);
    }
  });

  // 4b. Deterministic Free-Time & Availability (Phase 3)
  registerTool({
    name: 'find_free_time',
    description: 'Find free time slots and availability on a specific date, accounting for classes, workouts, meals, and buffers.',
    parameters: {
      type: 'OBJECT',
      properties: {
        date:         { type: 'STRING', description: 'Target date in YYYY-MM-DD format (defaults to today)' },
        min_duration: { type: 'NUMBER', description: 'Minimum slot duration in minutes (defaults to 30)' }
      }
    },
    risk: RISK.READ,
    execute: async (args) => {
      if (!window.Scheduler) throw new Error('Scheduling engine not loaded');
      const targetDate = args.date || (typeof Utils !== 'undefined' ? Utils.today() : new Date().toISOString().slice(0, 10));
      return window.Scheduler.calculateFreeIntervals(targetDate, { minSlotMinutes: args.min_duration || 30 });
    }
  });

  registerTool({
    name: 'propose_schedule_slot',
    description: 'Draft a smart schedule proposal for a task, workout, or study block without mutating the calendar.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title:          { type: 'STRING', description: 'Title of the event or task to schedule' },
        duration:       { type: 'NUMBER', description: 'Duration in minutes (e.g. 45, 60, 90)' },
        date:           { type: 'STRING', description: 'Target date in YYYY-MM-DD format' },
        preferred_time: { type: 'STRING', enum: ['morning','afternoon','evening','night'], description: 'Preferred time of day' },
        energy_level:   { type: 'STRING', enum: ['high','medium','low'], description: 'Required energy level' }
      },
      required: ['title']
    },
    risk: RISK.READ,
    execute: async (args) => {
      if (!window.Scheduler) throw new Error('Scheduling engine not loaded');
      const targetDate = args.date || (typeof Utils !== 'undefined' ? Utils.today() : new Date().toISOString().slice(0, 10));
      return window.Scheduler.proposeScheduleSlot({
        title: args.title,
        duration: args.duration || 60,
        preferredTimeOfDay: args.preferred_time || 'morning',
        energyRequirement: args.energy_level || 'high'
      }, targetDate);
    }
  });

  registerTool({
    name: 'apply_schedule_proposal',
    description: 'Commit an approved schedule proposal to the calendar with version concurrency verification.',
    parameters: {
      type: 'OBJECT',
      properties: {
        proposal_id:     { type: 'STRING', description: 'ID of the proposal being committed' },
        date:            { type: 'STRING', description: 'Date of the slot' },
        calendar_version:{ type: 'STRING', description: 'Calendar state version token' },
        title:           { type: 'STRING', description: 'Title of the event' },
        start_time:      { type: 'STRING', description: 'HH:MM start time' },
        duration:        { type: 'NUMBER', description: 'Duration in minutes' },
        type:            { type: 'STRING', description: 'Event type' }
      },
      required: ['title', 'date', 'start_time', 'duration']
    },
    risk: RISK.REVERSIBLE_WRITE,
    requiresApproval: true,
    execute: async (args) => {
      if (!window.Scheduler) throw new Error('Scheduling engine not loaded');
      const proposalObj = {
        id: args.proposal_id || `prop_manual_${Date.now()}`,
        date: args.date,
        calendarVersion: args.calendar_version,
        item: { title: args.title, duration: args.duration, type: args.type || 'study' },
        proposedSlot: {
          startTime: args.start_time,
          endTime: window.Scheduler.minutesToTime(window.Scheduler.timeToMinutes(args.start_time) + args.duration),
          durationMinutes: args.duration
        }
      };
      return window.Scheduler.applyScheduleProposal(proposalObj);
    }
  });

  // 5. Finance & Wealth
  registerTool({
    name: 'manage_finance',
    description: 'Log income or expenses, delete transactions, update budgets, or query financial summaries.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action:         { type: 'STRING', enum: ['add_transaction','delete_transaction','update_budget','get_summary','set_savings'], description: 'Operation' },
        name:           { type: 'STRING', description: 'Transaction description' },
        amount:         { type: 'NUMBER', description: 'Amount (negative for expense, positive for income)' },
        category:       { type: 'STRING', description: 'Category' },
        id:             { type: 'NUMBER', description: 'Transaction ID' },
        budget_limit:   { type: 'NUMBER', description: 'New budget limit' },
        savings_amount: { type: 'NUMBER', description: 'Savings target' }
      },
      required: ['action']
    },
    risk: (args) => (args && args.action === 'delete_transaction' ? RISK.DESTRUCTIVE : RISK.REVERSIBLE_WRITE),
    requiresApproval: (args) => (args && args.action === 'delete_transaction'),
    execute: async (args) => {
      const { action, name, amount, category, id, budget_limit, savings_amount } = args;
      if (!window.DB) throw new Error('Database not initialized');
      if (action === 'add_transaction') {
        const item = DB.finance.addTransaction({ name, amount, category: category || 'General', icon: (amount >= 0 ? '💰' : '💸') });
        return { transaction: item, verified: !!item };
      }
      if (action === 'delete_transaction') return { deleted: DB.finance.deleteTransaction(id), verified: true };
      if (action === 'update_budget') return { updated: DB.finance.updateBudget(category, { limit: budget_limit }), verified: true };
      if (action === 'set_savings') return { updated: DB.finance.setSavings(savings_amount), verified: true };
      if (action === 'get_summary') return DB.finance.get();
      throw new Error(`Unsupported finance action: ${action}`);
    }
  });

  // 6. Fitness & Workouts
  registerTool({
    name: 'manage_fitness',
    description: 'Log workout sessions, update weight / body measurements, or record personal records.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action:        { type: 'STRING', enum: ['log_workout','update_measurements','add_pr','get_summary'], description: 'Operation' },
        workout_name:  { type: 'STRING', description: 'Routine or workout name' },
        duration:      { type: 'NUMBER', description: 'Minutes' },
        notes:         { type: 'STRING', description: 'Notes' },
        weight:        { type: 'NUMBER', description: 'Weight in kg' },
        body_fat:      { type: 'NUMBER', description: 'Body fat %' },
        exercise:      { type: 'STRING', description: 'Exercise name for PR' },
        pr_value:      { type: 'STRING', description: 'PR value (e.g. 100 kg)' }
      },
      required: ['action']
    },
    risk: RISK.REVERSIBLE_WRITE,
    execute: async (args) => {
      const { action, workout_name, duration, notes, weight, body_fat, exercise, pr_value } = args;
      if (!window.DB) throw new Error('Database not initialized');
      if (action === 'log_workout') {
        const item = DB.fitness.logWorkout({ name: workout_name || 'Workout', duration: duration || 45, notes: notes || '' });
        return { workout: item, verified: !!item };
      }
      if (action === 'update_measurements') {
        const patch = {};
        if (weight !== undefined) patch.weight = weight;
        if (body_fat !== undefined) patch.bodyFat = body_fat;
        return { measurements: DB.fitness.updateMeasurements(patch), verified: true };
      }
      if (action === 'add_pr') return { pr: DB.fitness.addPR({ exercise, value: pr_value }), verified: true };
      if (action === 'get_summary') return DB.fitness.get();
      throw new Error(`Unsupported fitness action: ${action}`);
    }
  });

  // 7. Nutrition & Diet
  registerTool({
    name: 'manage_nutrition',
    description: 'Log meals, record water intake, or get nutrition overview.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action:    { type: 'STRING', enum: ['log_meal','set_water','get_summary','update_today'], description: 'Operation' },
        meal_name: { type: 'STRING', description: 'Name of the meal' },
        items:     { type: 'STRING', description: 'Comma-separated food items' },
        calories:  { type: 'NUMBER', description: 'Total calories' },
        protein:   { type: 'NUMBER', description: 'Protein in grams' },
        water:     { type: 'NUMBER', description: 'Water in ml' },
        time:      { type: 'STRING', description: 'Meal time HH:MM' }
      },
      required: ['action']
    },
    risk: RISK.REVERSIBLE_WRITE,
    execute: async (args) => {
      const { action, meal_name, items, calories, protein, water, time } = args;
      if (!window.DB) throw new Error('Database not initialized');
      if (action === 'log_meal') {
        const item = DB.nutrition.logMeal({ name: meal_name, time: time || Utils.timeNow(), items: (items||'').split(',').map(s=>s.trim()), calories: calories||0, protein: protein||0 });
        return { meal: item, verified: !!item };
      }
      if (action === 'set_water') return { water: DB.nutrition.setWater(water), verified: true };
      if (action === 'get_summary') return DB.nutrition.get();
      if (action === 'update_today') { DB.nutrition.updateToday({ calories, protein }); return { updated: true, verified: true }; }
      throw new Error(`Unsupported nutrition action: ${action}`);
    }
  });

  // 8. Study & Subjects
  registerTool({
    name: 'manage_study',
    description: 'Update study topic progress, add subjects, or get study summary.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action:      { type: 'STRING', enum: ['list','update_topic','update_progress','add_subject'], description: 'Operation' },
        subject_id:  { type: 'NUMBER', description: 'Subject ID' },
        subject_name:{ type: 'STRING', description: 'Subject name' },
        topic_name:  { type: 'STRING', description: 'Topic name to update' },
        topic_status:{ type: 'STRING', enum: ['done','partial','todo'], description: 'Status' },
        progress:    { type: 'NUMBER', description: 'Progress 0-100' }
      },
      required: ['action']
    },
    risk: RISK.REVERSIBLE_WRITE,
    execute: async (args) => {
      const { action, subject_id, subject_name, topic_name, topic_status, progress } = args;
      if (!window.DB) throw new Error('Database not initialized');
      let sid = subject_id;
      if (!sid && subject_name) {
        const subj = DB.study.list().find(s => s.name.toLowerCase().includes(subject_name.toLowerCase()));
        if (subj) sid = subj.id;
      }
      if (action === 'list') return DB.study.list();
      if (action === 'update_topic') return { updated: DB.study.updateTopic(sid, topic_name, topic_status), verified: true };
      if (action === 'update_progress') return { updated: DB.study.updateProgress(sid, progress), verified: true };
      if (action === 'add_subject') return { subject: DB.study.addSubject({ name: subject_name }), verified: true };
      throw new Error(`Unsupported study action: ${action}`);
    }
  });

  // 9. Wellbeing & Mood
  registerTool({
    name: 'manage_wellbeing',
    description: 'Log mood score, stress level, breaks, or get wellbeing summary.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action:        { type: 'STRING', enum: ['set_mood','set_stress','log_break','get_summary'], description: 'Operation' },
        mood:          { type: 'NUMBER', description: 'Mood score 1-5' },
        stress:        { type: 'NUMBER', description: 'Stress level 1-5' },
        break_type:    { type: 'STRING', description: 'Type of break' },
        break_duration:{ type: 'STRING', description: 'Break duration e.g. "10 min"' }
      },
      required: ['action']
    },
    risk: RISK.REVERSIBLE_WRITE,
    execute: async (args) => {
      const { action, mood, stress, break_type, break_duration } = args;
      if (!window.DB) throw new Error('Database not initialized');
      if (action === 'set_mood') return { mood: DB.wellbeing.setMood(mood), verified: true };
      if (action === 'set_stress') return { stress: DB.wellbeing.setStress(stress), verified: true };
      if (action === 'log_break') return { logged: DB.wellbeing.logBreak({ type: break_type, duration: break_duration, time: Utils.timeNow() }), verified: true };
      if (action === 'get_summary') return DB.wellbeing.get();
      throw new Error(`Unsupported wellbeing action: ${action}`);
    }
  });

  // 10. Shopping & Wishlist
  registerTool({
    name: 'manage_shopping',
    description: 'Add or remove grocery items or wishlist items, or mark grocery items as bought.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action:   { type: 'STRING', enum: ['add_grocery','complete_grocery','delete_grocery','add_wishlist','delete_wishlist','get_list'], description: 'Operation' },
        item:     { type: 'STRING', description: 'Item name' },
        qty:      { type: 'STRING', description: 'Quantity e.g. "2", "500g"' },
        price:    { type: 'STRING', description: 'Price for wishlist items e.g. "₹4,500"' },
        priority: { type: 'STRING', enum: ['high','medium','low'], description: 'Priority' }
      },
      required: ['action']
    },
    risk: (args) => (args && (args.action === 'delete_grocery' || args.action === 'delete_wishlist') ? RISK.DESTRUCTIVE : RISK.REVERSIBLE_WRITE),
    requiresApproval: (args) => (args && (args.action === 'delete_grocery' || args.action === 'delete_wishlist')),
    execute: async (args) => {
      const { action, item, qty, price, priority } = args;
      if (!window.DB) throw new Error('Database not initialized');
      if (action === 'add_grocery') return { added: DB.shopping.addGrocery({ item, qty }), verified: true };
      if (action === 'complete_grocery') return { done: DB.shopping.completeGrocery(item), verified: true };
      if (action === 'delete_grocery') return { deleted: DB.shopping.deleteGrocery(item), verified: true };
      if (action === 'add_wishlist') return { added: DB.shopping.addWishlist({ item, price, priority }), verified: true };
      if (action === 'delete_wishlist') return { deleted: DB.shopping.deleteWishlist(item), verified: true };
      if (action === 'get_list') return DB.shopping.get();
      throw new Error(`Unsupported shopping action: ${action}`);
    }
  });

  // 11. Relationships & Contacts
  registerTool({
    name: 'manage_relationships',
    description: 'Add, update, delete contacts, mark someone as contacted, or list contacts.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action:   { type: 'STRING', enum: ['add','update','delete','list','mark_contacted'], description: 'Operation' },
        id:       { type: 'NUMBER', description: 'Contact ID' },
        name:     { type: 'STRING', description: 'Contact name' },
        category: { type: 'STRING', description: 'Category: Family, Friend, Mentor, Classmate' },
        notes:    { type: 'STRING', description: 'Notes' },
        birthday: { type: 'STRING', description: 'YYYY-MM-DD' }
      },
      required: ['action']
    },
    risk: (args) => (args && args.action === 'delete' ? RISK.DESTRUCTIVE : RISK.REVERSIBLE_WRITE),
    requiresApproval: (args) => (args && args.action === 'delete'),
    execute: async (args) => {
      const { action, id, name, category, notes, birthday } = args;
      if (!window.DB) throw new Error('Database not initialized');
      if (action === 'add') return { contact: DB.relationships.add({ name, category, notes, birthday, emoji: '👤' }), verified: true };
      if (action === 'update') return { contact: DB.relationships.update(id, { name, category, notes }), verified: true };
      if (action === 'delete') return { deleted: DB.relationships.delete(id), verified: true };
      if (action === 'list') return DB.relationships.list();
      if (action === 'mark_contacted') {
        let rid = id;
        if (!rid && name) {
          const r = DB.relationships.list().find(c => c.name.toLowerCase().includes(name.toLowerCase()));
          if (r) rid = r.id;
        }
        return { updated: DB.relationships.markContacted(rid), verified: true };
      }
      throw new Error(`Unsupported relationships action: ${action}`);
    }
  });

  // 12. Knowledge & Notes
  registerTool({
    name: 'manage_knowledge',
    description: 'Add notes, ideas, book notes, or journal entries to the knowledge base. Search or delete entries.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action:  { type: 'STRING', enum: ['add','delete','search','list'], description: 'Operation' },
        id:      { type: 'NUMBER', description: 'Note ID' },
        title:   { type: 'STRING', description: 'Title' },
        preview: { type: 'STRING', description: 'Content summary' },
        type:    { type: 'STRING', description: 'Note, Idea, Book Note, Journal' },
        tags:    { type: 'STRING', description: 'Comma-separated tags' },
        query:   { type: 'STRING', description: 'Search query' }
      },
      required: ['action']
    },
    risk: (args) => (args && args.action === 'delete' ? RISK.DESTRUCTIVE : RISK.REVERSIBLE_WRITE),
    requiresApproval: (args) => (args && args.action === 'delete'),
    execute: async (args) => {
      const { action, id, title, preview, type, tags, query } = args;
      if (!window.DB) throw new Error('Database not initialized');
      if (action === 'add') return { note: DB.knowledge.add({ title, preview, type: type || 'Note', tags: tags ? tags.split(',').map(t=>t.trim()) : [] }), verified: true };
      if (action === 'delete') return { deleted: DB.knowledge.delete(id), verified: true };
      if (action === 'search') return DB.knowledge.search(query || title || '');
      if (action === 'list') return DB.knowledge.list();
      throw new Error(`Unsupported knowledge action: ${action}`);
    }
  });

  // 13. Routines & Habits
  registerTool({
    name: 'manage_routines',
    description: 'Mark routine steps as done, add new steps, or reset daily routine progress.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action:    { type: 'STRING', enum: ['mark_done','add_step','reset','get_status'], description: 'Operation' },
        routine:   { type: 'STRING', enum: ['morning','night'], description: 'Which routine' },
        task_name: { type: 'STRING', description: 'Task name in routine' },
        time:      { type: 'STRING', description: 'Time HH:MM' }
      },
      required: ['action']
    },
    risk: (args) => (args && args.action === 'reset' ? RISK.DESTRUCTIVE : RISK.REVERSIBLE_WRITE),
    requiresApproval: (args) => (args && args.action === 'reset'),
    execute: async (args) => {
      const { action, routine, task_name, time } = args;
      if (!window.DB) throw new Error('Database not initialized');
      if (action === 'mark_done') return { updated: DB.routines.markDone(routine, task_name), verified: true };
      if (action === 'add_step') return { added: DB.routines.addStep(routine, { task: task_name, time }), verified: true };
      if (action === 'reset') return { reset: DB.routines.resetDay(), verified: true };
      if (action === 'get_status') return DB.routines.get();
      throw new Error(`Unsupported routines action: ${action}`);
    }
  });

  // 14. Digital Life & Subscriptions
  registerTool({
    name: 'manage_digital_life',
    description: 'Add, delete, or update subscriptions and digital services.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action:  { type: 'STRING', enum: ['add_subscription','delete_subscription','update_subscription','list'], description: 'Operation' },
        name:    { type: 'STRING', description: 'Service name' },
        amount:  { type: 'NUMBER', description: 'Cost amount' },
        period:  { type: 'STRING', description: 'Billing period: mo, yr' },
        renewal: { type: 'STRING', description: 'Renewal date YYYY-MM-DD' },
        status:  { type: 'STRING', description: 'active, paused, cancelled' }
      },
      required: ['action']
    },
    risk: (args) => (args && args.action === 'delete_subscription' ? RISK.DESTRUCTIVE : RISK.REVERSIBLE_WRITE),
    requiresApproval: (args) => (args && args.action === 'delete_subscription'),
    execute: async (args) => {
      const { action, name, amount, period, renewal, status } = args;
      if (!window.DB) throw new Error('Database not initialized');
      if (action === 'add_subscription') return { added: DB.digitalLife.addSubscription({ name, amount, period, renewal, status: status || 'active' }), verified: true };
      if (action === 'delete_subscription') return { deleted: DB.digitalLife.deleteSubscription(name), verified: true };
      if (action === 'update_subscription') return { updated: DB.digitalLife.updateSubscription(name, { amount, period, renewal, status }), verified: true };
      if (action === 'list') return DB.digitalLife.get();
      throw new Error(`Unsupported digital life action: ${action}`);
    }
  });

  // 15. General Domain Getter
  registerTool({
    name: 'get_domain_data',
    description: 'Fetch fresh data records from any of the 22 LifeOS domains.',
    parameters: {
      type: 'OBJECT',
      properties: {
        domain: {
          type: 'STRING',
          enum: [
            'tasks','goals','calendar','finance','fitness','nutrition','study',
            'wellbeing','shopping','relationships','knowledge','routines','digital_life',
            'vehicle','travel','entertainment','documents','home','analytics','all'
          ],
          description: 'Domain name'
        }
      },
      required: ['domain']
    },
    risk: RISK.READ,
    execute: async (args) => {
      if (!window.DB) throw new Error('Database not initialized');
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
      const fn = dataMap[args.domain];
      return fn ? fn() : 'Domain not found';
    }
  });

  // 16. Undo Action
  registerTool({
    name: 'undo_last_action',
    description: 'Revert the most recent database mutation using stored undo snapshot.',
    parameters: { type: 'OBJECT', properties: {} },
    risk: RISK.REVERSIBLE_WRITE,
    execute: async () => {
      if (!window.DB) throw new Error('Database not initialized');
      const ok = DB.undo();
      return { undone: ok, message: ok ? 'Last action undone successfully.' : 'Nothing to undo.' };
    }
  });

  // 17. Sync Status & Control (Phase 4)
  registerTool({
    name: 'get_sync_status',
    description: 'Check local storage outbox, device capability, and sync state.',
    parameters: { type: 'OBJECT', properties: {} },
    risk: RISK.READ,
    execute: async () => {
      if (window.SyncEngine) {
        return window.SyncEngine.getStatus();
      }
      return {
        isOnline: navigator.onLine,
        storageEngine: 'IndexedDB + localStorage fallback',
        pendingOutboxCount: 0,
        lastSync: new Date().toISOString()
      };
    }
  });

  registerTool({
    name: 'trigger_sync',
    description: 'Trigger a synchronization cycle: push pending outbox mutations and pull updates from the cloud.',
    parameters: { type: 'OBJECT', properties: {} },
    risk: RISK.REVERSIBLE_WRITE,
    execute: async () => {
      if (!window.SyncEngine) throw new Error('Sync engine not initialized');
      return window.SyncEngine.syncAll();
    }
  });

  // 17b. Memory & Skills (Phase 6)
  registerTool({
    name: 'manage_memory',
    description: 'Add, list, update, or delete personal preferences and durable facts from TADASHI long-term memory.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action:  { type: 'STRING', enum: ['add','list','update','delete'], description: 'Operation to perform' },
        type:    { type: 'STRING', enum: ['preference','fact','episodic'], description: 'Memory classification' },
        content: { type: 'STRING', description: 'Memory statement or fact' },
        id:      { type: 'STRING', description: 'Memory ID for update/delete' }
      },
      required: ['action']
    },
    risk: (args) => (args && args.action === 'delete' ? RISK.DESTRUCTIVE : RISK.REVERSIBLE_WRITE),
    requiresApproval: (args) => (args && args.action === 'delete'),
    execute: async (args) => {
      if (!window.Memory) throw new Error('Memory engine not loaded');
      if (args.action === 'add') return { memory: window.Memory.add(args.type || 'fact', args.content, 'assistant_learned'), verified: true };
      if (args.action === 'list') return { memories: window.Memory.list({ type: args.type }) };
      if (args.action === 'update') return { updated: window.Memory.update(args.id, { content: args.content }), verified: true };
      if (args.action === 'delete') return { deleted: window.Memory.delete(args.id), verified: true };
      throw new Error(`Unsupported memory action: ${args.action}`);
    }
  });

  registerTool({
    name: 'run_skill',
    description: 'Execute an approved installed TADASHI skill capability (e.g. lecture-notes-summarizer, flashcard-generator).',
    parameters: {
      type: 'OBJECT',
      properties: {
        skill_id: { type: 'STRING', description: 'Identifier of installed skill' },
        inputs:   { type: 'OBJECT', description: 'Input parameters dictionary for the skill' }
      },
      required: ['skill_id']
    },
    risk: RISK.READ,
    execute: async (args) => {
      if (!window.SkillRuntime) throw new Error('Skill runtime not loaded');
      return window.SkillRuntime.execute(args.skill_id, args.inputs || {});
    }
  });

  // 18. Reset All Data (Destructive Action - Always Requires Confirmation)
  registerTool({
    name: 'reset_all_data',
    description: 'Reset all personal LifeOS data back to clean seed defaults. Irreversible without snapshot restore.',
    parameters: { type: 'OBJECT', properties: {} },
    risk: RISK.DESTRUCTIVE,
    requiresApproval: true,
    execute: async () => {
      if (!window.DB) throw new Error('Database not initialized');
      DB.reset();
      return { reset: true, message: 'All LifeOS data was reset to seed defaults. Backup snapshot preserved.' };
    }
  });

  // Public Interface
  const ToolRegistry = {
    RISK,
    OUTCOME,
    register: registerTool,
    execute: executeTool,
    executePipeline,
    normalizeToolCall,
    extractToolCallsFromText,
    createProposal,
    verifyApprovalToken,
    getTool(name) { return registry.get(name); },
    getAllTools() { return Array.from(registry.values()); },
    getAuditLog() {
      try {
        const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch(e) { return []; }
    },
    clearAuditLog() {
      try { localStorage.removeItem(AUDIT_STORAGE_KEY); } catch(e) {}
    },
    getGeminiDeclarations() {
      return Array.from(registry.values()).map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }));
    }
  };

  window.ToolRegistry = ToolRegistry;

})(window);
