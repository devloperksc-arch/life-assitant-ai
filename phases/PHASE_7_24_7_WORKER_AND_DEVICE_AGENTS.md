# Phase 7 — 24/7 cloud worker and local device agents

Precondition: cloud backend, auth, sync, typed tools and operational controls exist. Owner has approved hosting, budget, device scopes and notification channel.

Cloud worker:
- run scheduled jobs independent of phone/PC availability;
- use durable queue/job table, leases/heartbeats, bounded retries, dead-letter state and idempotency keys;
- support pause-all, pause-by-user, cancel and retry;
- do not duplicate reminders after restart;
- respect quiet hours/timezone and notification preferences;
- audit all autonomous actions and send approval requests instead of bypassing policy.

PC Local Agent:
- outbound authenticated registration/connection to cloud;
- local Ollama access via localhost only;
- individually scoped OS tools (start read-only; do not implement unrestricted shell);
- signed/versioned updates and device revoke;
- local jobs can run when offline and sync results when reconnected;
- do not let cloud execute a PC-only job if the PC is off.

Android:
- keep PWA for first release;
- native shell/companion only for specific OS/background integrations;
- explain Android notification/background limits and verify on target device.

Tests:
- cloud reminders fire when PC/phone are off;
- PC-only work waits for reconnect;
- duplicate job delivery is idempotent;
- retries and dead-letter behavior verified;
- emergency pause/cancel works;
- device revoke cuts off access;
- local-only actions remain on the PC.
