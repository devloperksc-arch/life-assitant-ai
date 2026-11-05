// ============================================================
// TADASHI LifeOS — PC Local Companion Agent (Phase 7 & Mark LVI Milestones 1, 5, 6)
// Outbound connection to cloud; local Ollama access & model discovery;
// individually scoped read-only OS telemetry (Zero arbitrary shell);
// device pairing gates, permission scopes, and emergency stop.
// ============================================================

const os = require('os');
const path = require('path');
const fs = require('fs');

const SUPPORTED_SCOPES = [
  'pc.system.read',
  'pc.window.read',
  'pc.clipboard.read',
  'pc.files.stat',
  'pc.voice.operate'
];

const OUTCOME = {
  VERIFIED_DONE: 'verified_done',
  UNVERIFIED: 'unverified',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

class PCAgent {
  constructor(options = {}) {
    this.deviceId = options.deviceId || `dev_laptop_${os.hostname()}`;
    this.deviceName = options.deviceName || `${os.userInfo().username}'s PC`;
    this.cloudServerUrl = options.cloudServerUrl || 'http://127.0.0.1:3000';
    this.sessionToken = options.sessionToken || null;
    this.ollamaUrl = options.ollamaUrl || 'http://127.0.0.1:11434';
    this.heartbeatTimer = null;
    this.isConnected = false;

    // Milestone 6: Device Pairing, Capabilities & Presence
    this.isPairedDevice = Boolean(options.isPairedDevice || false);
    this.pairedUserId = options.pairedUserId || null;
    this.grantedScopes = new Set(options.grantedScopes || []);
    this.isEmergencyStopped = false;
    this.approvedWorkspacePath = path.resolve(options.approvedWorkspacePath || process.cwd());
    this.auditLog = [];
    this.mockClipboardText = options.mockClipboardText || '';
    this.mockActiveWindow = options.mockActiveWindow || {
      title: 'TADASHI LifeOS — Personal Intelligence',
      processName: 'chrome.exe',
      pid: process.pid
    };
  }

  // --- Device Pairing & Authorization Lifecycle (Mark LVI Phase 6) ---

  isPaired() {
    return this.isPairedDevice;
  }

  pair(pairingToken, userId, initialScopes = []) {
    if (!pairingToken || typeof pairingToken !== 'string') {
      return { ok: false, error: 'Pairing token must be a non-empty string' };
    }
    if (!userId || typeof userId !== 'string') {
      return { ok: false, error: 'User ID is required for device pairing' };
    }

    this.isPairedDevice = true;
    this.pairedUserId = userId;
    this.sessionToken = `session_${this.deviceId}_${Date.now()}`;

    // Grant validated initial scopes
    for (const sc of initialScopes) {
      if (SUPPORTED_SCOPES.includes(sc)) {
        this.grantedScopes.add(sc);
      }
    }

    this._recordAudit('device_paired', {
      deviceId: this.deviceId,
      userId,
      scopes: Array.from(this.grantedScopes)
    });

    return {
      ok: true,
      deviceId: this.deviceId,
      pairedUserId: this.pairedUserId,
      grantedScopes: Array.from(this.grantedScopes)
    };
  }

  unpair() {
    this.isPairedDevice = false;
    this.pairedUserId = null;
    this.sessionToken = null;
    this.grantedScopes.clear();
    this.stopHeartbeat();

    this._recordAudit('device_unpaired', { deviceId: this.deviceId });
    return { ok: true, deviceId: this.deviceId };
  }

  grantScope(scope) {
    if (!SUPPORTED_SCOPES.includes(scope)) {
      return {
        ok: false,
        error: `Invalid scope: "${scope}". Must be one of: ${SUPPORTED_SCOPES.join(', ')}`
      };
    }
    this.grantedScopes.add(scope);
    this._recordAudit('scope_granted', { scope });
    return { ok: true, grantedScopes: Array.from(this.grantedScopes) };
  }

  revokeScope(scope) {
    this.grantedScopes.delete(scope);
    this._recordAudit('scope_revoked', { scope });
    return { ok: true, grantedScopes: Array.from(this.grantedScopes) };
  }

  hasScope(scope) {
    return this.grantedScopes.has(scope);
  }

  getGrantedScopes() {
    return Array.from(this.grantedScopes);
  }

  // --- Emergency Stop Control ---

  emergencyStop(reason = 'User initiated emergency stop') {
    this.isEmergencyStopped = true;
    this.stopHeartbeat();
    this._recordAudit('emergency_stop_triggered', { reason, timestamp: new Date().toISOString() });
    return {
      ok: true,
      status: 'emergency_stopped',
      reason
    };
  }

  resumeFromEmergencyStop(confirmation = false) {
    if (!confirmation) {
      return { ok: false, error: 'Confirmation required to resume from emergency stop' };
    }
    this.isEmergencyStopped = false;
    this._recordAudit('emergency_stop_resumed', { timestamp: new Date().toISOString() });
    return {
      ok: true,
      status: 'resumed'
    };
  }

  isStopped() {
    return this.isEmergencyStopped;
  }

  // --- Scoped Device Action Execution (Mark LVI Phase 6) ---

  async executeDeviceAction(actionName, params = {}, options = {}) {
    // 1. Emergency stop check
    if (this.isEmergencyStopped) {
      return {
        outcome: OUTCOME.CANCELLED,
        action: actionName,
        error: 'Operation cancelled: Emergency stop is active on PC Agent.',
        verified: false
      };
    }

    // 2. Device pairing gate: Actions impossible until paired
    if (!this.isPairedDevice) {
      return {
        outcome: OUTCOME.FAILED,
        action: actionName,
        error: 'Security Gate: PC device is not paired with TADASHI.',
        verified: false
      };
    }

    // 3. Map action to required scope
    const actionScopeMap = {
      'get_system_metrics': 'pc.system.read',
      'get_active_window': 'pc.window.read',
      'read_clipboard': 'pc.clipboard.read',
      'stat_workspace_file': 'pc.files.stat'
    };

    const requiredScope = actionScopeMap[actionName];
    if (!requiredScope) {
      return {
        outcome: OUTCOME.FAILED,
        action: actionName,
        error: `Unknown or disallowed device action: "${actionName}". Arbitrary actions are forbidden.`,
        verified: false
      };
    }

    // 4. Permission scope gate
    if (!this.grantedScopes.has(requiredScope)) {
      return {
        outcome: OUTCOME.FAILED,
        action: actionName,
        error: `Permission Denied: Missing required capability scope "${requiredScope}".`,
        verified: false
      };
    }

    // 5. Safe bounded execution (no arbitrary shell / code)
    try {
      let resultData = null;
      let verified = false;

      switch (actionName) {
        case 'get_system_metrics': {
          resultData = this.getSystemInfo();
          verified = Boolean(resultData && resultData.memory && resultData.platform);
          break;
        }

        case 'get_active_window': {
          resultData = {
            title: this.mockActiveWindow.title,
            processName: this.mockActiveWindow.processName,
            pid: this.mockActiveWindow.pid,
            timestamp: new Date().toISOString()
          };
          verified = Boolean(resultData && resultData.title);
          break;
        }

        case 'read_clipboard': {
          if (!options.confirmed) {
            return {
              outcome: OUTCOME.FAILED,
              action: actionName,
              error: 'Clipboard access requires explicit user confirmation.',
              verified: false
            };
          }
          resultData = {
            text: this.mockClipboardText || '',
            charCount: (this.mockClipboardText || '').length
          };
          verified = true;
          break;
        }

        case 'stat_workspace_file': {
          const reqPath = params.filePath;
          if (!reqPath || typeof reqPath !== 'string') {
            return {
              outcome: OUTCOME.FAILED,
              action: actionName,
              error: 'filePath parameter must be a non-empty string.',
              verified: false
            };
          }

          // Resolve absolute path and enforce that it remains within approved workspace boundary
          const resolvedPath = path.resolve(this.approvedWorkspacePath, reqPath);
          const relative = path.relative(this.approvedWorkspacePath, resolvedPath);
          const isOutside = relative.startsWith('..') || path.isAbsolute(relative);

          if (isOutside) {
            return {
              outcome: OUTCOME.FAILED,
              action: actionName,
              error: `Security Gate: Path "${reqPath}" escapes approved workspace sandbox "${this.approvedWorkspacePath}".`,
              verified: false
            };
          }

          if (!fs.existsSync(resolvedPath)) {
            resultData = { exists: false, filePath: reqPath };
            verified = true;
          } else {
            const stat = fs.statSync(resolvedPath);
            resultData = {
              exists: true,
              filePath: reqPath,
              sizeBytes: stat.size,
              isDirectory: stat.isDirectory(),
              modifiedAt: stat.mtime.toISOString()
            };
            verified = true;
          }
          break;
        }
      }

      const outcome = verified ? OUTCOME.VERIFIED_DONE : OUTCOME.UNVERIFIED;
      this._recordAudit(actionName, { outcome, verified, params });

      return {
        outcome,
        action: actionName,
        data: resultData,
        verified
      };
    } catch (err) {
      this._recordAudit(actionName, { outcome: OUTCOME.FAILED, error: err.message, params });
      return {
        outcome: OUTCOME.FAILED,
        action: actionName,
        error: err.message,
        verified: false
      };
    }
  }

  // --- Audit Logging ---

  _recordAudit(event, details) {
    this.auditLog.push({
      event,
      details,
      timestamp: new Date().toISOString()
    });
    if (this.auditLog.length > 100) {
      this.auditLog.shift();
    }
  }

  getAuditLog() {
    return [...this.auditLog];
  }

  // --- Desktop Presence Telemetry ---

  getPresenceStatus() {
    return {
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      paired: this.isPairedDevice,
      pairedUserId: this.pairedUserId,
      connected: this.isConnected,
      emergencyStopped: this.isEmergencyStopped,
      grantedScopes: Array.from(this.grantedScopes),
      uptimeSeconds: process.uptime(),
      localAgentVersion: '1.2.0'
    };
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
          voiceCapabilities: {
            stt: ['web_speech', 'local_whisper'],
            tts: ['web_speech', 'local_piper'],
            textFallback: true
          },
          presence: this.getPresenceStatus(),
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

  // Local Skills Inventory (Mark LVI Phase 4)
  listLocalSkills(installedSkills = []) {
    return (installedSkills || []).map(s => ({
      id: s.id,
      name: s.name,
      version: s.version,
      runtime: s.runtime,
      status: s.status,
      permissions: s.permissions || []
    }));
  }

  // Voice & Audio Capabilities (Mark LVI Phase 5)
  async checkVoiceCapabilities(localVoiceUrl = 'http://127.0.0.1:11435') {
    let whisperAvailable = false;
    let piperAvailable = false;

    try {
      const res = await fetch(`${localVoiceUrl}/health`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        whisperAvailable = Boolean(data.whisper);
        piperAvailable = Boolean(data.piper);
      }
    } catch (e) {
      // Local voice server not running; text fallback active
    }

    return {
      stt: {
        webSpeech: true,
        localWhisper: whisperAvailable
      },
      tts: {
        webSpeech: true,
        localPiper: piperAvailable
      },
      textOnlyFallback: true
    };
  }
}

PCAgent.SUPPORTED_SCOPES = SUPPORTED_SCOPES;
PCAgent.OUTCOME = OUTCOME;

module.exports = {
  PCAgent,
  SUPPORTED_SCOPES,
  OUTCOME
};
