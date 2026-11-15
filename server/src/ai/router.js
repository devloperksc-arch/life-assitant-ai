// ============================================================
// TADASHI LifeOS — Server-Side Dual-Gateway AI Policy Router
// Primary: OmniRoute | Secondary: FreeLLMAPI (Failover only)
// Free-Only Policy: Paid models strictly blocked. Zero surprise spend.
// Gateway secrets remain 100% server-side.
// ============================================================

const inMemoryTelemetry = [];

// Configuration Defaults
const CONFIG = {
  get routingMode() { return process.env.AI_ROUTING_MODE || 'free_only'; },
  get paidModelsBlocked() { return process.env.AI_PAID_MODELS_BLOCKED !== 'false'; },
  get timeoutMs() { return parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '45000', 10); },
  get maxFailoverAttempts() { return parseInt(process.env.AI_MAX_FAILOVER_ATTEMPTS || '1', 10); },
  
  // Primary Gateway (OmniRoute)
  get omnirouteBaseUrl() { return (process.env.OMNIROUTE_BASE_URL || '').trim(); },
  get omnirouteApiKey() { return (process.env.OMNIROUTE_API_KEY || '').trim(); },
  get omnirouteModel() { return (process.env.OMNIROUTE_MODEL || 'meta-llama/llama-3.2-3b-instruct:free').trim(); },

  // Secondary Gateway (FreeLLMAPI)
  get freellmBaseUrl() { return (process.env.FREELLMAPI_BASE_URL || '').trim(); },
  get freellmApiKey() { return (process.env.FREELLMAPI_API_KEY || '').trim(); },
  get freellmModel() { return (process.env.FREELLMAPI_MODEL || 'meta-llama/llama-3.2-3b-instruct:free').trim(); },

  // Free Model Allowlist
  get freeModelAllowlist() {
    const raw = (process.env.AI_FREE_MODEL_ALLOWLIST || '').trim();
    if (raw) {
      return raw.split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
    }
    // Default verified free-tier models across Google AI Studio & OpenRouter free-tiers
    return [
      'meta-llama/llama-3.2-3b-instruct:free',
      'meta-llama/llama-3.1-8b-instruct:free',
      'gemini-2.0-flash-exp:free',
      'gemini-2.5-flash',
      'mistralai/mistral-7b-instruct:free',
      'qwen/qwen-2.5-7b-instruct:free',
      'auto',
      'default'
    ];
  }
};

// URL Normalizer: Ensures single consistent /chat/completions endpoint
function normalizeChatUrl(baseUrl) {
  if (!baseUrl) return '';
  let url = baseUrl.trim().replace(/\/+$/, '');
  if (url.endsWith('/chat/completions')) {
    return url;
  }
  if (url.endsWith('/v1')) {
    return `${url}/chat/completions`;
  }
  return `${url}/v1/chat/completions`;
}

// Model Allowlist Validator
function validateFreeModel(modelName) {
  if (!modelName) return { ok: false, error: 'No model specified' };
  const clean = modelName.trim().toLowerCase();
  const allowlist = CONFIG.freeModelAllowlist;

  const isAllowed = allowlist.some(allowed => {
    if (allowed === clean) return true;
    if (allowed.endsWith('*') && clean.startsWith(allowed.slice(0, -1))) return true;
    return false;
  });

  if (!isAllowed) {
    return {
      ok: false,
      error: `Model "${modelName}" is not on the approved free-tier allowlist. Paid models are strictly blocked in free_only mode.`
    };
  }
  return { ok: true, model: clean };
}

// Determines if an upstream error qualifies for secondary gateway failover
function isEligibleForFailover(status, errorMsg = '') {
  // Network drops, DNS errors, connection refusal, timeouts
  if (!status || status === 0) return true;
  if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ETIMEDOUT') || errorMsg.includes('fetch failed')) return true;
  if (errorMsg.includes('AbortError') || errorMsg.includes('timed out')) return true;

  // HTTP Statuses: 408 (Timeout), 429 (Rate Limit / Quota Exhaustion), 5xx (Gateway/Upstream failure)
  if (status === 408 || status === 429) return true;
  if (status >= 500 && status <= 504) return true;

  // 400 (Bad Request), 401/403 (Auth Configuration Error), 422 (Unprocessable) MUST NOT failover
  return false;
}

