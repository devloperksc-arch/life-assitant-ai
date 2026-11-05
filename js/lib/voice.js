// ============================================================
// TADASHI Voice Engine — Speech-to-Text & Text-to-Speech
// Provider-neutral audio architecture supporting Web Speech API,
// local offline Whisper / Piper, and cloud voice gateways.
// Zero external client dependencies; full text-only fallback.
// ============================================================

const Voice = {
  VOICE_OUTPUT_STORAGE: 'tadashi_voice_output',
  VOICE_SPEED_STORAGE: 'tadashi_voice_speed',
  VOICE_PITCH_STORAGE: 'tadashi_voice_pitch',
  SELECTED_VOICE_STORAGE: 'tadashi_selected_voice',
  STT_PROVIDER_STORAGE: 'tadashi_stt_provider',
  TTS_PROVIDER_STORAGE: 'tadashi_tts_provider',

  STATES: {
    IDLE: 'idle',
    LISTENING: 'listening',
    TRANSCRIBING: 'transcribing',
    SPEAKING: 'speaking',
    MUTED: 'muted',
    OFFLINE: 'offline',
    ERROR: 'error'
  },

  recognition: null,
  activeAudioElement: null,
  activeAbortController: null,
  _isListening: false,
  _isSpeaking: false,
  _voiceState: 'idle',
  _stateListeners: [],
  _onListeningChange: null,
  _onSpeakingChange: null,

  _sttProviders: new Map(),
  _ttsProviders: new Map(),
  _activeSTTProviderId: 'web_speech',
  _activeTTSProviderId: 'web_speech',
  _memoryStore: new Map(),

  // Safe localStorage accessor with in-memory fallback
  _getStorage(key, fallback = null) {
    try {
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(key);
        return val !== null ? val : fallback;
      }
    } catch (e) {
      // storage blocked or full
    }
    return this._memoryStore.has(key) ? this._memoryStore.get(key) : fallback;
  },

  _setStorage(key, value) {
    this._memoryStore.set(key, String(value));
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, String(value));
      }
    } catch (e) {
      // storage blocked or full
    }
  },

  // State Machine & Observability
  getVoiceState() {
    return this._voiceState;
  },

  _setState(newState, details = '') {
    this._voiceState = newState;
    this._isListening = (newState === this.STATES.LISTENING || newState === this.STATES.TRANSCRIBING);
    this._isSpeaking = (newState === this.STATES.SPEAKING);

    // Synchronize legacy handlers
    if (typeof this._onListeningChange === 'function') {
      try { this._onListeningChange(this._isListening); } catch (e) {}
    }
    if (typeof this._onSpeakingChange === 'function') {
      try { this._onSpeakingChange(this._isSpeaking); } catch (e) {}
    }

    // Notify state listeners
    for (const listener of this._stateListeners) {
      try { listener(newState, details); } catch (e) {}
    }

    // Direct ReactorUI sync if mounted
    if (typeof window !== 'undefined' && window.ReactorUI && typeof window.ReactorUI.setState === 'function') {
      if (newState === this.STATES.LISTENING) {
        window.ReactorUI.setState('listening', details || 'Listening... Speak naturally');
      } else if (newState === this.STATES.TRANSCRIBING) {
        window.ReactorUI.setState('transcribing', details || 'Understanding audio stream...');
      } else if (newState === this.STATES.SPEAKING) {
        window.ReactorUI.setState('speaking', details || 'TADASHI speaking · Tap to interrupt');
      } else if (newState === this.STATES.IDLE && window.ReactorUI.getState() === 'speaking') {
        window.ReactorUI.setState('idle', 'Standing by');
      }
    }
  },

  onVoiceStateChange(listener) {
    if (typeof listener === 'function') {
      this._stateListeners.push(listener);
    }
    return () => {
      this._stateListeners = this._stateListeners.filter(l => l !== listener);
    };
  },

  // Browser Platform Support
  isSTTSupported() {
    const provider = this.getActiveSTTProvider();
    if (provider && typeof provider.isAvailable === 'function') {
      return provider.isAvailable();
    }
    return (typeof window !== 'undefined') &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  },

  isTTSSupported() {
    const provider = this.getActiveTTSProvider();
    if (provider && typeof provider.isAvailable === 'function') {
      return provider.isAvailable();
    }
    return (typeof window !== 'undefined') &&
      ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window);
  },

  isAudioAvailable() {
    return this.isSTTSupported() || this.isTTSSupported();
  },

  // Voice Preferences
  isVoiceOutputEnabled() {
    const v = this._getStorage(this.VOICE_OUTPUT_STORAGE);
    return v === null ? true : v === 'true';
  },

  setVoiceOutputEnabled(enabled) {
    this._setStorage(this.VOICE_OUTPUT_STORAGE, enabled ? 'true' : 'false');
    if (!enabled) {
      this.stopSpeaking();
      this._setState(this.STATES.MUTED, 'Voice output disabled');
    } else if (this._voiceState === this.STATES.MUTED) {
      this._setState(this.STATES.IDLE, 'Voice output enabled');
    }
  },

  getSpeed() {
    const s = parseFloat(this._getStorage(this.VOICE_SPEED_STORAGE));
    return isNaN(s) ? 1.0 : Math.max(0.7, Math.min(1.5, s));
  },

  setSpeed(s) {
    this._setStorage(this.VOICE_SPEED_STORAGE, s.toString());
  },

  getPitch() {
    const p = parseFloat(this._getStorage(this.VOICE_PITCH_STORAGE));
    return isNaN(p) ? 1.0 : Math.max(0.7, Math.min(1.4, p));
  },

  setPitch(p) {
    this._setStorage(this.VOICE_PITCH_STORAGE, p.toString());
  },

  // Provider Registry
  registerSTTProvider(id, provider) {
    if (!id || typeof id !== 'string') throw new Error('STT Provider ID must be a non-empty string');
    if (!provider || typeof provider.startListening !== 'function' || typeof provider.stopListening !== 'function') {
      throw new Error('STT Provider must implement startListening and stopListening methods');
    }
    this._sttProviders.set(id, provider);
  },

  registerTTSProvider(id, provider) {
    if (!id || typeof id !== 'string') throw new Error('TTS Provider ID must be a non-empty string');
    if (!provider || typeof provider.speak !== 'function' || typeof provider.stopSpeaking !== 'function') {
      throw new Error('TTS Provider must implement speak and stopSpeaking methods');
    }
    this._ttsProviders.set(id, provider);
  },

  setSTTProvider(id) {
    if (!this._sttProviders.has(id)) {
      throw new Error(`STT Provider "${id}" is not registered`);
    }
    this._activeSTTProviderId = id;
    this._setStorage(this.STT_PROVIDER_STORAGE, id);
  },

  getSTTProvider() {
    return this._activeSTTProviderId;
  },

  getActiveSTTProvider() {
    return this._sttProviders.get(this._activeSTTProviderId) || null;
  },

  setTTSProvider(id) {
    if (!this._ttsProviders.has(id)) {
      throw new Error(`TTS Provider "${id}" is not registered`);
    }
    this._activeTTSProviderId = id;
    this._setStorage(this.TTS_PROVIDER_STORAGE, id);
  },

  getTTSProvider() {
    return this._activeTTSProviderId;
  },

  getActiveTTSProvider() {
    return this._ttsProviders.get(this._activeTTSProviderId) || null;
  },

  listSTTProviders() {
    return Array.from(this._sttProviders.entries()).map(([id, p]) => ({
      id,
      name: p.name || id,
      available: typeof p.isAvailable === 'function' ? p.isAvailable() : true,
      active: id === this._activeSTTProviderId
    }));
  },

  listTTSProviders() {
    return Array.from(this._ttsProviders.entries()).map(([id, p]) => ({
      id,
      name: p.name || id,
      available: typeof p.isAvailable === 'function' ? p.isAvailable() : true,
      active: id === this._activeTTSProviderId
    }));
  },

  // Text Processing for Clean Audio Output
  cleanTextForSpeech(text) {
    if (!text) return '';
    return text
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, ' Code snippet omitted. ')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove URLs
      .replace(/https?:\/\/\S+/g, '')
      // Remove markdown bold / italic symbols
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      // Remove headings
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bullet symbols and blockquotes
      .replace(/^[\s>•*-]+\s+/gm, '')
      // Remove emojis
      .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
      // Clean duplicate whitespace and newlines
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  getAvailableVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return [];
    const all = window.speechSynthesis.getVoices() || [];
    return all.filter(v => v.lang && v.lang.startsWith('en'));
  },

  getBestVoice() {
    const voices = this.getAvailableVoices();
    if (!voices.length) return null;

    const savedURI = this._getStorage(this.SELECTED_VOICE_STORAGE);
    if (savedURI) {
      const match = voices.find(v => v.voiceURI === savedURI);
      if (match) return match;
    }

    const preferredNames = [
      'Natural', 'Neural', 'Google UK English Male', 'Google UK English Female',
      'Google US English', 'Microsoft David Online', 'Microsoft Mark Online',
      'Microsoft Ryan Online', 'Microsoft Christopher Online', 'Samantha', 'Daniel'
    ];

    for (const name of preferredNames) {
      const found = voices.find(v => v.name && v.name.includes(name));
      if (found) return found;
    }

    return voices.find(v => v.lang === 'en-US' || v.lang === 'en-GB') || voices[0];
  },

  // --- TEXT TO SPEECH (TADASHI Speaking) ---

  speak(text, { onStart, onEnd, onError } = {}) {
    if (!this.isVoiceOutputEnabled()) {
      if (onEnd) onEnd();
      return;
    }

    // Barge-in: cancel any currently playing utterance
    this.stopSpeaking();

    const spokenText = this.cleanTextForSpeech(text);
    if (!spokenText) {
      if (onEnd) onEnd();
      return;
    }

    const provider = this.getActiveTTSProvider();
    if (!provider || (typeof provider.isAvailable === 'function' && !provider.isAvailable())) {
      const fallbackMsg = 'TTS provider unavailable. Text-only mode active.';
      console.warn(fallbackMsg);
      this._setState(this.STATES.OFFLINE, fallbackMsg);
      if (onError) onError(fallbackMsg);
      if (onEnd) onEnd();
      return;
    }

    this._setState(this.STATES.SPEAKING, 'TADASHI speaking...');

    try {
      provider.speak(spokenText, {
        speed: this.getSpeed(),
        pitch: this.getPitch(),
        voice: this.getBestVoice(),
        onStart: () => {
          this._setState(this.STATES.SPEAKING, 'TADASHI speaking...');
          if (onStart) onStart();
        },
        onEnd: () => {
          this._setState(this.STATES.IDLE, 'Speech complete');
          if (onEnd) onEnd();
        },
        onError: (err) => {
          this._setState(this.STATES.ERROR, typeof err === 'string' ? err : 'Speech playback error');
          if (onError) onError(err);
        }
      });
    } catch (e) {
      this._setState(this.STATES.ERROR, e.message);
      if (onError) onError(e.message);
      if (onEnd) onEnd();
    }
  },

  stopSpeaking() {
    const provider = this.getActiveTTSProvider();
    if (provider && typeof provider.stopSpeaking === 'function') {
      try { provider.stopSpeaking(); } catch (e) {}
    }
    if (this.activeAudioElement) {
      try {
        this.activeAudioElement.pause();
        this.activeAudioElement.currentTime = 0;
      } catch (e) {}
      this.activeAudioElement = null;
    }
    if (this._voiceState === this.STATES.SPEAKING) {
      this._setState(this.STATES.IDLE, 'Speech stopped');
    }
  },

  isSpeaking() {
    if (this._isSpeaking) return true;
    const provider = this.getActiveTTSProvider();
    if (provider && typeof provider.isSpeaking === 'function') {
      return provider.isSpeaking();
    }
    return false;
  },

  // Immediate Interruption (Barge-in)
  bargeIn() {
    this.stopSpeaking();
    this.stopListening();
    this._setState(this.STATES.IDLE, 'Interrupted by user');
  },

  // --- SPEECH RECOGNITION (TADASHI Listening) ---

  startListening({ onResult, onInterim, onEnd, onError } = {}) {
    // Barge-in: always stop assistant speech when listening starts
    this.stopSpeaking();

    const provider = this.getActiveSTTProvider();
    if (!provider || (typeof provider.isAvailable === 'function' && !provider.isAvailable())) {
      const err = 'Speech recognition is not available in this environment. Falling back to text input.';
      this._setState(this.STATES.OFFLINE, err);
      if (onError) onError(err);
      return false;
    }

    // Clean restart if already listening
    this.stopListening();
    this._setState(this.STATES.LISTENING, 'Listening... Speak naturally');

    try {
      const success = provider.startListening({
        onInterim: (text) => {
          this._setState(this.STATES.LISTENING, `Interim: "${text}"`);
          if (onInterim) onInterim(text);
        },
        onResult: (finalText) => {
          this._setState(this.STATES.TRANSCRIBING, `Processing: "${finalText}"`);
          if (onResult) onResult(finalText);
        },
        onEnd: (finalTranscript) => {
          this._setState(this.STATES.IDLE, 'Listening ended');
          if (onEnd) onEnd(finalTranscript);
        },
        onError: (err) => {
          const errStr = typeof err === 'string' ? err : (err?.error || err?.message || 'STT error');
          this._setState(this.STATES.ERROR, errStr);
          if (onError) onError(errStr);
        }
      });
      return success !== false;
    } catch (e) {
      this._setState(this.STATES.ERROR, e.message);
      if (onError) onError(e.message);
      return false;
    }
  },

  stopListening() {
    const provider = this.getActiveSTTProvider();
    if (provider && typeof provider.stopListening === 'function') {
      try { provider.stopListening(); } catch (e) {}
    }
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
      this.recognition = null;
    }
    if (this._isListening) {
      this._setState(this.STATES.IDLE, 'Microphone standby');
    }
  },

  isListening() {
    return this._isListening;
  },

  // Push-to-Talk convenience helpers
  startPushToTalk(callbacks) {
    return this.startListening(callbacks);
  },

  stopPushToTalk() {
    this.stopListening();
  }
};

