// ============================================================
// TADASHI LifeOS — Arc Reactor Assistant Interface
// 10-state neural core UI, voice loop synchronization,
// action proposal cards, and barge-in / speech interrupt control.
// ============================================================

(function (window) {
  'use strict';

  // 10 Distinct States per TADASHI Spec Section 4
  const STATES = {
    idle: {
      id: 'idle',
      label: 'Ready',
      statusText: 'Standing by · All systems nominal',
      color: '#00d4ff',
      icon: 'neurology',
      haloClass: 'shadow-[0_0_25px_rgba(0,212,255,0.3)]'
    },
    listening: {
      id: 'listening',
      label: 'Listening',
      statusText: 'Listening... Speak naturally',
      color: '#00d4ff',
      icon: 'mic',
      haloClass: 'shadow-[0_0_40px_rgba(0,212,255,0.65)]'
    },
    transcribing: {
      id: 'transcribing',
      label: 'Understanding',
      statusText: 'Processing voice stream...',
      color: '#a855f7',
      icon: 'graphic_eq',
      haloClass: 'shadow-[0_0_35px_rgba(168,85,247,0.5)]'
    },
    thinking: {
      id: 'thinking',
      label: 'Thinking',
      statusText: 'Synthesizing across 22 domains...',
      color: '#3cd7ff',
      icon: 'psychology',
      haloClass: 'shadow-[0_0_45px_rgba(60,215,255,0.7)]'
    },
    speaking: {
      id: 'speaking',
      label: 'Speaking',
      statusText: 'TADASHI responding · Tap to interrupt',
      color: '#6af7ba',
      icon: 'volume_up',
      haloClass: 'shadow-[0_0_40px_rgba(106,247,186,0.6)]'
    },
    planning: {
      id: 'planning',
      label: 'Planning',
      statusText: 'Formulating optimal schedule / action plan...',
      color: '#c4abff',
      icon: 'route',
      haloClass: 'shadow-[0_0_35px_rgba(196,171,255,0.55)]'
    },
    awaiting_approval: {
      id: 'awaiting_approval',
      label: 'Needs Approval',
      statusText: 'Action proposed · Awaiting your confirmation',
      color: '#f59e0b',
      icon: 'gavel',
      haloClass: 'shadow-[0_0_45px_rgba(245,158,11,0.7)]'
    },
    executing: {
      id: 'executing',
      label: 'Working',
      statusText: 'Applying verified domain update...',
      color: '#6af7ba',
      icon: 'bolt',
      haloClass: 'shadow-[0_0_40px_rgba(106,247,186,0.6)]'
    },
    offline: {
      id: 'offline',
      label: 'Offline Mode',
      statusText: 'Operating on local device core · Outbox active',
      color: '#859398',
      icon: 'cloud_off',
      haloClass: 'shadow-[0_0_15px_rgba(133,147,152,0.2)]'
    },
    error: {
      id: 'error',
      label: 'Needs Attention',
      statusText: 'Signal interrupted · Check console or key',
      color: '#f43f5e',
      icon: 'warning',
      haloClass: 'shadow-[0_0_35px_rgba(244,63,94,0.6)]'
    }
  };

  let currentState = 'idle';
  let activeDetails = '';
  let activeTurnProposal = null;

  // Render SVG Arc Reactor Core (Parametric size)
  function renderReactorSVG(size) {
    const s = size || 160;
    const r = s / 2;
    return `
      <svg class="arc-reactor-svg select-none pointer-events-none" width="${s}" height="${s}" viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <radialGradient id="reactorGlowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#00d4ff" stop-opacity="0.8" class="reactor-grad-core" />
            <stop offset="45%" stop-color="#00677e" stop-opacity="0.35" class="reactor-grad-mid" />
            <stop offset="100%" stop-color="#06080e" stop-opacity="0" />
          </radialGradient>
          <filter id="reactorBloom" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Outer Ambient Aura -->
        <circle cx="100" cy="100" r="92" fill="url(#reactorGlowGrad)" class="reactor-core-glow" />

        <!-- Static Tech Ring Chassis -->
        <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" />
        <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(0,212,255,0.2)" stroke-width="1" stroke-dasharray="2 6" />

        <!-- Outer Segmented Ring (Rotating CW) -->
        <g class="reactor-ring-outer">
          <circle cx="100" cy="100" r="74" fill="none" stroke="#00d4ff" stroke-width="2.5"
                  stroke-dasharray="16 8 4 8 28 12" stroke-linecap="round" opacity="0.85" />
          <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1"
                  stroke-dasharray="3 9" />
        </g>

        <!-- Mid Turbine Vanes Ring (Rotating CCW) -->
        <g class="reactor-ring-mid">
          <circle cx="100" cy="100" r="56" fill="none" stroke="#6af7ba" stroke-width="2"
                  stroke-dasharray="12 16 20 16" opacity="0.75" />
          <!-- 8 Radial Spokes -->
          <line x1="100" y1="46" x2="100" y2="54" stroke="#00d4ff" stroke-width="2" opacity="0.8" />
          <line x1="100" y1="146" x2="100" y2="154" stroke="#00d4ff" stroke-width="2" opacity="0.8" />
          <line x1="46" y1="100" x2="54" y2="100" stroke="#00d4ff" stroke-width="2" opacity="0.8" />
          <line x1="146" y1="100" x2="154" y2="100" stroke="#00d4ff" stroke-width="2" opacity="0.8" />
          <line x1="62" y1="62" x2="68" y2="68" stroke="#00d4ff" stroke-width="1.5" opacity="0.7" />
          <line x1="138" y1="62" x2="132" y2="68" stroke="#00d4ff" stroke-width="1.5" opacity="0.7" />
          <line x1="62" y1="138" x2="68" y2="132" stroke="#00d4ff" stroke-width="1.5" opacity="0.7" />
          <line x1="138" y1="138" x2="132" y2="132" stroke="#00d4ff" stroke-width="1.5" opacity="0.7" />
        </g>

        <!-- Inner Accelerated Pulse Ring -->
        <g class="reactor-ring-inner">
          <circle cx="100" cy="100" r="42" fill="none" stroke="#a8e8ff" stroke-width="2"
                  stroke-dasharray="8 6 14 6" opacity="0.9" />
          <polygon points="100,68 128,116 72,116" fill="none" stroke="rgba(0,212,255,0.4)" stroke-width="1.5" opacity="0.6" />
        </g>

        <!-- Central High-Intensity Core -->
        <circle cx="100" cy="100" r="28" fill="#0b1324" stroke="#00d4ff" stroke-width="2" filter="url(#reactorBloom)" />
        <circle cx="100" cy="100" r="20" fill="url(#reactorGlowGrad)" class="reactor-core-glow" />
        <circle cx="100" cy="100" r="10" fill="#ffffff" opacity="0.9" filter="url(#reactorBloom)" />
      </svg>
    `;
  }

  // Update DOM nodes reflecting reactor state
  function applyStateDOM(stateId, details) {
    const meta = STATES[stateId] || STATES.idle;
    currentState = meta.id;
    activeDetails = details || meta.statusText;

    // 1. Update all .arc-reactor-widget elements across the app
    const widgets = document.querySelectorAll('.arc-reactor-widget');
    widgets.forEach(w => {
      // Remove previous state classes
      Object.keys(STATES).forEach(s => w.classList.remove(`reactor-state-${s}`));
      w.classList.add(`reactor-state-${meta.id}`);

      // Update color tint on glow and borders
      w.style.setProperty('--reactor-accent', meta.color);

      // Status label and icon
      const labelEl = w.querySelector('.reactor-state-label');
      if (labelEl) {
        labelEl.textContent = meta.label;
        labelEl.style.color = meta.color;
      }
      const descEl = w.querySelector('.reactor-state-desc');
      if (descEl) {
        descEl.textContent = activeDetails;
      }
      const iconEl = w.querySelector('.reactor-state-icon');
      if (iconEl) {
        iconEl.textContent = meta.icon;
        iconEl.style.color = meta.color;
      }
      const badgeEl = w.querySelector('.reactor-state-badge');
      if (badgeEl) {
        badgeEl.style.borderColor = `${meta.color}40`;
        badgeEl.style.background = `${meta.color}15`;
        badgeEl.style.color = meta.color;
      }
    });

    // 2. Synchronize voice modal header & status if visible
    const modalStatus = document.getElementById('voice-modal-status');
    if (modalStatus) {
      modalStatus.textContent = activeDetails;
    }
    const modalHeading = document.getElementById('voice-modal-heading');
    if (modalHeading) {
      modalHeading.textContent = `TADASHI · ${meta.label.toUpperCase()}`;
      modalHeading.style.color = meta.color;
    }

    // 3. Dispatch global custom event for any listeners
    if (typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(new CustomEvent('tadashi:reactor-state', {
          detail: { state: meta.id, meta, details: activeDetails }
        }));
      } catch (e) { }
    }
  }

  // Action Proposal Card Management (Approval flow for reversible/destructive actions)
  function renderProposalCard(containerEl, proposal, onDecision) {
    if (!containerEl) return;
    activeTurnProposal = proposal;
    applyStateDOM('awaiting_approval', `Approval required for ${proposal.action || proposal.title || 'action'}`);

    const card = document.createElement('div');
    card.className = 'action-proposal-card glass-surface p-4 sm:p-5 rounded-2xl border-2 border-amber-400/60 shadow-[0_0_30px_rgba(245,158,11,0.25)] space-y-3.5 my-3 animate-fadeIn';
    card.setAttribute('role', 'alertdialog');
    card.setAttribute('aria-labelledby', 'proposal-card-title');

    const domainBadge = proposal.domain || 'LifeOS';
    const riskBadge = (proposal.risk || 'reversible_write').toUpperCase().replace(/_/g, ' ');

    card.innerHTML = `
      <div class="flex items-center justify-between pb-2 border-b border-outline-variant/15">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
          <span class="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider" id="proposal-card-title">
            Action Proposal · Needs Your Confirmation
          </span>
        </div>
        <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container text-outline border border-outline-variant/30">
          ${domainBadge} · ${riskBadge}
        </span>
      </div>

      <div class="space-y-1.5">
        <h4 class="text-sm font-semibold text-white">${Utils.escapeHtml(proposal.title || proposal.action || 'Proposed Operation')}</h4>
        <p class="text-xs text-on-surface/80 leading-relaxed font-mono">${Utils.escapeHtml(proposal.description || proposal.summary || 'TADASHI is requesting permission to execute this operation.')}</p>
        ${proposal.consequence ? `<p class="text-[11px] text-amber-300/90 font-mono">⚠️ Effect: ${Utils.escapeHtml(proposal.consequence)}</p>` : ''}
      </div>

      <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-outline-variant/15">
        <button class="proposal-reject-btn px-4 py-2 rounded-xl glass-surface hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono transition-all active:scale-95">
          ✕ Reject
        </button>
        <button class="proposal-approve-btn px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-mono text-xs font-bold hover:brightness-110 shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all active:scale-95">
          ✓ Approve &amp; Execute
        </button>
      </div>
    `;

    const approveBtn = card.querySelector('.proposal-approve-btn');
    const rejectBtn = card.querySelector('.proposal-reject-btn');

    approveBtn.addEventListener('click', () => {
      card.remove();
      applyStateDOM('executing', `Executing ${proposal.title || 'action'}...`);
      if (typeof onDecision === 'function') onDecision(true, proposal);
    });

    rejectBtn.addEventListener('click', () => {
      card.remove();
      applyStateDOM('idle', 'Proposal declined');
      if (typeof onDecision === 'function') onDecision(false, proposal);
    });

    containerEl.appendChild(card);
    containerEl.scrollTop = containerEl.scrollHeight;
  }

  // Hook into Voice Adapter
  function bindVoiceAdapter(voiceObj) {
    if (!voiceObj) return;

    // Synchronize speaking events
    const origSpeakingChange = voiceObj._onSpeakingChange;
    voiceObj._onSpeakingChange = function (isSpeaking) {
      if (isSpeaking) {
        applyStateDOM('speaking', 'TADASHI speaking · Click or speak to interrupt');
      } else if (currentState === 'speaking') {
        applyStateDOM('idle', 'Standing by');
      }
      if (typeof origSpeakingChange === 'function') origSpeakingChange(isSpeaking);
    };

    // Synchronize listening events
    const origListeningChange = voiceObj._onListeningChange;
    voiceObj._onListeningChange = function (isListening) {
      if (isListening) {
        applyStateDOM('listening', 'Listening... Speak naturally');
      } else if (currentState === 'listening') {
        applyStateDOM('transcribing', 'Understanding audio stream...');
      }
      if (typeof origListeningChange === 'function') origListeningChange(isListening);
    };
  }

  // Interrupt Speech / Stop Assistant
  function interruptSpeech() {
    if (window.Voice && typeof window.Voice.stopSpeaking === 'function') {
      window.Voice.stopSpeaking();
    }
    if (window.Voice && typeof window.Voice.stopListening === 'function') {
      window.Voice.stopListening();
    }
    applyStateDOM('idle', 'Assistant paused');
  }

  // Public Interface
  const ReactorUI = {
    STATES,
    getState() { return currentState; },
    getDetails() { return activeDetails; },
    setState(stateId, details) { applyStateDOM(stateId, details); },
    renderReactorSVG,
    renderProposalCard,
    bindVoiceAdapter,
    interruptSpeech,

    // Initialize in a container
    mountWidget(containerEl, options) {
      if (!containerEl) return;
      const opt = options || {};
      const size = opt.size || 150;
      const showControls = opt.showControls !== false;
      const isCompact = opt.compact || size <= 120;

      containerEl.innerHTML = `
        <div class="arc-reactor-widget reactor-state-${currentState} flex flex-col items-center justify-center ${isCompact ? 'p-3 rounded-2xl' : 'p-4 rounded-3xl'} bg-surface-container-lowest/80 border border-outline-variant/20 shadow-2xl relative overflow-hidden transition-all duration-300">
          <!-- Background Ambient Ray -->
          <div class="absolute inset-0 bg-gradient-to-b from-primary-container/10 via-transparent to-transparent pointer-events-none"></div>

          <!-- Central Reactor Core SVG -->
          <div class="relative flex items-center justify-center ${isCompact ? 'my-1' : 'my-2'} cursor-pointer group" onclick="window.ReactorUI.interruptSpeech()" title="Tap to interrupt / toggle state">
            ${renderReactorSVG(size)}
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="material-symbols-outlined reactor-state-icon text-primary-container ${isCompact ? 'text-xl' : 'text-2xl'} transition-all duration-300">neurology</span>
            </div>
          </div>

          <!-- Reactor Telemetry Header -->
          <div class="text-center ${isCompact ? 'mt-1 space-y-0.5' : 'mt-2 space-y-1'} relative z-10">
            <div class="inline-flex items-center gap-1.5 ${isCompact ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'} font-mono font-bold tracking-wider reactor-state-badge border border-primary-container/30 bg-primary-container/10 text-primary-container">
              <span class="w-1.5 h-1.5 rounded-full bg-current animate-ping"></span>
              <span class="reactor-state-label uppercase">READY</span>
            </div>
            <p class="reactor-state-desc ${isCompact ? 'text-[11px]' : 'text-xs'} font-mono text-outline/80 max-w-xs truncate">
              Standing by · All systems nominal
            </p>
          </div>

          ${showControls ? `
            <!-- Fast Voice Controls Strip -->
            <div class="flex items-center gap-2 ${isCompact ? 'mt-2 pt-2' : 'mt-3 pt-3'} border-t border-outline-variant/15 w-full justify-center">
              <button onclick="window.toggleVoiceMic()" title="Push to talk" class="${isCompact ? 'px-3 py-1 text-[11px]' : 'px-3.5 py-1.5 text-xs'} rounded-xl bg-primary-container/20 hover:bg-primary-container/30 text-primary font-mono flex items-center gap-1.5 border border-primary-container/30 transition-all active:scale-95">
                <span class="material-symbols-outlined text-[15px]">mic</span>
                <span>Push to Talk</span>
              </button>
              <button onclick="window.ReactorUI.interruptSpeech()" title="Stop speaking" class="${isCompact ? 'p-1' : 'p-1.5'} rounded-xl glass-surface hover:bg-rose-500/20 text-outline hover:text-rose-400 border border-outline-variant/20 transition-all" aria-label="Stop audio">
                <span class="material-symbols-outlined text-[15px]">stop_circle</span>
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }
  };

  // Expose to window
  window.ReactorUI = ReactorUI;
  window.setReactorState = function (stateId, details) {
    ReactorUI.setState(stateId, details);
  };

  // Auto-bind Voice when ready
  if (window.Voice) {
    bindVoiceAdapter(window.Voice);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.Voice) bindVoiceAdapter(window.Voice);
    });
  }

})(window);
