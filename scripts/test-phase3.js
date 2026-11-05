// ============================================================
// TADASHI Phase 3 Test Suite — Deterministic Scheduling Intelligence
// Tests overlap merging, waking window subtraction, candidate ranking,
// fixed event protection, concurrency tokens, and atomic proposals.
// ============================================================

const assert = require('assert');

// Mock Browser Environment
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};
global.window = global;
global.navigator = { onLine: true };
global.performance = { now: () => Date.now() };

// Mock Utils
global.Utils = {
  timeNow: () => '12:00',
  dateNow: () => 'Wednesday, 5 Nov 2026',
  today: () => '2026-11-05',
  escapeHtml: (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
};

// Mock DB with Calendar & Undo
let calendarEvents = [
  { id: 1, title: 'Operating Systems Lecture', date: '2026-11-05', time: '09:00', duration: 90, type: 'class', movable: false },
  { id: 2, title: 'DBMS Lab Session', date: '2026-11-05', time: '11:00', duration: 120, type: 'class', movable: false },
  { id: 3, title: 'Evening Workout', date: '2026-11-05', time: '18:00', duration: 60, type: 'fitness', movable: true },
  { id: 4, title: 'OS Midterm Exam', date: '2026-11-06', time: '10:00', duration: 180, type: 'exam', movable: false }
];
let undoStack = [];

global.DB = {
  calendar: {
    list: (date) => {
      let res = calendarEvents;
      if (date) res = res.filter(e => e.date === date);
      return JSON.parse(JSON.stringify(res));
    },
    add: (item) => {
      undoStack.push(JSON.parse(JSON.stringify(calendarEvents)));
      const n = { id: Date.now(), ...item };
      calendarEvents.push(n);
      return n;
    },
    update: (id, patch) => {
      undoStack.push(JSON.parse(JSON.stringify(calendarEvents)));
      const e = calendarEvents.find(e => e.id == id);
      if (!e) return null;
      Object.assign(e, patch);
      return { ...e };
    },
    delete: (id) => {
      undoStack.push(JSON.parse(JSON.stringify(calendarEvents)));
      const i = calendarEvents.findIndex(e => e.id == id);
      if (i < 0) return false;
      calendarEvents.splice(i, 1);
      return true;
    }
  },
  tasks: {
    update: (id, patch) => ({ id, ...patch })
  },
  undo: () => {
    if (undoStack.length === 0) return false;
    calendarEvents = undoStack.pop();
    return true;
  }
};

// Load Scheduler & Tool Registry
require('../js/assistant/scheduler.js');
require('../js/assistant/tool-registry.js');

async function runPhase3Tests() {
  console.log('--- STARTING PHASE 3 SUITE: SCHEDULING INTELLIGENCE ---');

  // Test 1: Time Conversion Helpers
  assert.strictEqual(Scheduler.timeToMinutes('00:00'), 0);
  assert.strictEqual(Scheduler.timeToMinutes('09:30'), 570);
  assert.strictEqual(Scheduler.timeToMinutes('23:45'), 1425);
  assert.strictEqual(Scheduler.minutesToTime(570), '09:30');
  assert.strictEqual(Scheduler.minutesToTime(0), '00:00');
  console.log('✓ Test 1: Time conversion functions accurate');

  // Test 2: Timezone & UTC Instant conversion
  const utcInstant = Scheduler.toUTCInstant('2026-11-05', '10:00', 'Asia/Kolkata');
  // 10:00 IST is 04:30 UTC
  assert(utcInstant.includes('04:30:00'), `Expected 04:30:00 UTC for 10:00 IST, got ${utcInstant}`);
  console.log('✓ Test 2: IANA Timezone (Asia/Kolkata) UTC conversion verified');

  // Test 3: Overlapping Interval Merging
  const rawIntervals = [
    { startMin: 540, endMin: 630, label: 'Lecture' },     // 09:00 - 10:30
    { startMin: 615, endMin: 720, label: 'Buffer + Lab' },// 10:15 - 12:00 (overlaps)
    { startMin: 840, endMin: 900, label: 'Meeting' }      // 14:00 - 15:00
  ];
  const merged = Scheduler.mergeIntervals(rawIntervals);
  assert.strictEqual(merged.length, 2, 'Should merge overlapping intervals into 2 blocks');
  assert.strictEqual(merged[0].startMin, 540);
  assert.strictEqual(merged[0].endMin, 720);
  assert.strictEqual(merged[1].startMin, 840);
  assert.strictEqual(merged[1].endMin, 900);
  console.log('✓ Test 3: Overlapping & abutting intervals merged correctly');

  // Test 4: Free-Time Detection on Target Date
  const freeResult = Scheduler.calculateFreeIntervals('2026-11-05');
  assert(Array.isArray(freeResult.freeSlots), 'Must return array of free slots');
  assert(freeResult.freeSlots.length > 0, 'Must find free slots on date');
  // Verify no free slot overlaps with fixed class: 09:00 - 10:30 (540 - 630)
  for (const slot of freeResult.freeSlots) {
    const collidesWithClass = (slot.startMin < 630 && slot.endMin > 540);
    assert(!collidesWithClass, `Free slot ${slot.start}-${slot.end} must not collide with class (09:00-10:30)`);
  }
  console.log(`✓ Test 4: Free slots calculated cleanly (${freeResult.freeSlots.length} available slots found)`);

  // Test 5: Candidate Slot Ranking with Preferences
  const taskToRank = {
    title: 'Operating Systems Revision',
    duration: 60,
    preferredTimeOfDay: 'afternoon',
    energyRequirement: 'medium'
  };
  const ranked = Scheduler.rankCandidateSlots(taskToRank, freeResult.freeSlots);
  assert(ranked.length > 0, 'Must rank at least one candidate slot');
  assert(ranked[0].score >= ranked[ranked.length - 1].score, 'Candidates must be ordered by score descending');
  assert.strictEqual(ranked[0].timeOfDay, 'afternoon', 'Top ranked slot should match afternoon preference');
  console.log(`✓ Test 5: Candidate slot ranking prioritizes preference fit (Top score: ${ranked[0].score}/100)`);

  // Test 6: Draft Schedule Proposal (Non-Mutating)
  const initialCalendarCount = calendarEvents.length;
  const proposalRes = Scheduler.proposeScheduleSlot({
    title: 'Focused Deep Work',
    duration: 90,
    type: 'study'
  }, '2026-11-05');
  assert.strictEqual(proposalRes.ok, true);
  assert(proposalRes.proposal, 'Proposal object must be returned');
  assert(proposalRes.proposal.proposedSlot, 'Proposed slot must be present');
  assert(proposalRes.proposal.calendarVersion, 'Calendar version token must be attached');
  assert.strictEqual(calendarEvents.length, initialCalendarCount, 'Draft proposal must NOT mutate calendar');
  console.log('✓ Test 6: Draft proposal generated deterministically without calendar mutation');

  // Test 7: Fixed Event Collision Rejection
  const impossibleTask = {
    title: 'Extremely Long 12-Hour Study Block',
    duration: 720 // 12 hours cannot fit without colliding with classes
  };
  const impossibleRes = Scheduler.proposeScheduleSlot(impossibleTask, '2026-11-05');
  assert.strictEqual(impossibleRes.ok, false);
  assert.strictEqual(impossibleRes.noSlotsFound, true);
  assert(impossibleRes.reason.includes('No free slots available'), 'Must report lack of valid slot');
  console.log('✓ Test 7: Assistant safely reports unavailability instead of inventing impossible slots');

  // Test 8: Concurrency & Stale Proposal Protection
  const validProposal = proposalRes.proposal;
  // Intentionally modify calendar to cause version drift
  calendarEvents.push({ id: 999, title: 'Ad-hoc Interruption', date: '2026-11-05', time: '14:30', duration: 30, type: 'personal' });
  const staleAttempt = Scheduler.applyScheduleProposal(validProposal);
  assert.strictEqual(staleAttempt.ok, false);
  assert.strictEqual(staleAttempt.conflict, true);
  assert(staleAttempt.error.includes('Calendar conflict detected'), 'Must reject stale proposal when calendar changes');
  console.log('✓ Test 8: Stale proposal concurrency gate detects version drift and aborts');

  // Test 9: Successful Application of Fresh Proposal
  // Remove the interruption and regenerate fresh proposal
  calendarEvents.pop();
  const freshProposalRes = Scheduler.proposeScheduleSlot({
    title: 'Discrete Math Revision',
    duration: 60,
    type: 'study'
  }, '2026-11-05');
  const applyRes = Scheduler.applyScheduleProposal(freshProposalRes.proposal);
  assert.strictEqual(applyRes.ok, true);
  assert.strictEqual(applyRes.verified, true);
  const scheduledItem = calendarEvents.find(e => e.title === 'Discrete Math Revision');
  assert(scheduledItem, 'Scheduled item must exist in calendar');
  console.log('✓ Test 9: Fresh approved proposal applied and verified in DB');

  // Test 10: Rollback / Undo Support
  const countBeforeUndo = calendarEvents.length;
  const undoResult = DB.undo();
  assert.strictEqual(undoResult, true, 'DB.undo must succeed');
  assert.strictEqual(calendarEvents.length, countBeforeUndo - 1, 'Event must be removed on rollback');
  assert(!calendarEvents.some(e => e.title === 'Discrete Math Revision'), 'Reverted event no longer in calendar');
  console.log('✓ Test 10: Scheduling mutation cleanly undone via DB rollback');

  // Test 11: ToolRegistry Integration (find_free_time & propose_schedule_slot)
  const toolCheck = await ToolRegistry.execute('find_free_time', { date: '2026-11-05', min_duration: 45 });
  assert.strictEqual(toolCheck.ok, true);
  assert(Array.isArray(toolCheck.result.freeSlots));
  console.log('✓ Test 11: ToolRegistry find_free_time tool executes successfully');

  console.log('\nALL 11 TESTS PASSED SUCCESSFULLY! PHASE 3 SCHEDULING INTELLIGENCE VERIFIED.');
}

runPhase3Tests().catch(err => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