// ============================================================
// Built-in Providers: Web Speech API (Default Browser)
// ============================================================

const WebSpeechSTT = {
  name: 'Browser Web Speech',
  isAvailable() {
    return (typeof window !== 'undefined') &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  },
  startListening({ onResult, onInterim, onEnd, onError }) {
    if (!this.isAvailable()) {
      if (onError) onError('Web SpeechRecognition not supported');
      return false;
    }
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    let finalTranscript = '';

    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }
      if (interim && onInterim) onInterim(interim);
      if (finalTranscript && onResult) onResult(finalTranscript.trim());
    };

    rec.onerror = (event) => {
      if (onError) onError(event.error || 'SpeechRecognition error');
    };

    rec.onend = () => {
      if (onEnd) onEnd(finalTranscript.trim());
    };

    Voice.recognition = rec;
    try {
      rec.start();
      return true;
    } catch (e) {
      if (onError) onError(e.message);
      return false;
    }
  },
  stopListening() {
    if (Voice.recognition) {
      try { Voice.recognition.stop(); } catch (e) {}
      Voice.recognition = null;
    }
  }
};

const WebSpeechTTS = {
  name: 'Browser Speech Synthesis',
  isAvailable() {
    return (typeof window !== 'undefined') &&
      ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window);
  },
  speak(text, { speed, pitch, voice, onStart, onEnd, onError }) {
    if (!this.isAvailable()) {
      if (onError) onError('SpeechSynthesis not supported');
      return;
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.rate = speed || 1.0;
    utterance.pitch = pitch || 1.0;

    utterance.onstart = () => { if (onStart) onStart(); };
    utterance.onend = () => { if (onEnd) onEnd(); };
    utterance.onerror = (e) => { if (onError) onError(e); };

    window.speechSynthesis.speak(utterance);
  },
  stopSpeaking() {
    if (this.isAvailable()) {
      window.speechSynthesis.cancel();
    }
  },
  isSpeaking() {
    return this.isAvailable() && window.speechSynthesis.speaking;
  }
};

