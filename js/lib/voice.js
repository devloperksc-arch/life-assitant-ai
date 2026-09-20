// ============================================================
// TADASHI Voice Engine — Speech-to-Text & Text-to-Speech
// Uses the native Web Speech API (SpeechRecognition & SpeechSynthesis)
// Zero external dependencies, ultra-low latency, works in modern browsers.
// ============================================================

const Voice = {
  VOICE_OUTPUT_STORAGE: 'tadashi_voice_output',
  VOICE_SPEED_STORAGE: 'tadashi_voice_speed',
  VOICE_PITCH_STORAGE: 'tadashi_voice_pitch',
  SELECTED_VOICE_STORAGE: 'tadashi_selected_voice',

  recognition: null,
  _isListening: false,
  _isSpeaking: false,
  _onListeningChange: null,
  _onSpeakingChange: null,

  // Check browser support
  isSTTSupported() {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  },

  isTTSSupported() {
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  },

  // Voice Output Preferences
  isVoiceOutputEnabled() {
    const v = localStorage.getItem(this.VOICE_OUTPUT_STORAGE);
    return v === null ? true : v === 'true';
  },

  setVoiceOutputEnabled(enabled) {
    localStorage.setItem(this.VOICE_OUTPUT_STORAGE, enabled ? 'true' : 'false');
    if (!enabled) this.stopSpeaking();
  },

  getSpeed() {
    const s = parseFloat(localStorage.getItem(this.VOICE_SPEED_STORAGE));
    return isNaN(s) ? 1.0 : Math.max(0.7, Math.min(1.5, s));
  },

  setSpeed(s) {
    localStorage.setItem(this.VOICE_SPEED_STORAGE, s.toString());
  },

  getPitch() {
    const p = parseFloat(localStorage.getItem(this.VOICE_PITCH_STORAGE));
    return isNaN(p) ? 1.0 : Math.max(0.7, Math.min(1.4, p));
  },

  setPitch(p) {
    localStorage.setItem(this.VOICE_PITCH_STORAGE, p.toString());
  },

  // --- TEXT TO SPEECH (TADASHI Speaking) ---

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
    if (!this.isTTSSupported()) return [];
    const all = window.speechSynthesis.getVoices() || [];
    // Prioritize English natural voices
    return all.filter(v => v.lang.startsWith('en'));
  },

  getBestVoice() {
    const voices = this.getAvailableVoices();
    if (!voices.length) return null;

    const savedURI = localStorage.getItem(this.SELECTED_VOICE_STORAGE);
    if (savedURI) {
      const match = voices.find(v => v.voiceURI === savedURI);
      if (match) return match;
    }

    // Preferred natural voices across Windows, Edge, Chrome, Mac
    const preferredNames = [
      'Natural', 'Neural', 'Google UK English Male', 'Google UK English Female',
      'Google US English', 'Microsoft David Online', 'Microsoft Mark Online',
      'Microsoft Ryan Online', 'Microsoft Christopher Online', 'Samantha', 'Daniel'
    ];

    for (const name of preferredNames) {
      const found = voices.find(v => v.name.includes(name));
      if (found) return found;
    }

    // Fallback to any en-US or en-GB voice, or first available
    return voices.find(v => v.lang === 'en-US' || v.lang === 'en-GB') || voices[0];
  },

  speak(text, { onStart, onEnd, onError } = {}) {
    if (!this.isTTSSupported()) {
      console.warn('SpeechSynthesis is not supported in this browser.');
      if (onError) onError('SpeechSynthesis not supported');
      return;
    }

    // Stop previous utterance
    this.stopSpeaking();

    const spokenText = this.cleanTextForSpeech(text);
    if (!spokenText) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(spokenText);
    const voice = this.getBestVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = this.getSpeed();
    utterance.pitch = this.getPitch();

    utterance.onstart = () => {
      this._isSpeaking = true;
      if (this._onSpeakingChange) this._onSpeakingChange(true);
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this._isSpeaking = false;
      if (this._onSpeakingChange) this._onSpeakingChange(false);
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      this._isSpeaking = false;
      if (this._onSpeakingChange) this._onSpeakingChange(false);
      if (onError) onError(e);
    };

    window.speechSynthesis.speak(utterance);
  },

  stopSpeaking() {
    if (this.isTTSSupported()) {
      window.speechSynthesis.cancel();
      this._isSpeaking = false;
      if (this._onSpeakingChange) this._onSpeakingChange(false);
    }
  },

  isSpeaking() {
    return this._isSpeaking || (this.isTTSSupported() && window.speechSynthesis.speaking);
  },

  // --- SPEECH RECOGNITION (TADASHI Listening) ---

  startListening({ onResult, onInterim, onEnd, onError } = {}) {
    if (!this.isSTTSupported()) {
      const err = 'Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.';
      if (onError) onError(err);
      return false;
    }

    // Stop speaking while user talks to avoid echo
    this.stopSpeaking();

    // If already listening, restart cleanly
    if (this.recognition) {
      try { this.recognition.abort(); } catch (e) {}
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    let finalTranscript = '';

    rec.onstart = () => {
      this._isListening = true;
      if (this._onListeningChange) this._onListeningChange(true);
    };

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
      console.warn('Speech recognition event error:', event.error);
      this._isListening = false;
      if (this._onListeningChange) this._onListeningChange(false);
      if (onError) onError(event.error);
    };

    rec.onend = () => {
      this._isListening = false;
      if (this._onListeningChange) this._onListeningChange(false);
      if (onEnd) onEnd(finalTranscript.trim());
    };

    this.recognition = rec;

    try {
      rec.start();
      return true;
    } catch (err) {
      this._isListening = false;
      if (this._onListeningChange) this._onListeningChange(false);
      if (onError) onError(err.message);
      return false;
    }
  },

  stopListening() {
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
      this.recognition = null;
    }
    this._isListening = false;
    if (this._onListeningChange) this._onListeningChange(false);
  },

  isListening() {
    return this._isListening;
  }
};

// Initialize voices preload in browser
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    Voice.getAvailableVoices();
  };
}
