// ============================================================
// TADASHI LifeOS — PC Local Companion Agent (Phase 7)
// Outbound connection to cloud; local Ollama access;
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

  // Check local loopback Ollama
  async checkOllama() {
    try {
      const res = await fetch(`${this.ollamaUrl}/api/tags`, { method: 'GET' });
      return { ok: res.ok, status: res.status };
    } catch(err) {
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
}

module.exports = {
  PCAgent
};
