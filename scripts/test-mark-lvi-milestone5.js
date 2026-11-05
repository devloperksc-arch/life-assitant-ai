// ============================================================
// TADASHI LifeOS — Automated Test Suite: Mark LVI Milestone 5
// Offline Voice Architecture, Provider Adapters & Text Fallback
// ============================================================

const assert = require('assert');
const Voice = require('../js/lib/voice.js');
const { PCAgent } = require('../server/src/agent/pc-agent.js');

async function runMilestone5Tests() {
  console.log('--- RUNNING MARK LVI MILESTONE 5 TEST SUITE ---');

  // ------------------------------------------------------------
  // Test 1: STT & TTS Provider Registry & Listing
  // ------------------------------------------------------------
  console.log('\n[Test 1] Provider-Neutral STT and TTS Registration & Discovery');

  const initialSTT = Voice.listSTTProviders();
  const initialTTS = Voice.listTTSProviders();

  assert(initialSTT.length >= 3, `Expected at least 3 STT providers, found: ${initialSTT.length}`);
  assert(initialTTS.length >= 3, `Expected at least 3 TTS providers, found: ${initialTTS.length}`);

  const sttIds = initialSTT.map(p => p.id);
  assert(sttIds.includes('web_speech'), 'Must include web_speech STT provider');
  assert(sttIds.includes('local_whisper'), 'Must include local_whisper STT provider');
  assert(sttIds.includes('mock'), 'Must include mock STT provider');

  const ttsIds = initialTTS.map(p => p.id);
  assert(ttsIds.includes('web_speech'), 'Must include web_speech TTS provider');
  assert(ttsIds.includes('local_piper'), 'Must include local_piper TTS provider');
  assert(ttsIds.includes('mock'), 'Must include mock TTS provider');

  // Custom provider registration
  let customTTSCalled = false;
  Voice.registerTTSProvider('custom_neural', {
    name: 'Custom Neural TTS',
    isAvailable: () => true,
    speak: (text, opts) => {
      customTTSCalled = true;
      if (opts.onStart) opts.onStart();
      if (opts.onEnd) opts.onEnd();
    },
    stopSpeaking: () => {}
  });

  Voice.setTTSProvider('custom_neural');
  assert.strictEqual(Voice.getTTSProvider(), 'custom_neural', 'Active TTS provider must be custom_neural');

  // Malformed provider registration rejection
  assert.throws(() => {
    Voice.registerTTSProvider('invalid_tts', { name: 'Invalid' });
  }, /must implement speak and stopSpeaking methods/, 'Must reject TTS provider missing required methods');

  assert.throws(() => {
    Voice.registerSTTProvider('invalid_stt', { name: 'Invalid' });
  }, /must implement startListening and stopListening methods/, 'Must reject STT provider missing required methods');

  // Switching to unregistered provider should throw
  assert.throws(() => {
    Voice.setSTTProvider('non_existent_provider');
  }, /is not registered/, 'Must reject non-registered STT provider');

  console.log('✓ Provider registration, validation, and discovery verified');

  // ------------------------------------------------------------
  // Test 2: Visible Voice State Machine & Listeners
  // ------------------------------------------------------------
  console.log('\n[Test 2] Visible Voice and Microphone State Machine');

  Voice.setSTTProvider('mock');
  Voice.setTTSProvider('mock');

  const stateTransitions = [];
  const unregisterListener = Voice.onVoiceStateChange((state, details) => {
    stateTransitions.push({ state, details });
  });

  assert.strictEqual(Voice.getVoiceState(), Voice.STATES.IDLE, 'Initial voice state must be idle');

  // Simulate Push-to-Talk speech input
  Voice.startPushToTalk({
    onInterim: (text) => {},
    onResult: (text) => {},
    onEnd: (text) => {}
  });

  assert.strictEqual(Voice.getVoiceState(), Voice.STATES.LISTENING, 'State must transition to listening');
  assert.strictEqual(Voice.isListening(), true, 'isListening() must return true');

  // Simulate mock provider interim & final results
  const mockSTT = Voice.getActiveSTTProvider();
  mockSTT.simulateInterim('Tadashi plan my');
  mockSTT.simulateResult('Tadashi plan my day');

  assert.strictEqual(Voice.isListening(), false, 'isListening() must return false after result completion');

  // Test muting / disabling voice output
  Voice.setVoiceOutputEnabled(false);
  assert.strictEqual(Voice.isVoiceOutputEnabled(), false, 'Voice output must be disabled');
  assert.strictEqual(Voice.getVoiceState(), Voice.STATES.MUTED, 'State must reflect muted');

  Voice.setVoiceOutputEnabled(true);
  assert.strictEqual(Voice.isVoiceOutputEnabled(), true, 'Voice output must be enabled');
  assert.strictEqual(Voice.getVoiceState(), Voice.STATES.IDLE, 'State must return to idle');

  unregisterListener();
  assert(stateTransitions.length >= 3, 'State transitions must have been recorded by listener');
  console.log(`✓ Voice state transitions verified (${stateTransitions.length} events logged)`);

  // ------------------------------------------------------------
  // Test 3: Immediate Interruption (Barge-In) & Speech Cancellation
  // ------------------------------------------------------------
  console.log('\n[Test 3] Immediate Interruption (Barge-In) and Speech Stop');

  let speechInterrupted = false;
  Voice.registerTTSProvider('interruptible_tts', {
    name: 'Interruptible TTS',
    isAvailable: () => true,
    speak: (text, opts) => {
      if (opts.onStart) opts.onStart();
    },
    stopSpeaking: () => {
      speechInterrupted = true;
    }
  });

  Voice.setTTSProvider('interruptible_tts');
  Voice.speak('This is a long Tadashi briefing that should be stopped immediately.');

  assert.strictEqual(Voice.getVoiceState(), Voice.STATES.SPEAKING, 'Must enter speaking state');
  assert.strictEqual(Voice.isSpeaking(), true, 'isSpeaking() must return true');

  // Barge-In: user interrupts speech
  Voice.bargeIn();

  assert.strictEqual(speechInterrupted, true, 'stopSpeaking on active TTS provider must be called');
  assert.strictEqual(Voice.getVoiceState(), Voice.STATES.IDLE, 'Voice state must reset to idle after bargeIn');
  assert.strictEqual(Voice.isSpeaking(), false, 'isSpeaking() must be false');

  // Verify startListening automatically halts active speech
  Voice.speak('Another response playing...');
  assert.strictEqual(Voice.getVoiceState(), Voice.STATES.SPEAKING);

  Voice.startListening({ onResult: () => {} });
  assert.strictEqual(Voice.getVoiceState(), Voice.STATES.LISTENING, 'startListening must barge in and become listening');
  assert.strictEqual(Voice.isSpeaking(), false, 'Assistant speech must be halted');

  Voice.stopListening();
  assert.strictEqual(Voice.getVoiceState(), Voice.STATES.IDLE);
  console.log('✓ Barge-in and speech cancellation verified');

  // ------------------------------------------------------------
  // Test 4: Text-Only Fallback on Voice Failures
  // ------------------------------------------------------------
  console.log('\n[Test 4] Text-Only Fallback on STT/TTS Failures');

  // Register failing provider (simulates denied mic permissions / offline local server)
  let capturedError = null;
  Voice.registerSTTProvider('failing_stt', {
    name: 'Failing STT',
    isAvailable: () => false,
    startListening: (opts) => {
      return false;
    },
    stopListening: () => {}
  });

  Voice.setSTTProvider('failing_stt');
  assert.strictEqual(Voice.isSTTSupported(), false, 'isSTTSupported must report false for unavailable provider');

  const startRes = Voice.startListening({
    onError: (err) => {
      capturedError = err;
    }
  });

  assert.strictEqual(startRes, false, 'startListening must return false when provider is unavailable');
  assert(capturedError && capturedError.includes('Falling back to text input'), 'Must provide clear text fallback message');
  assert.strictEqual(Voice.getVoiceState(), Voice.STATES.OFFLINE, 'Voice state must report offline');

  // Text cleaning for speech
  const rawMarkdown = '```python\nprint("hello")\n```\nHere is **important** information with `code` and https://example.com!';
  const cleaned = Voice.cleanTextForSpeech(rawMarkdown);
  assert(!cleaned.includes('```'), 'Code fences must be stripped');
  assert(!cleaned.includes('**'), 'Markdown stars must be stripped');
  assert(!cleaned.includes('https://'), 'URLs must be stripped');
  assert(cleaned.includes('important information with code'), 'Text content must be preserved');

  console.log('✓ Text-only fallback and audio text sanitization verified');

  // ------------------------------------------------------------
  // Test 5: PC Local Agent Voice Capabilities & Heartbeat Telemetry
  // ------------------------------------------------------------
  console.log('\n[Test 5] PC Local Agent Voice Telemetry & Diagnostics');

  const agent = new PCAgent({
    deviceId: 'test_dev_voice',
    deviceName: 'Test Voice PC'
  });

  const voiceCaps = await agent.checkVoiceCapabilities();
  assert(voiceCaps.stt, 'Must report STT capabilities');
  assert(voiceCaps.tts, 'Must report TTS capabilities');
  assert.strictEqual(voiceCaps.textOnlyFallback, true, 'textOnlyFallback must be guaranteed');

  // Verify heartbeat payload format
  let emittedHeartbeat = null;
  agent.sessionToken = 'mock_session_token';
  const originalFetch = global.fetch;
  global.fetch = async (url, opts) => {
    if (url.includes('/agent/heartbeat')) {
      emittedHeartbeat = JSON.parse(opts.body);
      return { ok: true, status: 200, json: async () => ({}) };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };

  const hbRes = await agent.sendHeartbeat();
  global.fetch = originalFetch;

  assert.strictEqual(hbRes.ok, true, 'Heartbeat must succeed');
  assert(emittedHeartbeat.voiceCapabilities, 'Heartbeat payload must include voiceCapabilities');
  assert(emittedHeartbeat.voiceCapabilities.stt.includes('web_speech'), 'Heartbeat must advertise web_speech STT');
  assert(emittedHeartbeat.voiceCapabilities.tts.includes('local_piper'), 'Heartbeat must advertise local_piper TTS');

  console.log('✓ PC Local Agent voice telemetry verified');

  // ------------------------------------------------------------
  // Test 6: Speed, Pitch & Preference Persistence
  // ------------------------------------------------------------
  console.log('\n[Test 6] Voice Preferences & Bounds Clamping');

  Voice.setSpeed(1.2);
  assert.strictEqual(Voice.getSpeed(), 1.2, 'Speed should be set to 1.2');

  Voice.setSpeed(5.0); // should clamp to 1.5
  assert.strictEqual(Voice.getSpeed(), 1.5, 'Speed must clamp to 1.5 maximum');

  Voice.setPitch(0.5); // should clamp to 0.7
  assert.strictEqual(Voice.getPitch(), 0.7, 'Pitch must clamp to 0.7 minimum');

  Voice.setSpeed(1.0);
  Voice.setPitch(1.0);
  console.log('✓ Voice preference controls and safety bounds verified');

  console.log('\n======================================================');
  console.log('ALL MARK LVI MILESTONE 5 VOICE ACCEPTANCE TESTS PASSED');
  console.log('======================================================\n');
}

runMilestone5Tests().catch(err => {
  console.error('\nTEST SUITE FAILED:', err);
  process.exit(1);
});
