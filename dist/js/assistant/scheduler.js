// ============================================================
// TADASHI LifeOS — Deterministic Scheduling Intelligence (Phase 3)
// Calculates availability, free-time intervals, conflict detection,
// slot ranking, and atomic rescheduling proposals with version gates.
// ============================================================

(function(window) {
  'use strict';

  // Default Constraints & Profile
  const DEFAULT_CONSTRAINTS = {
    timeZone: 'Asia/Kolkata', // IST (+05:30)
    wakingHours: { start: '07:00', end: '23:00' }, // 7 AM to 11 PM
    sleepWindow: { start: '23:00', end: '07:00' },
    defaultBufferMinutes: 15, // Gap between meetings/tasks
    minFocusChunkMinutes: 30, // Minimum scheduling chunk
    fixedCommitmentTypes: ['exam', 'class', 'deadline', 'flight'],
    meals: [
      { name: 'Breakfast', start: '08:30', duration: 30, movable: false },
      { name: 'Lunch',     start: '13:00', duration: 45, movable: false },
      { name: 'Dinner',    start: '20:30', duration: 45, movable: false }
    ],
    energyProfile: {
      morning:   { start: '07:00', end: '12:00', energy: 'high' },
      afternoon: { start: '12:00', end: '17:00', energy: 'medium' },
      evening:   { start: '17:00', end: '21:00', energy: 'high' },
      night:     { start: '21:00', end: '23:00', energy: 'low' }
    }
  };

  // Convert "HH:MM" to minutes from midnight
  function timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.trim().split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return (h * 60) + m;
  }

  // Convert minutes from midnight to "HH:MM"
  function minutesToTime(mins) {
    const total = Math.max(0, Math.min(1439, Math.round(mins)));
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Timezone helper: format ISO UTC instant with IANA timeZone offset
  function toUTCInstant(dateStr, timeStr, timeZone) {
    const zone = timeZone || DEFAULT_CONSTRAINTS.timeZone;
    // For Asia/Kolkata (+05:30)
    const [year, month, day] = (dateStr || '').split('-').map(Number);
    const [hour, minute] = (timeStr || '00:00').split(':').map(Number);
    // Create Date assuming local time represents the target timezone
    const d = new Date(Date.UTC(year, (month || 1) - 1, day || 1, hour || 0, minute || 0));
    // Adjust by +5:30 if Asia/Kolkata
    if (zone === 'Asia/Kolkata') {
      d.setUTCMinutes(d.getUTCMinutes() - 330);
    }
    return d.toISOString();
  }

  // Calendar State Versioning Token (prevents stale concurrent writes)
  function getCalendarVersion(dateStr) {
    if (!window.DB || !window.DB.calendar) return 'v0';
    const evts = window.DB.calendar.list(dateStr) || [];
    const ids = evts.map(e => `${e.id}:${e.time}:${e.duration}`).sort().join('|');
    let hash = 0;
    for (let i = 0; i < ids.length; i++) {
      hash = ((hash << 5) - hash) + ids.charCodeAt(i);
      hash |= 0;
    }
    return `cal_v${Math.abs(hash)}_${evts.length}`;
  }

  // Merge Overlapping Intervals: array of { startMin, endMin }
  function mergeIntervals(intervals) {
    if (!intervals || intervals.length === 0) return [];
    const sorted = [...intervals].sort((a, b) => a.startMin - b.startMin);
    const merged = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const prev = merged[merged.length - 1];

      if (current.startMin <= prev.endMin) {
        prev.endMin = Math.max(prev.endMin, current.endMin);
        if (current.label && !prev.label.includes(current.label)) {
          prev.label += ` + ${current.label}`;
        }
      } else {
        merged.push({ ...current });
      }
    }
    return merged;
  }

  // Calculate Free-Time Intervals for a given date
  function calculateFreeIntervals(dateStr, options) {
    const opt = options || {};
    const constraints = { ...DEFAULT_CONSTRAINTS, ...opt };
    const wakingStart = timeToMinutes(constraints.wakingHours.start);
    const wakingEnd = timeToMinutes(constraints.wakingHours.end);
    const buffer = opt.bufferMinutes !== undefined ? opt.bufferMinutes : constraints.defaultBufferMinutes;

    // 1. Gather busy blocks
    const busyIntervals = [];

    // Existing calendar events from DB
    if (window.DB && window.DB.calendar) {
      const events = window.DB.calendar.list(dateStr) || [];
      for (const ev of events) {
        const dur = Number(ev.duration) || 0;
        if (dur <= 0) continue; // Skip zero-duration milestones/deadlines
        const evStart = timeToMinutes(ev.time);
        const evEnd = evStart + dur;

        // Apply buffer around calendar events
        busyIntervals.push({
          startMin: Math.max(wakingStart, evStart - buffer),
          endMin: Math.min(wakingEnd, evEnd + buffer),
          label: ev.title || 'Event',
          isMovable: ev.movable !== false && !constraints.fixedCommitmentTypes.includes(ev.type),
          eventId: ev.id
        });
      }
    }

    // Add fixed meals if enabled
    if (opt.includeMeals !== false && Array.isArray(constraints.meals)) {
      for (const meal of constraints.meals) {
        const mStart = timeToMinutes(meal.start);
        const mEnd = mStart + meal.duration;
        busyIntervals.push({
          startMin: Math.max(wakingStart, mStart),
          endMin: Math.min(wakingEnd, mEnd),
          label: meal.name,
          isMovable: false
        });
      }
    }

    // 2. Merge overlapping busy blocks
    const mergedBusy = mergeIntervals(busyIntervals);

    // 3. Subtract merged busy intervals from waking window
    const freeSlots = [];
    let currentMarker = wakingStart;

    for (const b of mergedBusy) {
      if (b.startMin > currentMarker) {
        const slotDuration = b.startMin - currentMarker;
        if (slotDuration >= (opt.minSlotMinutes || 15)) {
          freeSlots.push({
            start: minutesToTime(currentMarker),
            end: minutesToTime(b.startMin),
            startMin: currentMarker,
            endMin: b.startMin,
            durationMinutes: slotDuration
          });
        }
      }
      currentMarker = Math.max(currentMarker, b.endMin);
    }

    // Final interval before night sleep
    if (currentMarker < wakingEnd) {
      const finalDuration = wakingEnd - currentMarker;
      if (finalDuration >= (opt.minSlotMinutes || 15)) {
        freeSlots.push({
          start: minutesToTime(currentMarker),
          end: minutesToTime(wakingEnd),
          startMin: currentMarker,
          endMin: wakingEnd,
          durationMinutes: finalDuration
        });
      }
    }

    return {
      date: dateStr,
      timeZone: constraints.timeZone,
      wakingHours: constraints.wakingHours,
      busyCount: mergedBusy.length,
      freeSlots
    };
  }

  // Rank Candidate Free Slots for an Item
  function rankCandidateSlots(item, freeSlots, options) {
    const opt = options || {};
    const duration = Number(item.duration || item.estimatedDuration) || 60;
    const minChunk = Number(item.minimumChunk || item.minChunk) || duration;
    const preferredTime = item.preferredTimeOfDay || opt.preferredTimeOfDay || 'morning';
    const energyNeeded = item.energyRequirement || opt.energyRequirement || 'high';

    const candidates = [];

    for (const slot of freeSlots) {
      if (slot.durationMinutes < minChunk) continue;

      let score = 50; // Base score

      // Duration fit: bonus if slot fits full duration without fragmentation
      if (slot.durationMinutes >= duration) {
        score += 25;
        // Clean leftover bonus (leaves >= 30m for other things or exact match)
        const remainder = slot.durationMinutes - duration;
        if (remainder === 0 || remainder >= 30) score += 10;
      } else {
        // Can fit at least the minimum chunk
        score += 10;
      }

      // Time-of-day fit
      const slotHour = Math.floor(slot.startMin / 60);
      let slotTimeOfDay = 'night';
      if (slotHour >= 7 && slotHour < 12) slotTimeOfDay = 'morning';
      else if (slotHour >= 12 && slotHour < 17) slotTimeOfDay = 'afternoon';
      else if (slotHour >= 17 && slotHour < 21) slotTimeOfDay = 'evening';

      if (slotTimeOfDay === preferredTime) score += 20;

      // Energy fit
      if (energyNeeded === 'high' && (slotTimeOfDay === 'morning' || slotTimeOfDay === 'evening')) {
        score += 15;
      } else if (energyNeeded === 'low' && slotTimeOfDay === 'night') {
        score += 15;
      }

      candidates.push({
        slot,
        fitDuration: Math.min(duration, slot.durationMinutes),
        proposedStart: slot.start,
        proposedEnd: minutesToTime(slot.startMin + Math.min(duration, slot.durationMinutes)),
        score: Math.min(100, score),
        timeOfDay: slotTimeOfDay
      });
    }

    // Sort descending by score
    return candidates.sort((a, b) => b.score - a.score);
  }

  // Generate a Draft Schedule Proposal (Non-Mutating)
  function proposeScheduleSlot(item, targetDate, options) {
    if (!item || !item.title) {
      return { ok: false, error: 'Item must have a title to schedule' };
    }

    const date = targetDate || (typeof Utils !== 'undefined' ? Utils.today() : new Date().toISOString().slice(0, 10));
    const freeData = calculateFreeIntervals(date, options);
    const candidates = rankCandidateSlots(item, freeData.freeSlots, options);

    if (candidates.length === 0) {
      return {
        ok: false,
        noSlotsFound: true,
        date,
        reason: `No free slots available on ${date} that satisfy the duration requirement of ${item.duration || 60} minutes.`
      };
    }

    const bestCandidate = candidates[0];
    const duration = bestCandidate.fitDuration;
    const calendarVersion = getCalendarVersion(date);

    const proposal = {
      id: `prop_sched_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'schedule_slot',
      calendarVersion,
      date,
      item: {
        title: item.title,
        duration,
        type: item.type || 'study',
        color: item.color || 'cyan',
        taskId: item.taskId || null
      },
      proposedSlot: {
        startTime: bestCandidate.proposedStart,
        endTime: bestCandidate.proposedEnd,
        durationMinutes: duration,
        timeZone: freeData.timeZone,
        score: bestCandidate.score
      },
      reason: `Found optimal free slot from ${bestCandidate.proposedStart} to ${bestCandidate.proposedEnd} (${bestCandidate.timeOfDay} window, score: ${bestCandidate.score}/100). Preserves all fixed commitments and buffers.`,
      consequence: `Adds "${item.title}" to calendar on ${date} from ${bestCandidate.proposedStart} to ${bestCandidate.proposedEnd}.`,
      createdAt: new Date().toISOString()
    };

    return {
      ok: true,
      proposal
    };
  }

  // Apply Schedule Proposal (Atomic, Version-Gated)
  function applyScheduleProposal(proposal) {
    if (!proposal || !proposal.item || !proposal.proposedSlot) {
      return { ok: false, error: 'Invalid proposal object' };
    }

    const { date, calendarVersion, item, proposedSlot } = proposal;

    // 1. Concurrency Check: Verify calendar version has not drifted
    const currentVersion = getCalendarVersion(date);
    if (calendarVersion && currentVersion !== calendarVersion) {
      return {
        ok: false,
        conflict: true,
        error: `Calendar conflict detected: calendar state on ${date} changed since this proposal was drafted. Please request a fresh schedule slot.`
      };
    }

    // 2. Conflict Re-Check: Ensure proposed slot is still free
    const checkStart = timeToMinutes(proposedSlot.startTime);
    const checkEnd = timeToMinutes(proposedSlot.endTime);
    const existingEvents = (window.DB && window.DB.calendar) ? window.DB.calendar.list(date) : [];

    for (const ev of existingEvents) {
      const evStart = timeToMinutes(ev.time);
      const evEnd = evStart + (Number(ev.duration) || 0);
      if (checkStart < evEnd && checkEnd > evStart) {
        return {
          ok: false,
          conflict: true,
          error: `Slot collision: "${ev.title}" (${ev.time}, ${ev.duration}m) conflicts with proposed time.`
        };
      }
    }

    // 3. Mutate Calendar through DB domain service
    if (!window.DB || !window.DB.calendar) {
      return { ok: false, error: 'Database service not available' };
    }

    const newEvent = window.DB.calendar.add({
      title: item.title,
      date,
      time: proposedSlot.startTime,
      duration: proposedSlot.durationMinutes,
      type: item.type || 'study',
      color: item.color || 'cyan'
    });

    // If linked to a task, update task status
    if (item.taskId && window.DB.tasks) {
      window.DB.tasks.update(item.taskId, { deadline: date, status: 'in-progress' });
    }

    return {
      ok: true,
      verified: true,
      event: newEvent,
      message: `Successfully scheduled "${item.title}" on ${date} at ${proposedSlot.startTime}.`
    };
  }

  // Public Interface
  const Scheduler = {
    DEFAULT_CONSTRAINTS,
    timeToMinutes,
    minutesToTime,
    toUTCInstant,
    getCalendarVersion,
    mergeIntervals,
    calculateFreeIntervals,
    rankCandidateSlots,
    proposeScheduleSlot,
    applyScheduleProposal
  };

  window.Scheduler = Scheduler;

})(typeof window !== 'undefined' ? window : global);