// ============================================================
// Built-in Providers: Local Whisper & Piper Adapters
// Communicates with local loopback endpoint on PC
// ============================================================

const LocalWhisperSTT = {
  name: 'Local Whisper (PC Agent)',
  endpoint: 'http://127.0.0.1:11435/v1/audio/transcriptions',
  isAvailable() {
    // Available if running on PC with loopback audio service
    return typeof fetch === 'function';
  },
  startListening({ onResult, onInterim, onEnd, onError }) {
    // In browser environment, stream microphone via MediaRecorder to local endpoint
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks = [];
        Voice.activeMediaStream = stream;
        Voice.activeMediaRecorder = mediaRecorder;

        mediaRecorder.ondataavailable = e => {
          if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('file', audioBlob, 'speech.webm');
          formData.append('model', 'whisper-base');

          try {
            const res = await fetch(LocalWhisperSTT.endpoint, {
              method: 'POST',
              body: formData
            });
            if (res.ok) {
              const data = await res.json();
              const transcript = data.text || '';
              if (onResult) onResult(transcript.trim());
              if (onEnd) onEnd(transcript.trim());
            } else {
              throw new Error(`Local Whisper HTTP ${res.status}`);
            }
          } catch (err) {
            if (onError) onError(`Local Whisper failed: ${err.message}. Text fallback active.`);
          }
        };

        mediaRecorder.start();
      }).catch(err => {
        if (onError) onError(`Microphone access error: ${err.message}`);
      });
      return true;
    } else {
      if (onError) onError('Audio recording not supported in this environment');
      return false;
    }
  },
  stopListening() {
    if (Voice.activeMediaRecorder && Voice.activeMediaRecorder.state !== 'inactive') {
      try { Voice.activeMediaRecorder.stop(); } catch (e) {}
    }
    if (Voice.activeMediaStream) {
      try { Voice.activeMediaStream.getTracks().forEach(t => t.stop()); } catch (e) {}
    }
  }
};

