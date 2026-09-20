// ============================================================
// TADASHI Chat Page
// ============================================================

let chatMessages = [...DATA.tadashiMessages];

Router.register('tadashi', () => {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex;flex-direction:column;height:calc(100vh - 60px - 48px)';

  el.innerHTML = `
    <!-- TADASHI Header -->
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border-subtle)">
      <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--accent-cyan),var(--accent-violet));display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:var(--glow-cyan)">🧠</div>
      <div style="flex:1">
        <div style="font-size:18px;font-weight:800;background:linear-gradient(135deg,var(--accent-cyan),var(--accent-violet-bright));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">TADASHI</div>
        <div style="font-size:12px;color:var(--text-muted)">Total AI for Dynamic Assistance, Scheduling and Human Intelligence</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="status-dot green"></div>
        <span style="font-size:11px;color:var(--accent-green);font-weight:600">Active</span>
        <span style="font-size:10px;color:var(--text-muted)">• Life State loaded • ${DATA.tasks.filter(t=>t.status!=='done').length} tasks • ${DATA.calendarEvents.length} events</span>
        ${AI.hasKey()
          ? `<span class="badge badge-green" style="margin-left:4px" title="${AI.getModel()}">🤖 Gemini connected</span>`
          : `<span class="badge badge-amber" style="margin-left:4px;cursor:pointer" onclick="Router.navigate('settings')" title="Click to connect a free Gemini API key">⚡ Local mode — connect AI</span>`}
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <button id="tadashi-voice-toggle-btn" class="btn btn-secondary btn-sm" onclick="toggleVoiceOutputMode()" title="Toggle voice audio output">
          ${Voice.isVoiceOutputEnabled() ? '🔊 Voice ON' : '🔇 Voice OFF'}
        </button>
        <button class="btn btn-primary btn-sm" onclick="openVoiceCallModal()" title="Start hands-free voice call with TADASHI" style="background:linear-gradient(135deg,var(--accent-cyan),var(--accent-violet));border:none">
          📞 Live Talk
        </button>
        <button class="btn btn-secondary btn-sm" onclick="clearChat()">Clear</button>
        <button class="btn btn-secondary btn-sm" onclick="tadashiBriefing()">📋 Briefing</button>
      </div>
    </div>

    <!-- Chat Area -->
    <div id="chat-messages" class="chat-messages" style="flex:1">
      <!-- Messages rendered by renderChatMessages() -->
    </div>

    <!-- Input Area -->
    <div class="chat-input-area">
      <div class="chat-quick-cmds">
        ${['Plan tomorrow','Fix my week 🔄','What should I do now?','Show my risks','I skipped gym today','Study plan for OS exam','What if I start gym at 6 AM?','Show commitment debt'].map(cmd =>
          `<button class="chat-quick-cmd" onclick="processTADASHICommand('${cmd}')">${cmd}</button>`
        ).join('')}
      </div>
      <div id="tadashi-listening-banner" style="display:none" class="chat-listening-banner">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="status-dot red" style="animation:micPulse 1s infinite"></span>
          <span id="tadashi-listening-text">Listening... Speak now</span>
        </div>
        <button onclick="toggleTADASHIMic()" style="background:none;border:none;color:#ffaaaa;cursor:pointer;font-size:11px;font-weight:600">Cancel ✕</button>
      </div>
      <div class="chat-input-wrapper">
        <textarea id="tadashi-input" placeholder="Ask TADASHI anything, or click the mic to speak..." rows="1"></textarea>
        <button id="tadashi-mic-btn" class="chat-mic-btn" onclick="toggleTADASHIMic()" title="Talk to TADASHI (Voice Input)">🎙️</button>
        <button class="chat-send-btn" onclick="sendTADASHIMessage()" title="Send">➤</button>
      </div>
      <div style="font-size:10px;color:var(--text-muted);text-align:center">TADASHI Voice Link Active • Tap 🎙️ to talk or 📞 for Hands-free Voice Call</div>
    </div>
  `;

  setTimeout(() => {
    renderChatMessages();
    const input = document.getElementById('tadashi-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTADASHIMessage(); }
      });
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 100) + 'px';
      });
    }
  }, 50);

  return el;
});

