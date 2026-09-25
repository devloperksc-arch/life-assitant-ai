// Settings Page
Router.register('settings', () => {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="page-header"><div><div class="page-title">⚙️ Settings</div><div class="page-subtitle">Profile, preferences, AI behavior and permissions</div></div></div>
    <!-- Profile -->
    <div class="card" style="margin-bottom:20px;padding:20px">
      <div style="display:flex;align-items:center;gap:16px">
        <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--accent-violet),var(--accent-cyan));display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#fff;box-shadow:var(--glow-violet)">${DATA.user.initials}</div>
        <div>
          <div style="font-size:18px;font-weight:800">${DATA.user.name}</div>
          <div style="font-size:12px;color:var(--text-muted)">LifeOS User · ${DATA.user.timezone}</div>
          <div style="font-size:12px;color:var(--accent-cyan);margin-top:4px">Life Score: ${DATA.user.lifeScore}/100</div>
        </div>
        <button class="btn btn-secondary" style="margin-left:auto">Edit Profile</button>
      </div>
    </div>

    <div class="grid-2">
      <!-- TADASHI AI Settings -->
      <div>
        <div class="settings-section">
          <div class="settings-section-title">🔑 TADASHI AI Connection</div>
          <div class="card" style="padding:16px;margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <span style="font-size:13px;font-weight:700">Gemini API Key</span>
              <span id="gemini-conn-badge" class="badge ${AI.hasKey() ? 'badge-green' : 'badge-amber'}">${AI.hasKey() ? 'Connected' : 'Not connected'}</span>
            </div>
            <div style="font-size:11px;color:var(--text-muted);line-height:1.5;margin-bottom:12px">
              Connect Google's Gemini LLM to give TADASHI genuine conversational intelligence, deep life reasoning, and proactive replanning.
              Get a free API key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style="color:var(--accent-cyan);font-weight:600">aistudio.google.com/apikey ↗</a>.
              Your key is saved locally in your browser (localStorage) and never transmitted to third parties.
            </div>
            <div class="form-group" style="margin-bottom:10px">
              <label class="form-label" style="display:flex;justify-content:space-between;align-items:center">
                <span>Gemini API Key</span>
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style="color:var(--accent-cyan);font-size:11px">Get Free Key ↗</a>
              </label>
              <div style="display:flex;gap:6px">
                <input type="password" class="form-input" id="gemini-key-input" style="flex:1" placeholder="${AI.hasKey() ? '•••••••••••••••••••••••••••• (Saved in browser)' : 'AIzaSy... (Paste Gemini API key here)'}">
                <button class="btn btn-secondary btn-sm" type="button" onclick="toggleGeminiKeyVisibility()" title="Toggle visibility" id="gemini-eye-btn">👁️</button>
              </div>
            </div>
            <div class="form-group" style="margin-bottom:12px">
              <label class="form-label">Gemini Model</label>
              <select class="form-input" id="gemini-model-select" onchange="onGeminiModelChange(this.value)" style="background:var(--bg-elevated);color:var(--text-primary)">
                ${AI.MODELS.map(m => `<option value="${m.id}" ${AI.getModel() === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
                <option value="custom" ${!AI.MODELS.some(m => m.id === AI.getModel()) ? 'selected' : ''}>Custom Model ID...</option>
              </select>
              <input type="text" class="form-input" id="gemini-model-custom" placeholder="e.g. gemini-1.5-flash-8b" value="${!AI.MODELS.some(m => m.id === AI.getModel()) ? AI.getModel() : ''}" style="margin-top:6px;display:${!AI.MODELS.some(m => m.id === AI.getModel()) ? 'block' : 'none'}">
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-primary btn-sm" onclick="saveGeminiSettings()">💾 Save Key & Model</button>
              <button class="btn btn-secondary btn-sm" onclick="testGeminiSettings()">🔌 Test Connection</button>
              <button class="btn btn-danger btn-sm" id="gemini-remove-btn" onclick="removeGeminiSettings()" style="${AI.hasKey() ? '' : 'display:none'}">🗑 Remove Key</button>
            </div>
            <div id="gemini-status-msg" style="font-size:11px;margin-top:10px;line-height:1.4"></div>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">🎙️ Voice & Audio Settings</div>
          <div class="card" style="padding:16px;margin-bottom:8px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
              <div>
                <div style="font-size:13px;font-weight:700">Auto-Speak Replies</div>
                <div style="font-size:11px;color:var(--text-muted)">Read TADASHI's replies aloud automatically with speech synthesis</div>
              </div>
              <div class="toggle ${Voice.isVoiceOutputEnabled() ? 'on' : ''}" id="settings-voice-toggle" onclick="this.classList.toggle('on'); Voice.setVoiceOutputEnabled(this.classList.contains('on'))"></div>
            </div>
            <div class="form-group" style="margin-bottom:12px">
              <label class="form-label" style="display:flex;justify-content:space-between">
                <span>Speech Speed</span>
                <span id="voice-speed-val">${Voice.getSpeed()}x</span>
              </label>
              <input type="range" min="0.8" max="1.3" step="0.05" value="${Voice.getSpeed()}" style="width:100%;accent-color:var(--accent-cyan)" oninput="document.getElementById('voice-speed-val').textContent = this.value + 'x'; Voice.setSpeed(parseFloat(this.value))">
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-secondary btn-sm" onclick="Voice.speak('Hello! I am TADASHI, your personal life intelligence assistant. All voice links are fully operational.')">🔊 Test TADASHI Voice</button>
              <button class="btn btn-secondary btn-sm" onclick="Voice.stopSpeaking()">⏹ Stop</button>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">🧠 TADASHI AI</div>
          ${[
            {icon:'🔄', title:'Autonomy Mode', desc:'Current: Suggestion mode (TADASHI proposes, you approve)', action:'Change'},
            {icon:'💾', title:'Memory System', desc:'Short-term, episodic and preference memory active', action:'Manage'},
            {icon:'🔮', title:'Proactive Briefings', desc:'Morning briefing at 7 AM daily', action:'Configure'},
            {icon:'⚡', title:'Event Detection', desc:'TADASHI monitors for risks and opportunities', action:''},
          ].map(s=>`
            <div class="settings-item">
              <div class="settings-item-icon" style="background:rgba(0,212,255,0.1)">${s.icon}</div>
              <div class="settings-item-info"><div class="settings-item-title">${s.title}</div><div class="settings-item-desc">${s.desc}</div></div>
              ${s.action?`<button class="btn btn-secondary btn-sm">${s.action}</button>`:
              `<div class="toggle on" onclick="this.classList.toggle('on')"></div>`}
            </div>
          `).join('')}
        </div>

        <div class="settings-section">
          <div class="settings-section-title">🔔 Notifications</div>
          ${[
            {icon:'⏰', title:'Reminders', desc:'Task deadlines, bills, birthdays', toggle:true},
            {icon:'⚠️', title:'Risk Alerts', desc:'Conflicts, overload, approaching deadlines', toggle:true},
            {icon:'📋', title:'Daily Briefing', desc:'Morning summary at 7 AM', toggle:true},
            {icon:'🔄', title:'Replan Approvals', desc:'Notify when TADASHI proposes changes', toggle:true},
          ].map(s=>`
            <div class="settings-item">
              <div class="settings-item-icon" style="background:rgba(245,158,11,0.1)">${s.icon}</div>
              <div class="settings-item-info"><div class="settings-item-title">${s.title}</div><div class="settings-item-desc">${s.desc}</div></div>
              <div class="toggle on" onclick="this.classList.toggle('on')"></div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Privacy + Modules -->
      <div>
        <div class="settings-section">
          <div class="settings-section-title">🔒 Privacy & Security</div>
          ${[
            {icon:'🛡️', title:'TADASHI Data Access', desc:'Manage which modules TADASHI can read', action:'Manage'},
            {icon:'🗑️', title:'Clear Memory', desc:'Delete all TADASHI learned patterns and preferences', action:'Clear', danger:true},
            {icon:'📋', title:'Audit Log', desc:'View all AI actions and changes', action:'View'},
            {icon:'🔑', title:'Change Password', desc:'Update your account password', action:'Change'},
          ].map(s=>`
            <div class="settings-item" style="${s.danger?'border-color:rgba(239,68,68,0.2)':''}">
              <div class="settings-item-icon" style="background:rgba(${s.danger?'239,68,68':'124,58,237'},0.1)">${s.icon}</div>
              <div class="settings-item-info"><div class="settings-item-title" style="${s.danger?'color:var(--accent-red)':''}">${s.title}</div><div class="settings-item-desc">${s.desc}</div></div>
              <button class="btn ${s.danger?'btn-danger':'btn-secondary'} btn-sm">${s.action}</button>
            </div>
          `).join('')}
        </div>

        <div class="settings-section">
          <div class="settings-section-title">🎨 Appearance</div>
          <div class="settings-item">
            <div class="settings-item-icon" style="background:rgba(0,212,255,0.1)">🌙</div>
            <div class="settings-item-info"><div class="settings-item-title">Dark Mode</div><div class="settings-item-desc">Currently: Dark (Glassmorphism)</div></div>
            <div class="toggle on"></div>
          </div>
          <div class="settings-item">
            <div class="settings-item-icon" style="background:rgba(124,58,237,0.15)">🎨</div>
            <div class="settings-item-info"><div class="settings-item-title">Accent Color</div><div class="settings-item-desc">Cyan + Violet (default)</div></div>
            <div style="display:flex;gap:6px">
              ${['#00d4ff','#7c3aed','#10b981','#f59e0b','#ec4899'].map(c=>`<div style="width:20px;height:20px;border-radius:50%;background:${c};cursor:pointer;border:2px solid ${c==='#00d4ff'?'#fff':'transparent'}" onclick="document.documentElement.style.setProperty('--accent-cyan',this.style.background)"></div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- App info -->
    <div class="card" style="margin-top:4px;padding:16px;text-align:center">
      <div style="font-size:14px;font-weight:700;background:linear-gradient(135deg,var(--accent-cyan),var(--accent-violet-bright));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">TADASHI — LifeOS v1.0</div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Total AI for Dynamic Assistance, Scheduling and Human Intelligence</div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:2px">Built by Krishna Singh Chouhan · Academic Final Project 2026</div>
    </div>
  `;
  return el;
});

function _geminiStatus(msg, color) {
  const el = document.getElementById('gemini-status-msg');
  if (el) { el.innerHTML = msg; el.style.color = color || 'var(--text-muted)'; }
}

function toggleGeminiKeyVisibility() {
  const input = document.getElementById('gemini-key-input');
  const btn = document.getElementById('gemini-eye-btn');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (btn) btn.textContent = '🙈';
  } else {
    input.type = 'password';
    if (btn) btn.textContent = '👁️';
  }
}

function onGeminiModelChange(val) {
  const customInput = document.getElementById('gemini-model-custom');
  if (customInput) {
    customInput.style.display = val === 'custom' ? 'block' : 'none';
    if (val === 'custom') customInput.focus();
  }
}

function saveGeminiSettings() {
  const keyInput = document.getElementById('gemini-key-input');
  const modelSelect = document.getElementById('gemini-model-select');
  const customInput = document.getElementById('gemini-model-custom');

  const key = keyInput?.value?.trim();
  let model = modelSelect?.value;
  if (model === 'custom') {
    model = customInput?.value?.trim() || AI.DEFAULT_MODEL;
  }

  if (model) AI.setModel(model);

  if (key) {
    AI.setKey(key);
    _geminiStatus('✅ Saved! Key & Model connected. Try chatting with TADASHI.', 'var(--accent-green)');
  } else if (!AI.hasKey()) {
    _geminiStatus('⚠️ Please paste your Gemini API key before saving.', 'var(--accent-amber)');
    return;
  } else {
    _geminiStatus(`✅ Model preference (${model}) updated (existing key retained).`, 'var(--accent-green)');
  }

  const badge = document.getElementById('gemini-conn-badge');
  if (badge) { badge.textContent = 'Connected'; badge.className = 'badge badge-green'; }
  const removeBtn = document.getElementById('gemini-remove-btn');
  if (removeBtn) removeBtn.style.display = '';
  if (keyInput) { keyInput.value = ''; keyInput.placeholder = '•••••••••••••••••••••••••••• (Saved in browser)'; }
}

async function testGeminiSettings() {
  const keyInput = document.getElementById('gemini-key-input');
  const modelSelect = document.getElementById('gemini-model-select');
  const customInput = document.getElementById('gemini-model-custom');

  const key = keyInput?.value?.trim() || AI.getKey();
  let model = modelSelect?.value || AI.getModel();
  if (model === 'custom') {
    model = customInput?.value?.trim() || AI.DEFAULT_MODEL;
  }

  if (!key) {
    _geminiStatus('⚠️ Enter or paste your Gemini API key to test.', 'var(--accent-amber)');
    return;
  }

  _geminiStatus('⏳ Connecting to Google Gemini API...', 'var(--text-muted)');
  try {
    await AI.testKey(key, model);
    _geminiStatus(`✅ Connection successful! Model <strong>${model}</strong> is responsive. Click Save to activate.`, 'var(--accent-green)');
  } catch (err) {
    _geminiStatus(`❌ ${err.message}`, 'var(--accent-red)');
  }
}

function removeGeminiSettings() {
  AI.clearKey();
  AI.setModel('');
  _geminiStatus('Key removed. TADASHI chat is back to Local mode.', 'var(--text-muted)');
  const badge = document.getElementById('gemini-conn-badge');
  if (badge) { badge.textContent = 'Not connected'; badge.className = 'badge badge-amber'; }
  const keyInput = document.getElementById('gemini-key-input');
  if (keyInput) keyInput.placeholder = 'AIzaSy... (Paste Gemini API key here)';
  const removeBtn = document.getElementById('gemini-remove-btn');
  if (removeBtn) removeBtn.style.display = 'none';
}
