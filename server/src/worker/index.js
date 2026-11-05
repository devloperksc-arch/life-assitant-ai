// ============================================================
// TADASHI LifeOS — 24/7 Cloud Worker & Background Job Queue (Phase 7)
// Manages autonomous scheduled jobs, heartbeats, dead-letter state,
// quiet hours awareness, emergency pause, and idempotency keys.
// ============================================================

class JobQueueMemory {
  constructor() {
    this.jobs = new Map();
    this.userPauseFlags = new Map(); // userId -> boolean
  }

  reset() {
    this.jobs.clear();
    this.userPauseFlags.clear();
  }
}

const queueStore = new JobQueueMemory();

// Check if hour is in quiet hours (23:00 - 07:00 IST)
function isQuietHours(hour) {
  return hour >= 23 || hour < 7;
}

// Queue a new scheduled background job
function queueJob(options) {
  if (!options || !options.userId || !options.kind) {
    throw new Error('Job must have userId and kind');
  }

  const idempotencyKey = options.idempotencyKey || `job_${options.userId}_${options.kind}_${Date.now()}`;

  // Idempotency check: prevent duplicate job on restarts
  for (const existing of queueStore.jobs.values()) {
    if (existing.idempotencyKey === idempotencyKey && existing.status !== 'cancelled') {
      return { job: existing, duplicate: true };
    }
  }

  const job = {
    id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: options.userId,
    kind: options.kind, // 'reminder' | 'agenda_digest' | 'backup' | 'pc_sync'
    payload: options.payload || {},
    idempotencyKey,
    runAt: options.runAt ? new Date(options.runAt).toISOString() : new Date().toISOString(),
    status: 'queued', // 'queued' | 'running' | 'completed' | 'failed' | 'dead_letter' | 'cancelled'
    attempts: 0,
    maxRetries: options.maxRetries !== undefined ? options.maxRetries : 3,
    priority: options.priority || 'normal', // 'normal' | 'high' | 'critical'
    targetScope: options.targetScope || 'cloud', // 'cloud' | 'pc_local'
    workerId: null,
    leaseExpiresAt: null,
    lastError: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  queueStore.jobs.set(job.id, job);
  return { job, duplicate: false };
}

// Process Due Jobs Loop
async function processDueJobs(options = {}) {
  const now = new Date();
  const workerId = options.workerId || `worker_${process.pid}`;
  const pcAgentConnected = !!options.pcAgentConnected;
  const processed = [];
  const deferred = [];
  const deadLetter = [];

  for (const job of queueStore.jobs.values()) {
    // Skip if job not due or not queued
    if (job.status !== 'queued') continue;
    if (new Date(job.runAt) > now) continue;

    // Check emergency user pause
    if (queueStore.userPauseFlags.get(job.userId) === true) {
      continue;
    }

    // Check quiet hours: non-critical jobs defer to 07:00 AM
    const currentHour = now.getHours(); // Local or user timezone
    if (isQuietHours(currentHour) && job.priority !== 'critical') {
      const tomorrow7Am = new Date(now);
      tomorrow7Am.setHours(7, 0, 0, 0);
      if (tomorrow7Am <= now) tomorrow7Am.setDate(tomorrow7Am.getDate() + 1);
      job.runAt = tomorrow7Am.toISOString();
      job.updatedAt = now.toISOString();
      deferred.push({ id: job.id, reason: 'quiet_hours_deferred', newRunAt: job.runAt });
      continue;
    }

    // Check scope: PC-local work waits for PC agent reconnect
    if (job.targetScope === 'pc_local' && !pcAgentConnected) {
      deferred.push({ id: job.id, reason: 'waiting_for_pc_agent' });
      continue;
    }

    // Acquire lease
    job.status = 'running';
    job.workerId = workerId;
    job.leaseExpiresAt = new Date(now.getTime() + 60000).toISOString();
    job.attempts += 1;
    job.updatedAt = now.toISOString();

    // Execute job
    try {
      if (typeof options.executor === 'function') {
        await Promise.resolve(options.executor(job));
      }

      job.status = 'completed';
      job.updatedAt = new Date().toISOString();
      processed.push({ id: job.id, status: 'completed' });

    } catch(err) {
      job.lastError = err.message;
      job.updatedAt = new Date().toISOString();

      if (job.attempts >= job.maxRetries) {
        job.status = 'dead_letter';
        deadLetter.push({ id: job.id, attempts: job.attempts, error: err.message });
      } else {
        // Exponential backoff retry
        const backoffMinutes = Math.pow(2, job.attempts);
        job.runAt = new Date(now.getTime() + (backoffMinutes * 60000)).toISOString();
        job.status = 'queued';
        job.workerId = null;
      }
    }
  }

  return {
    processedCount: processed.length,
    deferredCount: deferred.length,
    deadLetterCount: deadLetter.length,
    processed,
    deferred,
    deadLetter
  };
}

// Emergency Pause & Cancel Controls
function pauseAllJobs(userId, isPaused = true) {
  queueStore.userPauseFlags.set(userId, !!isPaused);
  return { userId, isPaused: !!isPaused };
}

function cancelJob(jobId) {
  const job = queueStore.jobs.get(jobId);
  if (!job) return false;
  job.status = 'cancelled';
  job.updatedAt = new Date().toISOString();
  return true;
}

function retryDeadLetter(jobId) {
  const job = queueStore.jobs.get(jobId);
  if (!job || job.status !== 'dead_letter') return false;
  job.status = 'queued';
  job.attempts = 0;
  job.lastError = null;
  job.runAt = new Date().toISOString();
  job.updatedAt = new Date().toISOString();
  return true;
}

function listJobs(userId, status) {
  let list = Array.from(queueStore.jobs.values());
  if (userId) list = list.filter(j => j.userId === userId);
  if (status) list = list.filter(j => j.status === status);
  return list;
}

module.exports = {
  queueJob,
  processDueJobs,
  pauseAllJobs,
  cancelJob,
  retryDeadLetter,
  listJobs,
  _queueStore: queueStore
};
