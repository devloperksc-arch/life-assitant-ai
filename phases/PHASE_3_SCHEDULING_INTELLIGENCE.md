# Phase 3 — free-time detection and intelligent rescheduling

Precondition: Phase 2's typed tool/approval system is in place.

Build a deterministic scheduling service. Use AI to understand the request and explain options, but use code to calculate availability and validate conflicts.

Requirements:
- Add schedule fields for fixed/flexible/task/habit/buffer, status, priority, movable flag, earliest/latest, deadline, estimated duration, minimum chunk, preferred time of day, energy requirement, location and travel buffers.
- Store UTC instants plus IANA timezone for user-facing local time.
- Maintain user constraints: sleep, recurring college/work hours, meals, commute, workout windows, focus preferences, no-move blocks and minimum recovery/buffer rules.
- Calculate free intervals by expanding recurring events, adding buffers, merging busy intervals and subtracting from the allowed waking window.
- Rank candidate slots by preference fit, deadline risk, energy fit and disruption cost.
- Produce a draft proposal with before/after, reason, affected records and resource versions. Do not mutate calendar until approved.
- Bind approval to exact proposal version, user and resource versions; reject stale proposal if calendar changed.
- Add rollback where safely possible.
- Initially support TADASHI's own calendar. External Google/Outlook writes wait for owner OAuth setup and separate integration approval.

Tests:
- overlap merging and subtraction;
- timezones and DST boundaries;
- recurring event expansion;
- deadline, minimum duration/chunk and buffers;
- fixed event protection;
- concurrent edit/stale proposal;
- approval required before mutation;
- rollback/undo behavior.

The assistant must say when it cannot find a valid slot rather than invent one.