const LocalPiperTTS = {
  name: 'Local Piper (PC Agent)',
  endpoint: 'http://127.0.0.1:11435/v1/audio/speech',
  isAvailable() {
    return typeof fetch === 'function';
  },
  async speak(text, { speed, onStart, onEnd, onError }) {
    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: text,
          model: 'piper-en-natural',
          speed: speed || 1.0
        })
      });

      if (!res.ok) {
        throw new Error(`Local Piper HTTP ${res.status}`);
      }

      const audioBlob = await res.blob();
      if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        Voice.activeAudioElement = audio;

        audio.onplay = () => { if (onStart) onStart(); };
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          Voice.activeAudioElement = null;
          if (onEnd) onEnd();
        };
        audio.onerror = (e) => {
          URL.revokeObjectURL(audioUrl);
          Voice.activeAudioElement = null;
          if (onError) onError(e);
        };

        await audio.play();
      } else {
        // Headless / non-DOM: simulate immediate completion
        if (onStart) onStart();
        if (onEnd) onEnd();
      }
    } catch (err) {
      if (onError) onError(`Local Piper playback failed: ${err.message}`);
    }
  },
  stopSpeaking() {
    if (Voice.activeAudioElement) {
      try {
        Voice.activeAudioElement.pause();
        Voice.activeAudioElement.currentTime = 0;
      } catch (e) {}
      Voice.activeAudioElement = null;
    }
  },
  isSpeaking() {
    return Boolean(Voice.activeAudioElement && !Voice.activeAudioElement.paused);
  }
};

