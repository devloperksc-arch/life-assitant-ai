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

  // --- 2. HOSTED CLOUD GEMINI PROVIDER ---
  const GeminiCloudProvider = {
    id: 'gemini_cloud',
    name: 'Gemini (Google Cloud)',

    async isAvailable() {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
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

  // --- 3. TADASHI AGENT ROUTER (Decision Matrix) ---
  const AIRouter = {
    TASK_CLASS,
    providers: {
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
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      const ollamaAvailable = await OllamaProvider.isAvailable(1000);

      // Rule 1: Local-only privacy policy strictly enforced
      if (privacy === 'local_only') {
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

      // Rule 3: Online & Cloud Allowed -> Use Gemini Cloud (Fallback to Ollama on failure)
      const cloudAvailable = await GeminiCloudProvider.isAvailable();
      if (cloudAvailable) {
        return {
          selectedProvider: GeminiCloudProvider,
          fallbackProvider: ollamaAvailable ? OllamaProvider : null,
          routeDecision: 'cloud_primary'
        };
      }

      // Cloud not configured or has no API key -> check Ollama
      if (ollamaAvailable) {
        return {
          selectedProvider: OllamaProvider,
          routeDecision: 'ollama_no_cloud_key'
        };
      }

      return {
        selectedProvider: null,
        routeDecision: 'unconfigured',
        error: 'No AI model provider configured. Please provide a Gemini API key or start local Ollama.'
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
  window.AIRouter = AIRouter;

})(typeof window !== 'undefined' ? window : global);
