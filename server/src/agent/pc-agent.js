// ============================================================
// TADASHI LifeOS — PC Local Companion Agent (Phase 7 & Mark LVI Milestone 1)
// Outbound connection to cloud; local Ollama access & model discovery;
// individually scoped read-only OS telemetry (Zero arbitrary shell).
// ============================================================

const os = require('os');

class PCAgent {
  constructor(options = {}) {
    this.deviceId = options.deviceId || `dev_laptop_${os.hostname()}`;
    this.deviceName = options.deviceName || `${os.userInfo().username}'s PC`;
    this.cloudServerUrl = options.cloudServerUrl || 'http://127.0.0.1:3000';
    this.sessionToken = options.sessionToken || null;
    this.ollamaUrl = options.ollamaUrl || 'http://127.0.0.1:11434';
    this.heartbeatTimer = null;
    this.isConnected = false;
  }

  // --- Read-Only Scoped OS Tools (Safe, No Arbitrary Shell) ---
  getSystemInfo() {
    const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
    const freeMemMb = Math.round(os.freemem() / (1024 * 1024));
    const uptimeHours = (os.uptime() / 3600).toFixed(1);

    return {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptimeHours: parseFloat(uptimeHours),
      memory: {
        totalMb: totalMemMb,
        freeMb: freeMemMb,
        usedPercent: Math.round(((totalMemMb - freeMemMb) / totalMemMb) * 100)
      },
      cpuCount: os.cpus().length
    };
  }

  // Security Gate: Reject any shell execution attempt
  executeCommand() {
    throw new Error('Security Violation: Arbitrary shell execution is strictly disallowed on TADASHI PC Agent.');
  }

  // Check local loopback Ollama and discover models
  async checkOllama() {
    try {
      const res = await fetch(`${this.ollamaUrl}/api/tags`, { method: 'GET' });
      if (!res.ok) {
        return { ok: false, status: res.status, models: [] };
      }
      const data = await res.json();
      const models = Array.isArray(data.models) ? data.models : [];

      let version = null;
      try {
        const vRes = await fetch(`${this.ollamaUrl}/api/version`, { method: 'GET' });
        if (vRes.ok) {
          const vData = await vRes.json();
          version = vData.version || null;
        }
      } catch(ve) {}

      return {
        ok: true,
        status: 200,
        version,
        models
      };
    } catch(err) {
      return { ok: false, error: err.message, models: [] };
    }
  }

  // Query installed models on local Ollama
  async queryOllamaModels() {
    const check = await this.checkOllama();
    if (!check.ok) {
      return { ok: false, error: check.error || 'Ollama offline', models: [] };
    }
    return {
      ok: true,
      version: check.version,
      models: check.models.map(m => ({
        name: m.name,
        size: m.size,
        modifiedAt: m.modified_at,
        parameterSize: m.details?.parameter_size,
        family: m.details?.family
      }))
    };
  }

  // Route local chat execution through PC agent to local Ollama
  async chatWithOllama(messages, tools = [], options = {}) {
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs || 30000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const body = {
        model: options.model || 'llama3.2:latest',
        messages: messages.map(m => ({
          role: m.role === 'tadashi' || m.role === 'model' ? 'assistant' : m.role,
          content: m.content || ''
        })),
        stream: false,
        options: { temperature: options.temperature || 0.7 }
      };

      if (Array.isArray(tools) && tools.length > 0) {
        body.tools = tools.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters
          }
        }));
      }

      const res = await fetch(`${this.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!res.ok) {
        const errText = await res.text();
        return { ok: false, error: `Ollama HTTP ${res.status}: ${errText}` };
      }

      const data = await res.json();
      const msg = data.message || {};
      const toolCalls = [];
      if (Array.isArray(msg.tool_calls)) {
        for (const tc of msg.tool_calls) {
          if (tc.function) {
            toolCalls.push({ name: tc.function.name, args: tc.function.arguments || {} });
          }
        }
      }

      return {
        ok: true,
        text: msg.content || '',
        toolCalls,
        model: body.model
      };
    } catch(err) {
      clearTimeout(timer);
      return { ok: false, error: err.message };
    }
  }

  // Outbound Heartbeat to Cloud Server
  async sendHeartbeat() {
    if (!this.sessionToken) {
      return { ok: false, error: 'No session token for cloud heartbeat' };
    }

    try {
      const sysInfo = this.getSystemInfo();
      const ollamaCheck = await this.checkOllama();

      const res = await fetch(`${this.cloudServerUrl}/agent/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.sessionToken}`
        },
        body: JSON.stringify({
          deviceId: this.deviceId,
          systemInfo: sysInfo,
          ollamaOnline: ollamaCheck.ok,
          ollamaVersion: ollamaCheck.version || null,
          ollamaModels: Array.isArray(ollamaCheck.models) ? ollamaCheck.models.map(m => m.name) : [],
          timestamp: new Date().toISOString()
        })
      });

      this.isConnected = res.ok;
      return { ok: res.ok, status: res.status };
    } catch(e) {
      this.isConnected = false;
      return { ok: false, error: e.message };
    }
  }

  startHeartbeat(intervalMs = 15000) {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.sendHeartbeat().catch(() => {});
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat().catch(() => {});
    }, intervalMs);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.isConnected = false;
  }

  // Approved Offline Scope (Mark LVI Phase 3)
  getApprovedOfflineScope() {
    return ['tasks', 'calendar', 'routines', 'wellbeing', 'user', 'memory'];
  }

  // Scoped Offline Data Access
  getOfflineData(domain, localDatabase = {}) {
    const approvedScope = this.getApprovedOfflineScope();
    if (!approvedScope.includes(domain)) {
      return {
        ok: false,
        error: `Scope Violation: Access to "${domain}" is not permitted under approved offline PC agent scope.`
      };
    }

    const data = localDatabase[domain] || null;
    return {
      ok: true,
      domain,
      data
    };
  }
}

module.exports = {
  PCAgent
};
