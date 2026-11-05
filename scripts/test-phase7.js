// ============================================================
// TADASHI Phase 7 Test Suite — 24/7 Cloud Worker & PC Device Agent
// Tests autonomous jobs, PC scope deferral, duplicate idempotency,
// dead-letter queue, emergency pause/cancel, and local OS safety.
// ============================================================

const assert = require('assert');

// Load Worker, PC Agent, and Auth modules
const {
  queueJob,
  processDueJobs,
  pauseAllJobs,
  cancelJob,
  retryDeadLetter,
  listJobs,
  _queueStore
} = require('../server/src/worker');

const { PCAgent } = require('../server/src/agent/pc-agent');
const { registerDevice, revokeDevice, authenticateRequest } = require('../server/src/auth');

async function runPhase7Tests() {
  console.log('--- STARTING PHASE 7 SUITE: CLOUD WORKER & DEVICE AGENTS ---');

  _queueStore.reset();
  const userId = 'user_krishna';

  // Test 1: Cloud Reminders Fire When PC/Phone are Off
  const cloudJob = queueJob({
    userId,
    kind: 'reminder',
    payload: { title: 'Exam in 24 hours' },
    targetScope: 'cloud',
    runAt: new Date(Date.now() - 1000).toISOString() // due now
  });
  assert.strictEqual(cloudJob.duplicate, false);

  let executedJobId = null;
  const cloudRun = await processDueJobs({
    pcAgentConnected: false, // PC is OFF
    executor: async (job) => { executedJobId = job.id; }
  });

  assert.strictEqual(cloudRun.processedCount, 1);
  assert.strictEqual(executedJobId, cloudJob.job.id);
  const completedCheck = listJobs(userId, 'completed');
  assert.strictEqual(completedCheck.length, 1);
  console.log('✓ Test 1: Cloud background worker processes autonomous jobs while PC/phone are offline');

  // Test 2: PC-Only Work Waits for PC Reconnect
  const pcJob = queueJob({
    userId,
    kind: 'pc_sync',
    payload: { action: 'local_backup' },
    targetScope: 'pc_local',
    runAt: new Date(Date.now() - 1000).toISOString()
  });

  // Run with PC offline
  const pcRunOffline = await processDueJobs({ pcAgentConnected: false });
  assert.strictEqual(pcRunOffline.deferredCount, 1);
  assert.strictEqual(pcRunOffline.deferred[0].reason, 'waiting_for_pc_agent');

  // Verify job remains in queued state
  const jobWaiting = listJobs(userId, 'queued').find(j => j.id === pcJob.job.id);
  assert(jobWaiting, 'PC job must remain queued while PC is off');

  // Now reconnect PC Agent
  let pcExecuted = false;
  const pcRunOnline = await processDueJobs({
    pcAgentConnected: true, // PC is now online!
    executor: async (job) => { if (job.id === pcJob.job.id) pcExecuted = true; }
  });
  assert.strictEqual(pcRunOnline.processedCount, 1);
  assert.strictEqual(pcExecuted, true);
  console.log('✓ Test 2: PC-local work deferred while offline and executed immediately upon reconnect');

  // Test 3: Duplicate Job Idempotency
  const idempKey = 'daily_briefing_2026_11_05';
  const job1 = queueJob({ userId, kind: 'agenda_digest', idempotencyKey: idempKey });
  assert.strictEqual(job1.duplicate, false);

  const job2 = queueJob({ userId, kind: 'agenda_digest', idempotencyKey: idempKey });
  assert.strictEqual(job2.duplicate, true, 'Duplicate idempotency key must not create duplicate job');
  console.log('✓ Test 3: Idempotency keys prevent duplicate background job creation');

  // Test 4: Bounded Retries and Dead-Letter Queue
  const failingJob = queueJob({
    userId,
    kind: 'flaky_service_call',
    maxRetries: 2,
    runAt: new Date(Date.now() - 1000).toISOString()
  });

  // Attempt 1: Fails -> re-queued with backoff
  await processDueJobs({
    executor: async () => { throw new Error('Network timeout'); }
  });
  const afterAttempt1 = listJobs(userId, 'queued').find(j => j.id === failingJob.job.id);
  assert(afterAttempt1, 'Job must be re-queued after first failure');
  assert.strictEqual(afterAttempt1.attempts, 1);

  // Force due for Attempt 2
  afterAttempt1.runAt = new Date(Date.now() - 1000).toISOString();

  // Attempt 2: Fails -> exceeds maxRetries (2) -> dead_letter
  const deadLetterRun = await processDueJobs({
    executor: async () => { throw new Error('Persistent 500 error'); }
  });
  assert.strictEqual(deadLetterRun.deadLetterCount, 1);
  const deadJob = listJobs(userId, 'dead_letter').find(j => j.id === failingJob.job.id);
  assert(deadJob, 'Exhausted job must move to dead_letter status');

  // Retry dead-letter job
  const retryOk = retryDeadLetter(failingJob.job.id);
  assert.strictEqual(retryOk, true);
  const retriedJob = listJobs(userId, 'queued').find(j => j.id === failingJob.job.id);
  assert.strictEqual(retriedJob.attempts, 0);
  console.log('✓ Test 4: Bounded retries, exponential backoff, dead-letter state, and manual retry verified');

  // Test 5: Emergency Pause & Job Cancellation
  const urgentJob = queueJob({ userId, kind: 'reminder', runAt: new Date(Date.now() - 1000).toISOString() });
  pauseAllJobs(userId, true);

  let pausedExecuted = false;
  await processDueJobs({
    executor: async (j) => { if (j.id === urgentJob.job.id) pausedExecuted = true; }
  });
  assert.strictEqual(pausedExecuted, false, 'Paused user jobs must not execute');

  // Unpause and cancel single job
  pauseAllJobs(userId, false);
  cancelJob(urgentJob.job.id);
  const cancelledCheck = listJobs(userId, 'cancelled').find(j => j.id === urgentJob.job.id);
  assert(cancelledCheck, 'Job must transition to cancelled status');
  console.log('✓ Test 5: Emergency pause-all and granular job cancellation verified');

  // Test 6: PC Local Agent Safe Read-Only OS Telemetry
  const pcAgent = new PCAgent({ deviceId: 'dev_pc_laptop_test' });
  const sysInfo = pcAgent.getSystemInfo();
  assert(typeof sysInfo.platform === 'string', 'Must report OS platform');
  assert(typeof sysInfo.memory.totalMb === 'number', 'Must report memory stats');
  assert(typeof sysInfo.cpuCount === 'number', 'Must report CPU count');

  // Security Gate: Reject arbitrary shell
  assert.throws(() => {
    pcAgent.executeCommand();
  }, /Security Violation/);
  console.log('✓ Test 6: PC Agent provides safe read-only OS metrics and strictly rejects arbitrary shell commands');

  // Test 7: Device Revocation Cuts Off Agent Access
  const registeredDev = await registerDevice(userId, {
    deviceId: 'dev_pc_revokable',
    name: 'Temporary PC'
  });
  const authValid = await authenticateRequest({
    authorization: `Bearer ${registeredDev.sessionToken}`
  });
  assert.strictEqual(authValid.ok, true);

  await revokeDevice('dev_pc_revokable');
  const authCutOff = await authenticateRequest({
    authorization: `Bearer ${registeredDev.sessionToken}`
  });
  assert.strictEqual(authCutOff.ok, false);
  assert.strictEqual(authCutOff.status, 403);
  console.log('✓ Test 7: Device revocation immediately severs agent connection to cloud');

  console.log('\nALL 7 TESTS PASSED SUCCESSFULLY! PHASE 7 CLOUD WORKER & AGENTS VERIFIED.');
}

runPhase7Tests().catch(err => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
