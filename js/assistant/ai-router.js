// ============================================================
// TADASHI LifeOS — Hybrid AI Router (Phase 5 & Mark LVI Milestone 1)
// Routes across local Ollama (127.0.0.1:11434) and hosted cloud models
// enforcing local-only privacy policies, capability budgets, and fallbacks.
// ============================================================

(function(window) {
  'use strict';

  const PRIVACY_STORAGE_KEY = 'tadashi_privacy_mode'; // 'cloud_allowed' | 'local_only'
  const OLLAMA_HOST_KEY = 'tadashi_ollama_host';
  const OLLAMA_MODEL_KEY = 'tadashi_ollama_model';
  const TELEMETRY_STORAGE_KEY = 'tadashi_ai_telemetry';
  const MAX_TELEMETRY_LOGS = 50;

  const DEFAULT_OLLAMA_HOST = 'http://127.0.0.1:11434';
  const DEFAULT_OLLAMA_MODEL = 'llama3.2:latest';

  // Task Classes per docs/05_AI_ROUTING_AND_LOCAL_MODELS.md
  const TASK_CLASS = {
    INTENT: 'intent',
    PLANNING: 'planning',
    SUMMARIZATION: 'summarization',
    TOOL_SELECTION: 'tool_selection',
    SKILL_DRAFT: 'skill_draft'
  };

  // Telemetry Logger (Privacy-Safe: Zero PII, Zero Secret Keys)
  function recordTelemetry(entry) {
    try {
      const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
      const log = raw ? JSON.parse(raw) : [];
      log.unshift({
        provider: entry.provider,
        model: entry.model,
        taskClass: entry.taskClass || 'general',
        latencyMs: Math.round(entry.latencyMs || 0),
        status: entry.status || 'success',
        error: entry.error ? String(entry.error).slice(0, 100) : null,
        timestamp: new Date().toISOString()
      });
      if (log.length > MAX_TELEMETRY_LOGS) log.length = MAX_TELEMETRY_LOGS;
      localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(log));
    } catch(e) {}
  }

  // --- 1. LOCAL OLLAMA PROVIDER (Loopback Hardened & Capability Budgeted) ---
  const OllamaProvider = {
    id: 'ollama_local',
    name: 'Ollama (Local PC)',

    getHost() {
      try { return localStorage.getItem(OLLAMA_HOST_KEY) || DEFAULT_OLLAMA_HOST; } catch(e) { return DEFAULT_OLLAMA_HOST; }
    },

    setHost(host) {
      try { localStorage.setItem(OLLAMA_HOST_KEY, host); } catch(e) {}
    },

    getModel() {
      try { return localStorage.getItem(OLLAMA_MODEL_KEY) || DEFAULT_OLLAMA_MODEL; } catch(e) { return DEFAULT_OLLAMA_MODEL; }
    },

    setModel(model) {
      try { localStorage.setItem(OLLAMA_MODEL_KEY, model); } catch(e) {}
    },

    getTimeout() {
      try { return parseInt(localStorage.getItem('tadashi_ollama_timeout_ms'), 10) || 30000; } catch(e) { return 30000; }
    },

    setTimeout(ms) {
      try { localStorage.setItem('tadashi_ollama_timeout_ms', String(ms)); } catch(e) {}
    },

    // Identify if endpoint is strictly local loopback
    isLoopback(host) {
      const target = (host || this.getHost()).toLowerCase();
      return target.includes('127.0.0.1') || target.includes('localhost') || target.includes('[::1]');
    },

    classifyEndpoint(host) {
      return this.isLoopback(host) ? 'local' : 'remote_online';
    },

    // Check detailed connection health and model availability
    async checkHealth(timeoutMs = 1500) {
      const host = this.getHost();
      const configuredModel = this.getModel();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(`${host}/api/tags`, {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timer);

        if (!res.ok) {
          return {
            ok: false,
            status: 'unsupported',
            host,
            error: `Ollama returned HTTP ${res.status}`,
            models: [],
            version: null
          };
        }

        const data = await res.json();
        const models = Array.isArray(data.models) ? data.models : [];

        // Check version if available
        let version = null;
        try {
          const vRes = await fetch(`${host}/api/version`, { method: 'GET' });
          if (vRes.ok) {
            const vData = await vRes.json();
            version = vData.version || null;
          }
        } catch(ve) {}

        if (models.length === 0) {
          return {
            ok: true,
            status: 'no_models',
            host,
            version,
            models: [],
            warning: 'Ollama is running, but no models are installed. Run "ollama run llama3.2" to install one.'
          };
        }

        const hasModel = models.some(m => {
          const mName = m.name || '';
          return mName === configuredModel || mName.split(':')[0] === configuredModel.split(':')[0];
        });

        if (!hasModel) {
          return {
            ok: true,
            status: 'model_missing',
            host,
            version,
            models,
            configuredModel,
            warning: `Configured model "${configuredModel}" is not installed in local Ollama.`
          };
        }

        return {
          ok: true,
          status: 'ready',
          host,
          version,
          models,
          configuredModel
        };

      } catch(err) {
        clearTimeout(timer);
        const isTimeout = err.name === 'AbortError';
        return {
          ok: false,
          status: isTimeout ? 'timeout' : 'offline',
          host,
          error: isTimeout
            ? `Connection to local Ollama (${host}) timed out after ${timeoutMs}ms.`
            : `Ollama daemon is not running on ${host}. Launch Ollama on your PC.`,
          models: [],
          version: null
        };
      }
    },

    // Check if Ollama is running locally with quick timeout (backward-compatible)
    async isAvailable(timeoutMs = 1500) {
      const health = await this.checkHealth(timeoutMs);
      return health.ok;
    },

    // Enumerate installed models
    async listModels(timeoutMs = 2000) {
      const health = await this.checkHealth(timeoutMs);
      if (!health.ok || !health.models) return [];
      return health.models.map(m => ({
        name: m.name,
        size: m.size,
        modifiedAt: m.modified_at,
        parameterSize: m.details?.parameter_size,
        family: m.details?.family,
        quantization: m.details?.quantization_level
      }));
    },

    // Capability profile based on model family and parameter scale
    getModelProfile(modelName) {
      const name = (modelName || this.getModel()).toLowerCase();
      
      // Parse parameter size if available (e.g. 3b, 8b, 32b, 70b)
      const match = name.match(/(\d+)b/);
      if (match) {
        const paramSize = parseInt(match[1], 10);
        if (paramSize <= 3) {
          return {
            tier: 'compact',
            contextBudget: 4096,
            maxTools: 5,
            supportsTools: true,
            supportsStreaming: true
          };
        }
        if (paramSize <= 9) {
          return {
            tier: 'standard',
            contextBudget: 8192,
            maxTools: 12,
            supportsTools: true,
            supportsStreaming: true
          };
        }
        return {
          tier: 'large',
          contextBudget: 32768,
          maxTools: 30,
          supportsTools: true,
          supportsStreaming: true
        };
      }

      // Fallback heuristics based on name keywords
      if (name.includes('tiny') || name.includes('mini')) {
        return {
          tier: 'compact',
          contextBudget: 4096,
          maxTools: 5,
          supportsTools: true,
          supportsStreaming: true
        };
      }
      if (name.includes('mistral') || name.includes('llama')) {
        return {
          tier: 'standard',
          contextBudget: 8192,
          maxTools: 12,
          supportsTools: true,
          supportsStreaming: true
        };
      }

      // Default fallback profile
      return {
        tier: 'standard',
        contextBudget: 4096,
        maxTools: 8,
        supportsTools: true,
        supportsStreaming: true
      };
    },

    // Prune and budget tools to prevent small local model hallucination/context overflow
    pruneToolsForModel(tools, modelName) {
      if (!Array.isArray(tools) || tools.length === 0) return [];
      const profile = this.getModelProfile(modelName);
      if (!profile.supportsTools) return [];

      if (tools.length <= profile.maxTools) {
        return tools;
      }

      // Prioritize essential frequent tools (tasks, calendar, wellbeing)
      const priorityOrder = ['manage_tasks', 'manage_calendar', 'get_wellbeing', 'search_knowledge'];
      const prioritized = [...tools].sort((a, b) => {
        const aPri = priorityOrder.indexOf(a.name) !== -1 ? priorityOrder.indexOf(a.name) : 99;
        const bPri = priorityOrder.indexOf(b.name) !== -1 ? priorityOrder.indexOf(b.name) : 99;
        return aPri - bPri;
      });

      return prioritized.slice(0, profile.maxTools);
    },

    // Warm-up ping to preload weights into VRAM
    async warmUp(modelName, timeoutMs = 5000) {
      const host = this.getHost();
      const model = modelName || this.getModel();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(`${host}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            prompt: '',
            keep_alive: '5m'
          }),
          signal: controller.signal
        });
        clearTimeout(timer);
        return { ok: res.ok, warmed: res.ok, model };
      } catch(err) {
        clearTimeout(timer);
        return { ok: false, warmed: false, model, error: err.message };
      }
    },

    // Transform Gemini-style tools to Ollama format
    formatTools(tools) {
      if (!Array.isArray(tools)) return [];
      return tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }
      }));
    },

    // Stream response chunk by chunk with cancellation
    async generateStream(messages, tools, options = {}, onChunk = null) {
      const startTime = performance.now();
      const host = this.getHost();
      const model = options.model || this.getModel();
      const timeoutMs = options.timeoutMs || this.getTimeout();
      const controller = new AbortController();

      if (options.signal) {
        if (options.signal.aborted) {
          controller.abort();
        } else {
          options.signal.addEventListener('abort', () => controller.abort());
        }
      }
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const formattedMessages = messages.map(m => ({
        role: m.role === 'tadashi' || m.role === 'model' ? 'assistant' : m.role,
        content: m.content || (m.parts ? m.parts[0]?.text : '') || ''
      }));

      if (formattedMessages.length === 0 && options.prompt) {
        formattedMessages.push({ role: 'user', content: options.prompt });
      }

      const prunedTools = this.pruneToolsForModel(tools, model);

      const body = {
        model,
        messages: formattedMessages,
        stream: true,
        options: { temperature: options.temperature || 0.7 }
      };

      if (prunedTools.length > 0) {
        body.tools = this.formatTools(prunedTools);
      }

      try {
        const res = await fetch(`${host}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(timer);

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Ollama HTTP ${res.status}: ${errText}`);
        }

        let fullText = '';
        const toolCalls = [];

        if (res.body && typeof res.body.getReader === 'function') {
          const reader = res.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              try {
                const chunkData = JSON.parse(trimmed);
                const chunkText = chunkData.message?.content || '';
                if (chunkText) {
                  fullText += chunkText;
                  if (typeof onChunk === 'function') {
                    onChunk({
                      chunk: chunkText,
                      accumulated: fullText,
                      done: chunkData.done || false
                    });
                  }
                }
                if (Array.isArray(chunkData.message?.tool_calls)) {
                  for (const tc of chunkData.message.tool_calls) {
                    if (tc.function) {
                      toolCalls.push({
                        name: tc.function.name,
                        args: tc.function.arguments || {}
                      });
                    }
                  }
                }
              } catch(pe) {}
            }
          }
        } else {
          const data = await res.json();
          fullText = data.message?.content || '';
          if (Array.isArray(data.message?.tool_calls)) {
            for (const tc of data.message.tool_calls) {
              if (tc.function) {
                toolCalls.push({ name: tc.function.name, args: tc.function.arguments || {} });
              }
            }
          }
          if (typeof onChunk === 'function') {
            onChunk({ chunk: fullText, accumulated: fullText, done: true });
          }
        }

        const latencyMs = performance.now() - startTime;
        recordTelemetry({
          provider: 'ollama',
          model,
          latencyMs,
          status: 'success',
          taskClass: options.taskClass
        });

        return {
          ok: true,
          provider: 'ollama',
          model,
          text: fullText,
          toolCalls,
          latencyMs
        };

      } catch(err) {
        clearTimeout(timer);
        const latencyMs = performance.now() - startTime;
        recordTelemetry({
          provider: 'ollama',
          model,
          latencyMs,
          status: 'error',
          error: err.message,
          taskClass: options.taskClass
        });
        throw err;
      }
    },

    // Execute Chat Request against local Ollama API
    async generate(messages, tools, options = {}) {
      if (options.stream && typeof options.onChunk === 'function') {
        return this.generateStream(messages, tools, options, options.onChunk);
      }

      const startTime = performance.now();
      const host = this.getHost();
      const model = options.model || this.getModel();
      const timeoutMs = options.timeoutMs || this.getTimeout();
      const controller = new AbortController();

      if (options.signal) {
        if (options.signal.aborted) {
          controller.abort();
        } else {
          options.signal.addEventListener('abort', () => controller.abort());
        }
      }
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      // Convert messages to standard format
      const formattedMessages = messages.map(m => ({
        role: m.role === 'tadashi' || m.role === 'model' ? 'assistant' : m.role,
        content: m.content || (m.parts ? m.parts[0]?.text : '') || ''
      }));

      if (formattedMessages.length === 0 && options.prompt) {
        formattedMessages.push({ role: 'user', content: options.prompt });
      }

      // Prune tools for model capability budget
      const prunedTools = this.pruneToolsForModel(tools, model);

      const body = {
        model,
        messages: formattedMessages,
        stream: false,
        options: { temperature: options.temperature || 0.7 }
      };

      if (prunedTools.length > 0) {
        body.tools = this.formatTools(prunedTools);
      }

      try {
        const res = await fetch(`${host}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(timer);

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Ollama HTTP ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const latencyMs = performance.now() - startTime;
        const msg = data.message || {};

        // Parse tool calls if model returned them
        const toolCalls = [];
        if (Array.isArray(msg.tool_calls)) {
          for (const tc of msg.tool_calls) {
            if (tc.function) {
              toolCalls.push({
                name: tc.function.name,
                args: tc.function.arguments || {}
              });
            }
          }
        }

        recordTelemetry({
          provider: 'ollama',
          model,
          latencyMs,
          status: 'success',
          taskClass: options.taskClass
        });

        return {
          ok: true,
          provider: 'ollama',
          model,
          text: msg.content || '',
          toolCalls,
          latencyMs
        };

      } catch(err) {
        clearTimeout(timer);
        const latencyMs = performance.now() - startTime;
        recordTelemetry({
          provider: 'ollama',
          model,
          latencyMs,
          status: 'error',
          error: err.message,
          taskClass: options.taskClass
        });

        if (err.name === 'AbortError') {
          throw new Error(`Local Ollama request timed out after ${timeoutMs}ms or was cancelled.`);
        }
        if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('ECONNREFUSED'))) {
          throw new Error(`Cannot connect to local Ollama on ${host}. Ensure Ollama is running on your PC.`);
        }
        throw err;
      }
    }
  };

  // --- 2. OPENAI-COMPATIBLE AI GATEWAY PROVIDER (OmniRoute & FreeLLMAPI) ---
  const GATEWAY_ENDPOINT_KEY = 'tadashi_gateway_endpoint';
  const GATEWAY_MODEL_KEY    = 'tadashi_gateway_model';
  const GATEWAY_KEY_STORAGE  = 'tadashi_gateway_key';
  const GATEWAY_ENABLED_KEY  = 'tadashi_gateway_enabled';
  const GATEWAY_PRESET_KEY   = 'tadashi_gateway_preset';
  const GATEWAY_TIMEOUT_KEY  = 'tadashi_gateway_timeout_ms';

  const GATEWAY_PRESETS = {
    omniroute: {
      id: 'omniroute',
      name: 'OmniRoute (Smart Cost & Free Router)',
      defaultEndpoint: 'http://127.0.0.1:8080/v1',
      defaultModel: 'auto',
      description: 'Unified AI gateway aggregating 1400+ models with smart quota fallbacks and context compression.'
    },
    freellmapi: {
      id: 'freellmapi',
      name: 'FreeLLMAPI (Free Tier Aggregator & Failover)',
      defaultEndpoint: 'http://127.0.0.1:3001/v1',
      defaultModel: 'auto',
      description: 'Aggregates dozens of free-tier developer keys with automatic HTTP 429 failover.'
    },
    ollama_v1: {
      id: 'ollama_v1',
      name: 'Ollama (OpenAI Compatibility V1)',
      defaultEndpoint: 'http://127.0.0.1:11434/v1',
      defaultModel: 'llama3.2:latest',
      description: 'Local Ollama daemon running in standard OpenAI /v1 endpoint mode.'
    },
    custom: {
      id: 'custom',
      name: 'Custom OpenAI-Compatible Gateway',
      defaultEndpoint: 'http://127.0.0.1:8080/v1',
      defaultModel: 'default',
      description: 'Any self-hosted or remote OpenAI-compatible proxy (LiteLLM, LocalAI, vLLM, OpenRouter).'
    }
  };

  const GatewayProvider = {
    id: 'openai_gateway',
    name: 'AI Gateway (OmniRoute / FreeLLMAPI)',
    PRESETS: GATEWAY_PRESETS,

    getPreset() {
      try { return localStorage.getItem(GATEWAY_PRESET_KEY) || 'omniroute'; } catch(e) { return 'omniroute'; }
    },

    setPreset(presetId) {
      if (!GATEWAY_PRESETS[presetId]) presetId = 'custom';
      try { localStorage.setItem(GATEWAY_PRESET_KEY, presetId); } catch(e) {}
    },

    getEndpoint() {
      try {
        const custom = localStorage.getItem(GATEWAY_ENDPOINT_KEY);
        if (custom && custom.trim()) return this._normalizeEndpoint(custom.trim());
      } catch(e) {}
      const preset = GATEWAY_PRESETS[this.getPreset()] || GATEWAY_PRESETS.omniroute;
      return preset.defaultEndpoint;
    },

    setEndpoint(url) {
      try {
        if (url) localStorage.setItem(GATEWAY_ENDPOINT_KEY, (url || '').trim());
        else localStorage.removeItem(GATEWAY_ENDPOINT_KEY);
      } catch(e) {}
    },

    _normalizeEndpoint(url) {
      let clean = (url || '').trim().replace(/\/+$/, '');
      if (!clean.endsWith('/v1') && !clean.includes('/v1/')) {
        clean += '/v1';
      }
      return clean;
    },

    getModel() {
      try {
        const m = localStorage.getItem(GATEWAY_MODEL_KEY);
        if (m && m.trim()) return m.trim();
      } catch(e) {}
      const preset = GATEWAY_PRESETS[this.getPreset()] || GATEWAY_PRESETS.omniroute;
      return preset.defaultModel;
    },

    setModel(model) {
      try {
        if (model) localStorage.setItem(GATEWAY_MODEL_KEY, (model || '').trim());
        else localStorage.removeItem(GATEWAY_MODEL_KEY);
      } catch(e) {}
    },

    getKey() {
      try { return (localStorage.getItem(GATEWAY_KEY_STORAGE) || '').trim(); } catch(e) { return ''; }
    },

    setKey(k) {
      try {
        if (k) localStorage.setItem(GATEWAY_KEY_STORAGE, (k || '').trim());
        else localStorage.removeItem(GATEWAY_KEY_STORAGE);
      } catch(e) {}
    },

    isEnabled() {
      try { return localStorage.getItem(GATEWAY_ENABLED_KEY) === 'true'; } catch(e) { return false; }
    },

    setEnabled(enabled) {
      try { localStorage.setItem(GATEWAY_ENABLED_KEY, enabled ? 'true' : 'false'); } catch(e) {}
    },

    getTimeout() {
      try { return parseInt(localStorage.getItem(GATEWAY_TIMEOUT_KEY), 10) || 30000; } catch(e) { return 30000; }
    },

    setTimeout(ms) {
      try { localStorage.setItem(GATEWAY_TIMEOUT_KEY, String(ms)); } catch(e) {}
    },

    isLoopback(endpoint) {
      const target = (endpoint || this.getEndpoint()).toLowerCase();
      return target.includes('127.0.0.1') || target.includes('localhost') || target.includes('[::1]');
    },

    classifyEndpoint(endpoint) {
      return this.isLoopback(endpoint) ? 'local' : 'remote_online';
    },

    async checkHealth(timeoutMs = 1500) {
      const endpoint = this.getEndpoint();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const headers = { 'Accept': 'application/json' };
      const key = this.getKey();
      if (key) headers['Authorization'] = `Bearer ${key}`;

      try {
        const res = await fetch(`${endpoint}/models`, {
          method: 'GET',
          headers,
          signal: controller.signal
        });
        clearTimeout(timer);

        if (!res.ok) {
          return {
            ok: false,
            status: 'http_error',
            endpoint,
            error: `Gateway returned HTTP ${res.status}: ${res.statusText}`,
            models: []
          };
        }

        const data = await res.json();
        const models = Array.isArray(data.data) ? data.data.map(m => m.id || m.name || m) : [];
        return {
          ok: true,
          status: 'ready',
          endpoint,
          preset: this.getPreset(),
          modelsCount: models.length,
          models: models.slice(0, 50)
        };
      } catch(err) {
        clearTimeout(timer);
        const isTimeout = err.name === 'AbortError';
        const preset = this.getPreset();
        const hint = preset === 'omniroute'
          ? 'OmniRoute is not running on ' + endpoint + '. Launch OmniRoute on your PC.'
          : preset === 'freellmapi'
          ? 'FreeLLMAPI is not running on ' + endpoint + '. Launch FreeLLMAPI container.'
          : 'AI Gateway is offline on ' + endpoint + '.';

        return {
          ok: false,
          status: isTimeout ? 'timeout' : 'offline',
          endpoint,
          error: isTimeout ? `Connection to gateway (${endpoint}) timed out after ${timeoutMs}ms.` : hint,
          models: []
        };
      }
    },

    async isAvailable(timeoutMs = 1500) {
      if (!this.isEnabled()) return false;
      const health = await this.checkHealth(timeoutMs);
      return health.ok;
    },

    formatTools(tools) {
      if (!Array.isArray(tools)) return [];
      return tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }
      }));
    },

    buildOpenAIMessages(messages, options = {}) {
      const formatted = [];

      const systemPrompt = options.systemPrompt || (typeof window.AI !== 'undefined' ? window.AI.buildSystemPrompt() : 'You are TADASHI, autonomous AI assistant.');
      formatted.push({ role: 'system', content: systemPrompt });

      for (const m of (messages || [])) {
        if (!m) continue;
        let role = m.role;
        if (role === 'tadashi' || role === 'model') role = 'assistant';
        if (role === 'user' || role === 'assistant' || role === 'system' || role === 'tool') {
          const content = m.content || (m.parts && m.parts[0]?.text) || '';
          const msgObj = { role, content };
          if (m.tool_calls) msgObj.tool_calls = m.tool_calls;
          if (m.tool_call_id) msgObj.tool_call_id = m.tool_call_id;
          if (m.name) msgObj.name = m.name;
          formatted.push(msgObj);
        }
      }

      if (options.prompt && (formatted.length === 1 || formatted[formatted.length - 1].role !== 'user')) {
        formatted.push({ role: 'user', content: options.prompt });
      }

      return formatted;
    },

    async generate(messages, tools, options = {}) {
      const startTime = performance.now();
      const endpoint = this.getEndpoint();
      const model = options.model || this.getModel();
      const timeoutMs = options.timeoutMs || this.getTimeout();
      const controller = new AbortController();

      if (options.signal) {
        if (options.signal.aborted) controller.abort();
        else options.signal.addEventListener('abort', () => controller.abort());
      }
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const headers = { 'Content-Type': 'application/json' };
      const key = this.getKey();
      if (key) headers['Authorization'] = `Bearer ${key}`;

      const formattedMessages = this.buildOpenAIMessages(messages, options);
      const formattedTools = this.formatTools(tools);

      const body = {
        model,
        messages: formattedMessages,
        stream: false,
        temperature: options.temperature !== undefined ? options.temperature : 0.7
      };

      if (formattedTools.length > 0) {
        body.tools = formattedTools;
        body.tool_choice = 'auto';
      }

      try {
        let rounds = 0;
        let finalResponseData = null;
        const allToolCalls = [];

        while (rounds < 4) {
          const res = await fetch(`${endpoint}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: controller.signal
          });

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Gateway HTTP ${res.status}: ${errText}`);
          }

          const data = await res.json();
          finalResponseData = data;
          const choice = data.choices && data.choices[0];
          if (!choice) break;

          const msg = choice.message || {};
          const toolCalls = msg.tool_calls;

          if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
            break;
          }

          body.messages.push(msg);

          for (const tc of toolCalls) {
            const fnName = tc.function?.name;
            let fnArgs = {};
            try {
              fnArgs = typeof tc.function?.arguments === 'string'
                ? JSON.parse(tc.function.arguments)
                : (tc.function?.arguments || {});
            } catch(pe) {
              fnArgs = {};
            }

            allToolCalls.push({ name: fnName, args: fnArgs });

            let toolResult;
            if (typeof window.ToolRegistry !== 'undefined' && window.ToolRegistry.getTool(fnName)) {
              const check = await window.ToolRegistry.execute(fnName, fnArgs, { isApproved: false });
              if (check.approvalRequired) {
                if (typeof options.onApprovalRequest === 'function') {
                  const approved = await options.onApprovalRequest(check.proposal);
                  if (approved) {
                    toolResult = await window.ToolRegistry.execute(fnName, fnArgs, { isApproved: true, idempotencyKey: check.proposal.id });
                  } else {
                    toolResult = { ok: false, rejected: true, error: 'User declined the action proposal.' };
                  }
                } else {
                  toolResult = { ok: false, approvalRequired: true, error: 'Action requires explicit user confirmation before executing.' };
                }
              } else {
                toolResult = check;
              }
            } else if (typeof window.AI !== 'undefined' && typeof window.AI.executeTool === 'function') {
              toolResult = await window.AI.executeTool(fnName, fnArgs);
            } else {
              toolResult = { ok: false, error: `Tool ${fnName} not found` };
            }

            if (typeof options.onToolCall === 'function') {
              try { options.onToolCall(fnName, fnArgs, toolResult); } catch(te) {}
            }

            body.messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              name: fnName,
              content: JSON.stringify(toolResult.result ?? toolResult.error ?? toolResult)
            });
          }

          rounds++;
        }

        clearTimeout(timer);
        const latencyMs = performance.now() - startTime;
        const choice = finalResponseData?.choices?.[0];
        const text = choice?.message?.content || '';

        recordTelemetry({
          provider: 'gateway',
          model,
          latencyMs,
          status: 'success',
          taskClass: options.taskClass
        });

        return {
          ok: true,
          provider: 'gateway',
          model,
          text,
          toolCalls: allToolCalls,
          latencyMs
        };

      } catch(err) {
        clearTimeout(timer);
        const latencyMs = performance.now() - startTime;
        recordTelemetry({
          provider: 'gateway',
          model,
          latencyMs,
          status: 'error',
          error: err.message,
          taskClass: options.taskClass
        });

        if (err.name === 'AbortError') {
          throw new Error(`AI Gateway request timed out after ${timeoutMs}ms or was cancelled.`);
        }
        if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('ECONNREFUSED'))) {
          throw new Error(`Cannot connect to AI Gateway on ${endpoint}. Verify OmniRoute/FreeLLMAPI is active.`);
        }
        throw err;
      }
    }
  };

  // --- 3. HOSTED CLOUD GEMINI PROVIDER ---
  const GeminiCloudProvider = {
    id: 'gemini_cloud',
    name: 'Gemini (Google Cloud)',

    async isAvailable() {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
      return typeof window.AI !== 'undefined' && window.AI.hasKey();
    },

    async generate(messages, tools, options = {}) {
      if (typeof window.AI === 'undefined') throw new Error('Gemini bridge not loaded');
      const startTime = performance.now();
      const model = window.AI.getModel();

      try {
        const text = await window.AI.chat(
          options.prompt || (messages[messages.length - 1]?.content || ''),
          messages,
          options
        );
        const latencyMs = performance.now() - startTime;

        recordTelemetry({
          provider: 'gemini',
          model,
          latencyMs,
          status: 'success',
          taskClass: options.taskClass
        });

        return {
          ok: true,
          provider: 'gemini',
          model,
          text,
          latencyMs
        };
      } catch(err) {
        const latencyMs = performance.now() - startTime;
        recordTelemetry({
          provider: 'gemini',
          model,
          latencyMs,
          status: 'error',
          error: err.message,
          taskClass: options.taskClass
        });
        throw err;
      }
    }
  };

  // --- 4. TADASHI AGENT ROUTER (Decision Matrix) ---
  const AIRouter = {
    TASK_CLASS,
    providers: {
      gateway: GatewayProvider,
      ollama: OllamaProvider,
      gemini: GeminiCloudProvider
    },

    getPrivacyMode() {
      try { return localStorage.getItem(PRIVACY_STORAGE_KEY) || 'cloud_allowed'; } catch(e) { return 'cloud_allowed'; }
    },

    setPrivacyMode(mode) {
      if (mode === 'local_only' || mode === 'cloud_allowed') {
        try { localStorage.setItem(PRIVACY_STORAGE_KEY, mode); } catch(e) {}
      }
    },

    // Inspect recent telemetry
    getTelemetry() {
      try {
        const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch(e) { return []; }
    },

    clearTelemetry() {
      try { localStorage.removeItem(TELEMETRY_STORAGE_KEY); } catch(e) {}
    },

    // Main Policy Resolution
    async resolveRoute(request = {}) {
      const privacy = request.privacy || this.getPrivacyMode();
      const isOnline = (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') ? navigator.onLine : true;
      const ollamaAvailable = await OllamaProvider.isAvailable(1000);

      const gatewayEnabled = GatewayProvider.isEnabled();
      const gatewayHost = GatewayProvider.getEndpoint();
      const gatewayLoopback = GatewayProvider.isLoopback(gatewayHost);
      const gatewayAvailable = gatewayEnabled ? await GatewayProvider.isAvailable(1000) : false;

      // Rule 1: Local-only privacy policy strictly enforced
      if (privacy === 'local_only') {
        if (gatewayEnabled) {
          if (!gatewayLoopback) {
            return {
              selectedProvider: null,
              routeDecision: 'blocked_privacy_remote_gateway',
              error: `Local-only privacy mode requires a local loopback AI Gateway (127.0.0.1 or localhost). Configured gateway "${gatewayHost}" is classified as remote online. Data was strictly blocked from cloud transit.`
            };
          }
          if (gatewayAvailable) {
            return {
              selectedProvider: GatewayProvider,
              routeDecision: 'gateway_privacy_enforced'
            };
          }
        }

        const host = OllamaProvider.getHost();
        if (!OllamaProvider.isLoopback(host)) {
          return {
            selectedProvider: null,
            routeDecision: 'blocked_privacy_remote_host',
            error: `Local-only privacy mode requires a local loopback Ollama host (127.0.0.1 or localhost). Configured host "${host}" is classified as remote online.`
          };
        }

        if (!ollamaAvailable) {
          return {
            selectedProvider: null,
            routeDecision: 'blocked_local_offline',
            error: 'Local-only privacy mode is active, but local Ollama service (http://127.0.0.1:11434) is offline. Data was strictly blocked from cloud transit.'
          };
        }
        return {
          selectedProvider: OllamaProvider,
          routeDecision: 'ollama_privacy_enforced'
        };
      }

      // Rule 2: Completely offline (Internet disconnected)
      if (!isOnline) {
        if (gatewayEnabled && gatewayLoopback && gatewayAvailable) {
          return {
            selectedProvider: GatewayProvider,
            routeDecision: 'gateway_offline_loopback'
          };
        }
        if (ollamaAvailable) {
          return {
            selectedProvider: OllamaProvider,
            routeDecision: 'ollama_offline_fallback'
          };
        }
        return {
          selectedProvider: null,
          routeDecision: 'deterministic_offline_only',
          error: 'Network connection is offline and local Ollama is not running. Core LifeOS deterministic tools remain available.'
        };
      }

      // Rule 3: Online & Cloud Allowed
      // Priority 1: AI Gateway (OmniRoute / FreeLLMAPI) if user enabled it and it is healthy
      if (gatewayEnabled && gatewayAvailable) {
        const fallback = (await GeminiCloudProvider.isAvailable()) ? GeminiCloudProvider : (ollamaAvailable ? OllamaProvider : null);
        return {
          selectedProvider: GatewayProvider,
          fallbackProvider: fallback,
          routeDecision: 'gateway_primary'
        };
      }

      // Priority 2: Gemini Cloud
      const cloudAvailable = await GeminiCloudProvider.isAvailable();
      if (cloudAvailable) {
        const fallback = (gatewayEnabled && gatewayAvailable) ? GatewayProvider : (ollamaAvailable ? OllamaProvider : null);
        return {
          selectedProvider: GeminiCloudProvider,
          fallbackProvider: fallback,
          routeDecision: 'cloud_primary'
        };
      }

      // Priority 3: Local Ollama
      if (ollamaAvailable) {
        return {
          selectedProvider: OllamaProvider,
          routeDecision: 'ollama_no_cloud_key'
        };
      }

      return {
        selectedProvider: null,
        routeDecision: 'unconfigured',
        error: 'No AI model provider configured. Please provide a Gemini API key, enable OmniRoute / FreeLLMAPI gateway, or start local Ollama.'
      };
    },

    // Chat execution with policy routing & automatic fallback
    async chat(prompt, history = [], options = {}) {
      const route = await this.resolveRoute({
        privacy: options.privacy,
        taskClass: options.taskClass
      });

      if (!route.selectedProvider) {
        throw new Error(route.error || 'No viable AI provider route');
      }

      const rawTools = (typeof window.ToolRegistry !== 'undefined')
        ? window.ToolRegistry.getGeminiDeclarations()
        : [];

      // If routed to local Ollama, apply model-specific exposure budgeting
      const tools = (route.selectedProvider.id === 'ollama_local' && typeof OllamaProvider.pruneToolsForModel === 'function')
        ? OllamaProvider.pruneToolsForModel(rawTools, options.model || OllamaProvider.getModel())
        : rawTools;

      try {
        return await route.selectedProvider.generate(
          history,
          tools,
          { ...options, prompt }
        );
      } catch(primaryErr) {
        // Fallback execution if configured
        if (route.fallbackProvider) {
          console.warn(`Primary provider ${route.selectedProvider.id} failed; attempting fallback to ${route.fallbackProvider.id}`);
          const fallbackTools = (route.fallbackProvider.id === 'ollama_local' && typeof OllamaProvider.pruneToolsForModel === 'function')
            ? OllamaProvider.pruneToolsForModel(rawTools, options.model || OllamaProvider.getModel())
            : rawTools;
          return await route.fallbackProvider.generate(
            history,
            fallbackTools,
            { ...options, prompt }
          );
        }
        throw primaryErr;
      }
    }
  };

  window.OllamaProvider = OllamaProvider;
  window.GatewayProvider = GatewayProvider;
  window.AIRouter = AIRouter;

})(typeof window !== 'undefined' ? window : global);
