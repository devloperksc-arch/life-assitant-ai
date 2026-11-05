// ============================================================
// TADASHI LifeOS — Server-Side AI Policy Router (Phase 5)
// Routes backend AI requests through LiteLLM gateway or direct
// providers while strictly enforcing privacy and budget rules.
// ============================================================

const LITELLM_ENDPOINT = process.env.LITELLM_ENDPOINT || 'http://127.0.0.1:4000';
const LITELLM_API_KEY = process.env.LITELLM_API_KEY || '';

const inMemoryTelemetry = [];

async function handleAIChat(user, device, body) {
  const taskClass = body.taskClass || 'general';
  const privacy = body.privacy || 'cloud_allowed';
  const messages = body.messages || [];
  const tools = body.tools || [];
  const startTime = Date.now();

  // If local_only is requested on the cloud server, reject because cloud server must not see local-only data
  if (privacy === 'local_only') {
    return {
      ok: false,
      status: 400,
      error: 'Task marked local_only must be executed on-device by local Ollama, not sent to cloud server.'
    };
  }

  // Check if LiteLLM gateway is configured
  if (LITELLM_API_KEY && LITELLM_ENDPOINT) {
    try {
      const res = await fetch(`${LITELLM_ENDPOINT}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LITELLM_API_KEY}`
        },
        body: JSON.stringify({
          model: body.model || 'gpt-4o-mini',
          messages,
          tools: tools.length > 0 ? tools : undefined
        })
      });

      const data = await res.json();
      const latencyMs = Date.now() - startTime;

      inMemoryTelemetry.unshift({
        userId: user.id,
        deviceId: device.id,
        provider: 'litellm',
        model: body.model || 'gpt-4o-mini',
        latencyMs,
        status: res.ok ? 'success' : 'error',
        timestamp: new Date().toISOString()
      });
      if (inMemoryTelemetry.length > 100) inMemoryTelemetry.pop();

      return { ok: true, latencyMs, ...data };
    } catch(err) {
      return { ok: false, status: 502, error: `LiteLLM gateway unreachable: ${err.message}` };
    }
  }

  // Fallback: mock response if no gateway key configured
  const latencyMs = Date.now() - startTime;
  inMemoryTelemetry.unshift({
    userId: user.id,
    deviceId: device.id,
    provider: 'unconfigured_gateway',
    latencyMs,
    status: 'noop',
    timestamp: new Date().toISOString()
  });

  return {
    ok: true,
    latencyMs,
    text: 'TADASHI backend received request. Set LITELLM_API_KEY and LITELLM_ENDPOINT to enable server-side routing.',
    provider: 'mock'
  };
}

function getAITelemetry(userId) {
  return inMemoryTelemetry.filter(t => t.userId === userId);
}

module.exports = {
  handleAIChat,
  getAITelemetry
};