function renderChatMessages() {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  container.innerHTML = chatMessages.map((msg, idx) => `
    <div class="chat-msg ${msg.role}">
      <div class="chat-avatar ${msg.role==='tadashi'?'tadashi-av':'user-av'}">${msg.role==='tadashi'?'🧠':DATA.user.initials}</div>
      <div>
        <div class="chat-bubble">${Utils.md(msg.content)}</div>
        ${msg.action ? renderActionCard(msg.action) : ''}
        <div style="font-size:10px;color:var(--text-muted);margin-top:4px;padding:0 4px;display:flex;align-items:center;justify-content:space-between">
          <span>${msg.time||''}</span>
          ${msg.role === 'tadashi' ? `
            <button class="chat-speak-btn" id="msg-speak-btn-${idx}" onclick="toggleSpeakMessage(this, ${idx})" title="Listen to TADASHI speak this">
              🔊 Listen
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
  container.scrollTop = container.scrollHeight;
}

function renderActionCard(action) {
  return `
    <div class="action-card">
      <div class="action-card-header">
        <span>🔄</span>
        <span class="action-card-title">${action.title}</span>
        <span class="badge badge-${action.confidence==='High'?'green':action.confidence==='Medium'?'amber':'red'}">${action.confidence} confidence</span>
      </div>
      <div class="action-card-body">${action.reason}</div>
      ${action.changes ? `
        <div class="action-card-changes">
          ${action.changes.map(c => `
            <div class="action-change">
              <div class="action-change-icon">${c.icon}</div>
              <span>${c.text}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;padding:8px;background:rgba(0,0,0,0.2);border-radius:var(--radius-sm)">
        <strong style="color:var(--accent-amber)">Trade-offs:</strong> ${action.tradeoffs}
      </div>
      <div class="action-card-actions">
        <button class="action-approve" onclick="approveAction(this)">✓ Approve</button>
        <button class="action-edit" onclick="editAction(this)">✏ Edit</button>
        <button class="action-reject" onclick="rejectAction(this)">✕ Reject</button>
      </div>
    </div>
  `;
}

function approveAction(btn) {
  const card = btn.closest('.action-card');
  card.innerHTML = `<div style="padding:8px;text-align:center;color:var(--accent-green);font-size:13px;font-weight:600">✓ Changes applied successfully</div>`;
}
function rejectAction(btn) {
  const card = btn.closest('.action-card');
  card.innerHTML = `<div style="padding:8px;text-align:center;color:var(--text-muted);font-size:13px">Action rejected.</div>`;
}
function editAction(btn) {
  btn.closest('.action-card').querySelector('.action-card-actions').innerHTML +=
    `<div style="margin-top:8px;width:100%"><textarea style="width:100%;background:var(--bg-elevated);border:1px solid var(--border-glass);border-radius:var(--radius-md);padding:8px;color:var(--text-primary);font-size:12px;font-family:var(--font-sans)" rows="2" placeholder="Describe your changes..."></textarea><div style="display:flex;gap:6px;margin-top:6px"><button class="action-approve btn-sm" onclick="approveAction(this)">Apply</button><button class="action-reject btn-sm" onclick="rejectAction(this)">Cancel</button></div></div>`;
}

function sendTADASHIMessage() {
  const input = document.getElementById('tadashi-input');
  const text = input?.value?.trim();
  if (!text) return;
  input.value = '';
  input.style.height = 'auto';
  processTADASHICommand(text);
}

function processTADASHICommand(cmd) {
  // Ensure we're on TADASHI page
  if (Router.getCurrent() !== 'tadashi') { Router.navigate('tadashi'); setTimeout(() => processTADASHICommand(cmd), 300); return; }

  const time = Utils.timeNow();
  chatMessages.push({ role:'user', content: cmd, time });
  renderChatMessages();

  // Show typing
  const container = document.getElementById('chat-messages');
  if (container) {
    const typingEl = document.createElement('div');
    typingEl.className = 'chat-msg tadashi';
    typingEl.id = 'typing-indicator';
    typingEl.innerHTML = `
      <div class="chat-avatar tadashi-av">🧠</div>
      <div class="chat-bubble">
        <div class="typing-indicator">
          <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
        </div>
      </div>
    `;
    container.appendChild(typingEl);
    container.scrollTop = container.scrollHeight;
  }

  const minDelay = new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

  Promise.all([generateTADASHIResponse(cmd), minDelay]).then(([response]) => {
    document.getElementById('typing-indicator')?.remove();
    chatMessages.push({ role:'tadashi', ...response, time: Utils.timeNow() });
    renderChatMessages();

    // Auto-speak response if Voice Output is enabled and voice call modal isn't active
    if (Voice.isVoiceOutputEnabled() && !voiceCallActive && response && response.content) {
      Voice.speak(response.content);
    }
  });
}

// NOTE: async — the specific quick-command branches below resolve instantly,
// but anything that falls through to Gemini needs to await a network call.
async function generateTADASHIResponse(cmd) {
  const lower = cmd.toLowerCase();

  if (lower.includes('plan tomorrow') || lower.includes('tomorrow')) {
    return {
      content: `📅 **Planning your tomorrow (${Utils.formatDate(Utils.today())})**\n\nBased on your Life State, here's an optimized plan:\n\n**06:30** Wake up + morning routine\n**09:00** CS101 Lecture\n**11:00** DBMS Lab\n**13:00** Lunch + break\n**14:00** OS Assignment work (2 hrs)\n**16:00** Break\n**17:30** Gym — Push Day\n**19:30** Dinner\n**20:00** Study session — DBMS Chapter 5 (2 hrs)\n**22:00** Mom's birthday call\n**23:00** Sleep\n\n**Estimated free time:** 1.5 hours\n**Study hours:** 4 hours\n**Fitness:** ✅ Scheduled`,
      action: {
        title: 'Block tomorrow\'s schedule',
        reason: 'TADASHI analyzed your calendar, tasks, and energy patterns. Morning lectures are fixed. Gym placed at your typical time. Study block uses your productive evening window.',
        confidence: 'High',
        changes: [
          {icon:'📅', text:'Add study block: 14:00–16:00 OS Assignment'},
          {icon:'📅', text:'Add study block: 20:00–22:00 DBMS Chapter 5'},
          {icon:'💪', text:'Confirm gym session at 17:30'},
        ],
        tradeoffs: 'No free screen time. Social activities not possible. Energy may be low by 20:00 — consider shorter session if needed.'
      }
    };
  }

  if (lower.includes('fix my week') || lower.includes('fix week')) {
    return {
      content: `🔄 **Week Replan Analysis**\n\nI've analyzed your Life Graph and detected these issues:\n\n**Risks detected:**\n⚠️ OS Exam Sep 26 — need 8+ more study hours\n⚠️ DBMS behind — only 42% done\n⚠️ Assignment due Sep 22\n\n**Available windows found:**\n• Today 20:00–22:00 (2 hrs)\n• Tomorrow 14:00–16:00 (2 hrs)\n• Sat 09:00–13:00 (4 hrs)\n• Sun 10:00–14:00 (4 hrs)\n\n**Proposed replan:** 8 schedule changes`,
      action: {
        title: 'Fix My Week — 8 changes',
        reason: 'Priority: OS exam prep. I ranked commitments by urgency × goal impact. Gym kept at 4x/week (dropping to 3x). Entertainment blocked until assignment done.',
        confidence: 'High',
        changes: [
          {icon:'📅', text:'Add: OS study block today 20:00–22:00'},
          {icon:'📅', text:'Add: OS study block Sep 21 14:00–16:00'},
          {icon:'📅', text:'Add: DBMS intensive Sep 21 09:00–13:00'},
          {icon:'📅', text:'Add: DBMS intensive Sep 22 10:00–13:00'},
          {icon:'📅', text:'Add: OS assignment sprint Sep 21 17:00–19:00'},
          {icon:'⏰', text:'Set reminder: Assignment due Sep 22'},
          {icon:'🎭', text:'Defer: Entertainment blocked until Sep 23'},
          {icon:'💪', text:'Reduce gym to 4x this week (was 5x)'},
        ],
        tradeoffs: 'Gym reduced by 1 session. No free evenings Mon–Wed. Saturday morning fully booked. Sleep not compromised.'
      }
    };
  }

  if (lower.includes('right now') || lower.includes('what should i do')) {
    return {
      content: `⚡ **Right now, TADASHI recommends:**\n\n**Immediate action:** Start the OS Assignment\n\n**Why?** It's due in 3 days and you need ~4 more hours. You have 2 free hours right now before your gym session.\n\n**Sequence:**\n1. 🕐 Now → Work on OS Assignment (2 hrs)\n2. 💪 17:30 → Gym — Push Day\n3. 📚 20:00 → Quick DBMS revision (1 hr)\n4. 🎂 21:00 → Call mom (her birthday!)\n\nEnergy score: ${DATA.user.energyScore}% — good for focused work right now.`
    };
  }

  if (lower.includes('risk') || lower.includes('falling behind')) {
    return {
      content: `⚠️ **Current Commitment Debt Analysis**\n\n**Critical:**\n🔴 OS Exam (Sep 26) — 42% syllabus done, 6 days left\n🔴 OS Assignment — 0% done, 3 days left\n\n**Warning:**\n🟡 DBMS Exam (Sep 29) — 42% done, 10 days left\n🟡 Bathroom cleaning — 6 days overdue\n\n**On track:**\n✅ Fitness — 4/5 sessions this week\n✅ Savings goal — 72% complete\n✅ Finance budget — within limits\n\n**Commitment debt score:** 4.2/10 (Moderate)\nIf nothing changes, OS exam is at risk. Want me to create a recovery plan?`
    };
  }

  if (lower.includes('skipped gym') || lower.includes('skip gym') || lower.includes('missed gym')) {
    return {
      content: `💪 **Gym skip detected — impact analysis:**\n\n**Current:** 4-day streak → would break\n**Weekly goal:** 5 sessions — now need to make up\n\n**Options:**\n1. **Make up tomorrow morning** (6:00–7:00 AM) — protects streak\n2. **Move to Saturday** — weekly goal still achievable (4/5 acceptable)\n3. **Skip this week** — streak broken, weekly goal missed\n\n**My recommendation:** Option 1 — tomorrow 6:30 AM quick session (45 min). You have class at 9:00 AM, so it fits.`,
      action: {
        title: 'Schedule makeup gym session',
        reason: 'Streak protection is high value for consistency goals. Morning session minimizes schedule disruption.',
        confidence: 'High',
        changes: [
          {icon:'💪', text:'Add: Gym makeup session Sep 21, 06:30–07:15'},
          {icon:'⏰', text:'Set alarm reminder Sep 21 at 06:15'},
        ],
        tradeoffs: 'Wake up 30 min earlier. Morning routine shortened to 15 min. Minor.'
      }
    };
  }

  if (lower.includes('study plan') || lower.includes('exam')) {
    return {
      content: `📚 **OS Exam Study Plan (Sep 26)**\n\nCurrent: 58% done • 6 days left • Need: ~8 hrs more\n\n**Remaining topics:**\n📖 File Systems (3 hrs)\n📖 Deadlocks (2 hrs)\n📖 I/O Systems (2 hrs)\n📖 Past papers (1 hr)\n\n**Proposed schedule:**\nToday: File Systems (1.5 hrs)\nSep 21: File Systems finish + Deadlocks (3 hrs)\nSep 22: I/O Systems (2 hrs)\nSep 23: Full revision (2 hrs)\nSep 24: Past papers (1.5 hrs)\nSep 25: Rest + quick revision\nSep 26: Exam day 🎯`
    };
  }

  if (lower.includes('what if') || lower.includes('6 am') || lower.includes('6am')) {
    return {
      content: `🔮 **What-If Simulation: Gym at 6 AM**\n\n*This is a simulation — no changes made*\n\n**Baseline:** Gym at 5:30 PM, sleep 11 PM, wake 6:30 AM\n\n**Scenario:** Gym at 6 AM\n\n**Impact analysis:**\n• Wake time shifts to 5:30 AM (-1 hr sleep unless bed earlier)\n• Breakfast moved to 7:30 AM\n• Evenings freed: +2 hrs (17:30–19:30)\n• Evening study capacity: ↑ significantly\n• Sleep adjustment needed: 10 PM bed (current: 11 PM)\n\n**Positive effects:**\n✅ +2 hrs evening free time\n✅ Better alignment with morning energy\n✅ Evenings available for study/social\n\n**Negative effects:**\n❌ Need 30 min earlier bedtime\n❌ Fasted workout (needs pre-workout nutrition adjustment)\n❌ Higher willpower requirement early\n\n**Verdict:** Feasible. Recommend trying for 1 week. Want to apply this scenario?`,
      action: {
        title: 'Apply 6 AM gym scenario',
        reason: 'Simulation shows net positive: +2 hrs evening capacity, better study time. Key requirement: 10 PM bedtime.',
        confidence: 'Medium',
        changes: [
          {icon:'💪', text:'Shift all gym sessions to 06:00–07:00'},
          {icon:'🌅', text:'Update morning routine: wake 05:30'},
          {icon:'🌙', text:'Update night routine: target sleep 22:00'},
        ],
        tradeoffs: '30 min less morning sleep. Requires strict 10 PM bedtime. Fasted training — ensure pre-workout snack. Applies from tomorrow.'
      }
    };
  }

  if (lower.includes('budget') || lower.includes('spending') || lower.includes('finance')) {
    return {
      content: `💰 **Finance Status**\n\n**Balance:** ₹${Utils.fmt(DATA.finance.balance)}\n**This month:** +₹${Utils.fmt(DATA.finance.monthlyIncome)} income, -₹${Utils.fmt(DATA.finance.monthlyExpenses)} expenses\n\n**Budget status (Day 19/30):**\n🟢 Shopping: ₹840/₹1,500 (56%) — On track\n🟡 Food: ₹1,240/₹2,000 (62%) — Slightly high\n🟢 Transport: ₹320/₹600 (53%) — On track\n🟠 Entertainment: ₹399/₹500 (80%) — Near limit\n\n**Savings:** ₹${Utils.fmt(DATA.finance.savings)}/₹50,000 (72%) ✅\n\n**Recommendation:** Avoid eating out this week. Entertainment budget almost exhausted — skip Netflix this cycle.`
    };
  }

  if (lower.includes('briefing') || lower.includes('morning')) {
    return {
      content: `🌅 **TADASHI Daily Briefing**\n\n**Date:** ${Utils.dateNow()}\n**Life Score:** ${DATA.user.lifeScore}/100 (↑3 from yesterday)\n\n**Today's schedule:** ${DATA.calendarEvents.filter(e=>e.date===Utils.today()).length} events, 2.5 hrs free\n\n**Top 3 priorities:**\n1. 📚 OS Assignment — needs 4 hrs, due in 3 days\n2. 💪 Gym — Push Day at 5:30 PM\n3. 🎂 Call Mom — her birthday today\n\n**Risks to watch:**\n⚠️ OS exam prep falling behind\n⚠️ Entertainment budget at 80%\n\n**Financial:** On track. Savings at 72%.\n**Fitness:** 4-day streak 🔥 Don't break it!\n**Study:** OS exam in 6 days — focus needed.\n\nHave a productive day, Krishna! 🚀`
    };
  }

  if (lower.includes('commitment debt')) {
    return {
      content: `📊 **Commitment Debt Report**\n\n**Total debt score: 4.2/10** (Moderate — action needed)\n\n**Breakdown:**\n\n🔴 **Study debt:**\n• OS topics postponed 2x\n• DBMS revision delayed 3 days\n• Score: 6.8/10\n\n🟡 **Home debt:**\n• Bathroom cleaning: 6 days overdue\n• Room deep-clean: 8 days overdue\n• Score: 4.5/10\n\n🟢 **Fitness:** No debt (streak active)\n🟢 **Finance:** No debt (bills paid)\n\n**Recovery plan available.** Want me to create a recovery schedule?`
    };
  }

  // Nothing matched one of TADASHI's built-in commands above — this is the
  // part that used to just echo the message back. Now it either asks Gemini
  // (if connected) or, failing that, at least handles basic small talk
  // locally so a plain "hi" doesn't fall into a canned non-answer.
  return await generateOpenEndedResponse(cmd);
}

// Cheap local pattern match for small talk — works even with zero AI connected,
// so greetings/thanks/goodbyes always feel human even before you set up Gemini.
function matchSmallTalk(lower) {
  const trimmed = lower.trim().replace(/[!.?]+$/, '');
  const name = DATA.user.name.split(' ')[0];
  const pendingCount = DATA.tasks.filter(t => t.status !== 'done').length;

  if (/^(hi|hello|hey|hey there|yo|sup|hiya|good morning|good evening|good afternoon)$/.test(trimmed)) {
    return { content: `Hey ${name}! 👋 I'm here — ${pendingCount} tasks pending and your energy score is ${DATA.user.energyScore}%. What do you want to tackle?` };
  }
  if (/(thanks|thank you|thx|ty)\b/.test(trimmed)) {
    return { content: `Anytime! 🙌 I'll keep watching your Life State — just ask if anything changes.` };
  }
  if (/^(bye|goodbye|see you|later|gtg|cya)$/.test(trimmed)) {
    return { content: `Catch you later, ${name}! I'll keep an eye on your schedule and risks. 👋` };
  }
  if (/how are you|how's it going|hows it going|what's up|whats up/.test(trimmed)) {
    return { content: `Running smoothly! Your Life Score is ${DATA.user.lifeScore}/100 right now. More importantly — how are *you* doing today?` };
  }
  return null;
}

async function generateOpenEndedResponse(cmd) {
  const lower = cmd.toLowerCase();
  const smalltalk = matchSmallTalk(lower);

  if (AI.hasKey()) {
    try {
      const text = await AI.chat(cmd, chatMessages);
      return { content: text };
    } catch (err) {
      return {
        content: `⚠️ Couldn't reach Gemini: **${err.message}**\n\n${smalltalk ? smalltalk.content + '\n\n' : ''}Double-check your API key in **Settings → TADASHI AI Connection**.`
      };
    }
  }

  if (smalltalk) return smalltalk;

  // No AI connected and not recognizable small talk — be honest about it
  // instead of pretending to understand, and point at the actual fix.
  return {
    content: `I don't have a real AI brain connected yet, so I can only run the commands below in **Local mode**:\n\n${['Plan tomorrow','Fix my week','What should I do now?','Show my risks','Study plan for OS exam','Show commitment debt'].map(c=>`• ${c}`).join('\n')}\n\n💡 Click **"⚡ Local mode — connect AI"** above (or go to **Settings**) and add a free Gemini API key — then I'll actually understand anything you type, including **"${cmd}"**.`
  };
}

function clearChat() {
  chatMessages = [];
  renderChatMessages();
}

function tadashiBriefing() {
  processTADASHICommand('Give me my morning briefing');
}

// ============================================================
// TADASHI Voice Interaction & Live Call System
// ============================================================

let voiceCallActive = false;
let voiceCallMuted = false;

function toggleVoiceOutputMode() {
  const current = Voice.isVoiceOutputEnabled();
  Voice.setVoiceOutputEnabled(!current);
  const btn = document.getElementById('tadashi-voice-toggle-btn');
  if (btn) {
    btn.innerHTML = !current ? '🔊 Voice ON' : '🔇 Voice OFF';
  }
  if (current) {
    Voice.stopSpeaking();
  } else {
    Voice.speak('Voice output enabled. Ready when you are.');
  }
}

function toggleTADASHIMic() {
  if (Voice.isListening()) {
    Voice.stopListening();
    return;
  }

  const micBtn = document.getElementById('tadashi-mic-btn');
  const banner = document.getElementById('tadashi-listening-banner');
  const input = document.getElementById('tadashi-input');

  const ok = Voice.startListening({
    onInterim: (interim) => {
      if (input) {
        input.value = interim;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 100) + 'px';
      }
    },
    onResult: (finalText) => {
      if (input) {
        input.value = finalText;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 100) + 'px';
      }
      sendTADASHIMessage();
    },
    onError: (err) => {
      if (banner) {
        banner.style.display = 'flex';
        banner.innerHTML = `<span>⚠️ ${err}</span><button onclick="document.getElementById('tadashi-listening-banner').style.display='none'" style="background:none;border:none;color:#fff;cursor:pointer">✕</button>`;
      }
    }
  });

  if (ok) {
    if (micBtn) micBtn.classList.add('listening');
    if (banner) banner.style.display = 'flex';
  }
}

Voice._onListeningChange = (isListening) => {
  const micBtn = document.getElementById('tadashi-mic-btn');
  const banner = document.getElementById('tadashi-listening-banner');
  if (micBtn) {
    if (isListening) micBtn.classList.add('listening');
    else micBtn.classList.remove('listening');
  }
  if (banner && !isListening) {
    banner.style.display = 'none';
  }
};

function toggleSpeakMessage(btn, msgIndex) {
  const msg = chatMessages[msgIndex];
  if (!msg || !msg.content) return;

  if (Voice.isSpeaking()) {
    Voice.stopSpeaking();
    document.querySelectorAll('.chat-speak-btn').forEach(b => {
      b.classList.remove('speaking');
      b.innerHTML = '🔊 Listen';
    });
    return;
  }

  btn.classList.add('speaking');
  btn.innerHTML = '⏹ Stop';
  Voice.speak(msg.content, {
    onEnd: () => {
      btn.classList.remove('speaking');
      btn.innerHTML = '🔊 Listen';
    },
    onError: () => {
      btn.classList.remove('speaking');
      btn.innerHTML = '🔊 Listen';
    }
  });
}

// --- Live Voice Call Modal ---

function openVoiceCallModal() {
  voiceCallActive = true;
  voiceCallMuted = false;
  Voice.stopSpeaking();
  Voice.stopListening();

  let modal = document.getElementById('voice-call-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'voice-call-modal';
    document.body.appendChild(modal);
  }

  modal.className = 'voice-call-overlay';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="voice-call-header">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--accent-cyan);font-weight:700">TADASHI Live Voice Call</div>
      <div id="voice-call-status" style="font-size:20px;font-weight:800;margin-top:6px">Starting voice link...</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Hands-free Conversational Link</div>
    </div>

    <div class="voice-orb-container">
      <div class="voice-orb-ring voice-orb-ring-1"></div>
      <div class="voice-orb-ring voice-orb-ring-2"></div>
      <div class="voice-orb-core" id="voice-call-orb">🧠</div>
    </div>

    <div class="voice-wave-bars">
      <div class="voice-wave-bar"></div>
      <div class="voice-wave-bar"></div>
      <div class="voice-wave-bar"></div>
      <div class="voice-wave-bar"></div>
      <div class="voice-wave-bar"></div>
      <div class="voice-wave-bar"></div>
      <div class="voice-wave-bar"></div>
    </div>

    <div class="voice-call-transcript" id="voice-call-transcript">
      <span style="color:var(--text-muted)">Speak naturally. TADASHI is listening...</span>
    </div>

    <div class="voice-call-controls">
      <button class="voice-control-btn" id="voice-mute-btn" onclick="toggleVoiceCallMute()" title="Mute/Unmute Mic">🎙️</button>
      <button class="voice-control-btn end-call" onclick="closeVoiceCallModal()" title="End Voice Call">✕</button>
      <button class="voice-control-btn" id="voice-speaker-btn" onclick="toggleVoiceCallSpeaker()" title="Toggle Speaker">🔊</button>
    </div>
  `;

  // Escape key closes voice call
  const onKey = (e) => {
    if (e.key === 'Escape' && voiceCallActive) {
      closeVoiceCallModal();
      document.removeEventListener('keydown', onKey);
    }
  };
  document.addEventListener('keydown', onKey);

  // Play subtle opening speech
  Voice.speak('TADASHI voice link active. I am listening.', {
    onEnd: () => {
      if (voiceCallActive) runVoiceCallCycle();
    }
  });
}

function runVoiceCallCycle() {
  if (!voiceCallActive) return;

  const overlay = document.getElementById('voice-call-modal');
  const statusEl = document.getElementById('voice-call-status');
  const transcriptEl = document.getElementById('voice-call-transcript');

  if (voiceCallMuted) {
    if (overlay) overlay.className = 'voice-call-overlay';
    if (statusEl) statusEl.textContent = 'Microphone Muted';
    return;
  }

  if (overlay) overlay.className = 'voice-call-overlay listening';
  if (statusEl) statusEl.innerHTML = '<span style="color:#ff6b6b">Listening...</span> Speak now';

  let hasSpoken = false;

  Voice.startListening({
    onInterim: (text) => {
      hasSpoken = true;
      if (transcriptEl) transcriptEl.innerHTML = `<span style="color:var(--text-muted)">You: </span><strong>${text}</strong>`;
    },
    onResult: (finalText) => {
      hasSpoken = true;
      if (!voiceCallActive) return;
      if (transcriptEl) transcriptEl.innerHTML = `<span style="color:var(--text-muted)">You: </span><strong>${finalText}</strong>`;
      handleVoiceCallUserUtterance(finalText);
    },
    onEnd: (finalText) => {
      if (!voiceCallActive) return;
      if (!hasSpoken && !Voice.isSpeaking()) {
        // If silence detected without input, smoothly restart listening loop
        setTimeout(() => { if (voiceCallActive && !Voice.isSpeaking()) runVoiceCallCycle(); }, 500);
      }
    },
    onError: (err) => {
      console.warn('Voice call STT error:', err);
      if (!voiceCallActive) return;
      if (statusEl) statusEl.textContent = 'Listening paused';
      setTimeout(() => { if (voiceCallActive && !Voice.isSpeaking()) runVoiceCallCycle(); }, 1200);
    }
  });
}

async function handleVoiceCallUserUtterance(userText) {
  if (!userText || !voiceCallActive) return;

  const overlay = document.getElementById('voice-call-modal');
  const statusEl = document.getElementById('voice-call-status');
  const transcriptEl = document.getElementById('voice-call-transcript');

  Voice.stopListening();

  if (overlay) overlay.className = 'voice-call-overlay';
  if (statusEl) statusEl.innerHTML = '<span style="color:var(--accent-cyan)">TADASHI thinking...</span>';

  // Add to main chat
  chatMessages.push({ role:'user', content: userText, time: Utils.timeNow() });
  renderChatMessages();

  try {
    const response = await generateTADASHIResponse(userText);
    chatMessages.push({ role:'tadashi', ...response, time: Utils.timeNow() });
    renderChatMessages();

    if (!voiceCallActive) return;

    if (overlay) overlay.className = 'voice-call-overlay speaking';
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--accent-green)">TADASHI speaking...</span>';
    if (transcriptEl) transcriptEl.innerHTML = `<span style="color:var(--accent-cyan)">TADASHI: </span>${Utils.md(response.content)}`;

    Voice.speak(response.content, {
      onEnd: () => {
        if (!voiceCallActive) return;
        // When TADASHI finishes speaking, seamlessly cycle back to listening!
        setTimeout(() => {
          if (voiceCallActive) runVoiceCallCycle();
        }, 600);
      },
      onError: () => {
        if (voiceCallActive) setTimeout(() => runVoiceCallCycle(), 600);
      }
    });
  } catch (e) {
    if (statusEl) statusEl.textContent = 'Error processing request';
    setTimeout(() => { if (voiceCallActive) runVoiceCallCycle(); }, 1500);
  }
}

function closeVoiceCallModal() {
  voiceCallActive = false;
  Voice.stopSpeaking();
  Voice.stopListening();
  const modal = document.getElementById('voice-call-modal');
  if (modal) modal.style.display = 'none';
}

function toggleVoiceCallMute() {
  voiceCallMuted = !voiceCallMuted;
  const btn = document.getElementById('voice-mute-btn');
  if (btn) btn.textContent = voiceCallMuted ? '🔇' : '🎙️';
  if (voiceCallMuted) {
    Voice.stopListening();
    const statusEl = document.getElementById('voice-call-status');
    if (statusEl) statusEl.textContent = 'Microphone Muted';
    const overlay = document.getElementById('voice-call-modal');
    if (overlay) overlay.className = 'voice-call-overlay';
  } else {
    runVoiceCallCycle();
  }
}

function toggleVoiceCallSpeaker() {
  const enabled = !Voice.isVoiceOutputEnabled();
  Voice.setVoiceOutputEnabled(enabled);
  const btn = document.getElementById('voice-speaker-btn');
  if (btn) btn.textContent = enabled ? '🔊' : '🔈';
  if (!enabled) Voice.stopSpeaking();
}
