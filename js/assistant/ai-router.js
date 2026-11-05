// ============================================================
// TADASHI LifeOS — Hybrid AI Router (Phase 5)
// Routes across local Ollama (127.0.0.1:11434) and hosted cloud models
// enforcing local-only privacy policies, latency budgets, and fallbacks.
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

  // --- 1. LOCAL OLLAMA PROVIDER (Loopback Only) ---
  const OllamaProvider = {
    id: 'ollama_local',
    name: 'Ollama (Local PC)',

    getHost() {
      try { return localStorage.getItem(OLLAMA_HOST_KEY) || DEFAULT_OLLAMA_HOST; } catch(e) { return DEFAULT_OLLAMA_HOST; }
    },

    getModel() {
      try { return localStorage.getItem(OLLAMA_MODEL_KEY) || DEFAULT_OLLAMA_MODEL; } catch(e) { return DEFAULT_OLLAMA_MODEL; }
    },

    // Check if Ollama is running locally with quick timeout
    async isAvailable(timeoutMs = 1500) {
      const host = this.getHost();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(`${host}/api/tags`, {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timer);
        return res.ok;
      } catch(e) {
        clearTimeout(timer);
        return false;
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

    // Execute Chat Request against local Ollama API
    async generate(messages, tools, options = {}) {
      const startTime = performance.now();
      const host = this.getHost();
      const model = options.model || this.getModel();
      const timeoutMs = options.timeoutMs || 30000;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      // Convert messages to standard format
      const formattedMessages = messages.map(m => ({
        role: m.role === 'tadashi' || m.role === 'model' ? 'assistant' : m.role,
        content: m.content || (m.parts ? m.parts[0]?.text : '') || ''
      }));

      const body = {
        model,
        messages: formattedMessages,
        stream: false,
        options: { temperature: 0.7 }
      };

      if (Array.isArray(tools) && tools.length > 0) {
        body.tools = this.formatTools(tools);
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
        // Direct call through AI module
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

      const tools = (typeof window.ToolRegistry !== 'undefined')
        ? window.ToolRegistry.getGeminiDeclarations()
        : [];

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
          return await route.fallbackProvider.generate(
            history,
            tools,
            { ...options, prompt }
          );
        }
        throw primaryErr;
      }
    }
  };

  window.AIRouter = AIRouter;

})(typeof window !== 'undefined' ? window : global);