// ============================================================
// Built-in Providers: Mock STT & TTS (Testing & Headless)
// ============================================================

const MockSTT = {
  name: 'Mock Speech Recognition',
  _lastCallbacks: null,
  isAvailable() { return true; },
  startListening(callbacks) {
    this._lastCallbacks = callbacks;
    return true;
  },
  stopListening() {
    if (this._lastCallbacks && this._lastCallbacks.onEnd) {
      this._lastCallbacks.onEnd('');
    }
    this._lastCallbacks = null;
  },
  simulateInterim(text) {
    if (this._lastCallbacks && this._lastCallbacks.onInterim) {
      this._lastCallbacks.onInterim(text);
    }
  },
  simulateResult(text) {
    if (this._lastCallbacks) {
      if (this._lastCallbacks.onResult) this._lastCallbacks.onResult(text);
      if (this._lastCallbacks.onEnd) this._lastCallbacks.onEnd(text);
    }
  },
  simulateError(err) {
    if (this._lastCallbacks && this._lastCallbacks.onError) {
      this._lastCallbacks.onError(err);
    }
  }
};

const MockTTS = {
  name: 'Mock Speech Synthesis',
  _isSpeaking: false,
  _timer: null,
  isAvailable() { return true; },
  speak(text, { onStart, onEnd }) {
    this._isSpeaking = true;
    if (onStart) onStart();
    this._timer = setTimeout(() => {
      this._isSpeaking = false;
      if (onEnd) onEnd();
    }, 50);
  },
  stopSpeaking() {
    if (this._timer) clearTimeout(this._timer);
    this._isSpeaking = false;
  },
  isSpeaking() {
    return this._isSpeaking;
  }
};

// Register Default Providers
Voice.registerSTTProvider('web_speech', WebSpeechSTT);
Voice.registerSTTProvider('local_whisper', LocalWhisperSTT);
Voice.registerSTTProvider('mock', MockSTT);

Voice.registerTTSProvider('web_speech', WebSpeechTTS);
Voice.registerTTSProvider('local_piper', LocalPiperTTS);
Voice.registerTTSProvider('mock', MockTTS);

// Restore saved provider preferences if available
const savedSTT = Voice._getStorage(Voice.STT_PROVIDER_STORAGE);
if (savedSTT && Voice._sttProviders.has(savedSTT)) {
  Voice._activeSTTProviderId = savedSTT;
} else if (!WebSpeechSTT.isAvailable()) {
  Voice._activeSTTProviderId = 'mock';
}

const savedTTS = Voice._getStorage(Voice.TTS_PROVIDER_STORAGE);
if (savedTTS && Voice._ttsProviders.has(savedTTS)) {
  Voice._activeTTSProviderId = savedTTS;
} else if (!WebSpeechTTS.isAvailable()) {
  Voice._activeTTSProviderId = 'mock';
}

// Preload browser voices when available
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    Voice.getAvailableVoices();
  };
}

// Module export for Node.js test runner & global exposure for browser
if (typeof window !== 'undefined') {
  window.Voice = Voice;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Voice;
}