// Dispatches an OpenAI-compatible /chat/completions request
async function callGateway({ endpoint, apiKey, model, messages, tools, temperature, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {
    'Content-Type': 'application/json'
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const payload = {
    model,
    messages,
    temperature: temperature !== undefined ? temperature : 0.7,
    stream: false
  };
  if (Array.isArray(tools) && tools.length > 0) {
    payload.tools = tools;
    payload.tool_choice = 'auto';
  }

  const startTime = Date.now();
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const latencyMs = Date.now() - startTime;
    clearTimeout(timer);

    let data = null;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch(pe) {
      data = { rawText: text };
    }

    return {
      ok: res.ok,
      status: res.status,
      latencyMs,
      data,
      error: res.ok ? null : (data?.error?.message || data?.error || `HTTP ${res.status}`)
    };
  } catch(err) {
    clearTimeout(timer);
    const latencyMs = Date.now() - startTime;
    return {
      ok: false,
      status: err.name === 'AbortError' ? 408 : 0,
      latencyMs,
      error: err.name === 'AbortError' ? `Request timed out after ${timeoutMs}ms` : err.message
    };
  }
}

// Safe Telemetry Logger (Strictly redacts prompts, secrets, and auth headers)
function recordSafeTelemetry({ userId, deviceId, provider, model, latencyMs, status, error, failover }) {
  inMemoryTelemetry.unshift({
    userId: userId || 'anonymous',
    deviceId: deviceId || 'unknown',
    provider,
    model,
    latencyMs,
    status,
    failover: Boolean(failover),
    error: error ? String(error).slice(0, 120) : null,
    timestamp: new Date().toISOString()
  });
  if (inMemoryTelemetry.length > 100) inMemoryTelemetry.pop();
}

// Main AI Chat Handler
async function handleAIChat(user, device, body) {
  const privacy = body.privacy || 'cloud_allowed';
  const messages = body.messages || [];
  const tools = body.tools || [];
  const requestedModel = (body.model || 'auto').trim();
  const startTime = Date.now();

  // 1. Strict Privacy Gate: Local-Only requests must never reach the cloud server
  if (privacy === 'local_only') {
    return {
      ok: false,
      status: 400,
      error: 'Task marked local_only must be executed on-device by local Ollama, not sent to cloud server.'
    };
  }

  // 2. Resolve & Validate Free-Tier Model Allowlist
  let effectiveModel = requestedModel;
  if (effectiveModel === 'auto' || effectiveModel === 'default') {
    effectiveModel = CONFIG.omnirouteModel || CONFIG.freeModelAllowlist[0] || 'meta-llama/llama-3.2-3b-instruct:free';
  }

  if (CONFIG.paidModelsBlocked || CONFIG.routingMode === 'free_only') {
    const check = validateFreeModel(effectiveModel);
    if (!check.ok) {
      return {
        ok: false,
        status: 400,
        error: check.error,
        code: 'PAID_MODEL_BLOCKED'
      };
    }
    effectiveModel = check.model;
  }

  // 3. Evaluate Configured Gateways
  const primaryUrl = normalizeChatUrl(CONFIG.omnirouteBaseUrl);
  const secondaryUrl = normalizeChatUrl(CONFIG.freellmBaseUrl);

  if (!primaryUrl && !secondaryUrl) {
    const latencyMs = Date.now() - startTime;
    recordSafeTelemetry({
      userId: user?.id,
      deviceId: device?.id,
      provider: 'unconfigured',
      model: effectiveModel,
      latencyMs,
      status: 'noop'
    });
    return {
      ok: false,
      status: 503,
      error: 'No AI gateways configured. Set OMNIROUTE_BASE_URL and/or FREELLMAPI_BASE_URL with approved free models.',
      code: 'GATEWAYS_UNCONFIGURED'
    };
  }

  // 4. Primary Gateway Attempt (OmniRoute)
  if (primaryUrl) {
    const primaryRes = await callGateway({
      endpoint: primaryUrl,
      apiKey: CONFIG.omnirouteApiKey,
      model: effectiveModel,
      messages,
      tools,
      temperature: body.temperature,
      timeoutMs: CONFIG.timeoutMs
    });

    if (primaryRes.ok) {
      recordSafeTelemetry({
        userId: user?.id,
        deviceId: device?.id,
        provider: 'omniroute',
        model: effectiveModel,
        latencyMs: primaryRes.latencyMs,
        status: 'success'
      });
      return {
        ok: true,
        provider: 'omniroute',
        model: effectiveModel,
        latencyMs: primaryRes.latencyMs,
        ...primaryRes.data
      };
    }

    // Evaluate failover eligibility
    const eligible = isEligibleForFailover(primaryRes.status, primaryRes.error);
    if (!eligible || !secondaryUrl || CONFIG.maxFailoverAttempts < 1) {
      recordSafeTelemetry({
        userId: user?.id,
        deviceId: device?.id,
        provider: 'omniroute',
        model: effectiveModel,
        latencyMs: primaryRes.latencyMs,
        status: 'error',
        error: primaryRes.error
      });
      return {
        ok: false,
        status: primaryRes.status || 502,
        error: `Primary AI Gateway (OmniRoute) failed: ${primaryRes.error}`,
        provider: 'omniroute'
      };
    }

    console.warn(`[TADASHI AI] Primary gateway failed (status=${primaryRes.status}). Triggering failover to secondary FreeLLMAPI...`);
  }

  // 5. Secondary Gateway Attempt (FreeLLMAPI Failover)
  if (secondaryUrl) {
    const secondaryModel = CONFIG.freellmModel || effectiveModel;
    const modelCheck = validateFreeModel(secondaryModel);
    if (!modelCheck.ok) {
      return {
        ok: false,
        status: 400,
        error: `Secondary gateway model "${secondaryModel}" failed free-tier allowlist validation.`,
        code: 'SECONDARY_MODEL_NOT_FREE'
      };
    }

    const secondaryRes = await callGateway({
      endpoint: secondaryUrl,
      apiKey: CONFIG.freellmApiKey,
      model: modelCheck.model,
      messages,
      tools,
      temperature: body.temperature,
      timeoutMs: CONFIG.timeoutMs
    });

    if (secondaryRes.ok) {
      recordSafeTelemetry({
        userId: user?.id,
        deviceId: device?.id,
        provider: 'freellmapi',
        model: modelCheck.model,
        latencyMs: secondaryRes.latencyMs,
        status: 'success',
        failover: true
      });
      return {
        ok: true,
        provider: 'freellmapi',
        failoverFrom: 'omniroute',
        model: modelCheck.model,
        latencyMs: secondaryRes.latencyMs,
        ...secondaryRes.data
      };
    }

    recordSafeTelemetry({
      userId: user?.id,
      deviceId: device?.id,
      provider: 'freellmapi',
      model: modelCheck.model,
      latencyMs: secondaryRes.latencyMs,
      status: 'error',
      error: secondaryRes.error,
      failover: true
    });
  }

  // 6. Fail Closed: Zero surprise spending. Never invoke paid fallback.
  return {
    ok: false,
    status: 503,
    error: 'Free AI capacity unavailable: both primary (OmniRoute) and secondary (FreeLLMAPI) free gateways failed. Paid fallbacks are strictly disabled.',
    code: 'NO_FREE_CAPACITY'
  };
}

// Safe Telemetry Reader
function getAITelemetry(userId) {
  return inMemoryTelemetry.filter(t => !userId || t.userId === userId);
}

// Safe Gateway Health Check (Discloses zero secrets or auth tokens)
function getGatewayStatus() {
  return {
    routingMode: CONFIG.routingMode,
    paidModelsBlocked: CONFIG.paidModelsBlocked,
    allowlist: CONFIG.freeModelAllowlist,
    primary: {
      provider: 'omniroute',
      configured: Boolean(CONFIG.omnirouteBaseUrl),
      model: CONFIG.omnirouteModel
    },
    secondary: {
      provider: 'freellmapi',
      configured: Boolean(CONFIG.freellmBaseUrl),
      model: CONFIG.freellmModel
    }
  };
}

module.exports = {
  handleAIChat,
  getAITelemetry,
  getGatewayStatus,
  normalizeChatUrl,
  validateFreeModel,
  isEligibleForFailover,
  CONFIG
};
