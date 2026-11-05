# TADASHI product requirements

## Product objective

TADASHI is one personal assistant available across phone and PC. It should provide a voice-first Arc Reactor control surface, understand the whole LifeOS through a safe tool layer, help plan/reschedule around real availability, operate with cloud intelligence when online and useful local capabilities when offline, and gain new capabilities through a reviewed skill lifecycle.

## User-facing capabilities

### A. Arc Reactor command centre
- Global entry point on every LifeOS page; does not force navigation away from the current page.
- Distinct idle, listening, transcribing, thinking, planning, speaking, awaiting-approval, executing, offline and error states.
- Live/correctable transcript, text fallback, push-to-talk and immediate stop/interruption.
- Voice and text conversation timeline with action cards and visible outcomes.
- Context chip showing current page/date/device and which personal domains are being used.
- Online/offline, active model, local model and sync status are visible.
- Reduced-motion, keyboard-only and touch-accessible controls.

### B. Whole-site control
- Navigate to existing pages and search across authorized domains.
- Read tasks, goals, routines, calendar, fitness, nutrition, finance and other currently implemented LifeOS domains through domain services.
- Create/update records through the typed tool registry; delete/reset operations require confirmation and backup/undo behavior.
- Show proposed changes before applying where policy requires it.
- Verify action success against the database/domain service before reporting completion.

### C. Scheduling intelligence
- Understand fixed commitments, flexible tasks, deadlines, estimated duration, minimum chunk, sleep, class/work, meal, travel and recovery buffers.
- Find free slots across a requested date range and timezone.
- Suggest multiple ranked options and explain trade-offs.
- Draft a rescheduling proposal with before/after view; approval is tied to an exact version and exact changes.
- Never move fixed or external events without explicit authorization.
- Detect concurrent calendar changes and reject stale proposals safely.
- Support external calendar sync only after OAuth, account, calendar ownership and write-scope setup are completed.

### D. Hybrid intelligence
- One provider-neutral model interface.
- Local Ollama model for PC-local/offline inference when available.
- LiteLLM or equivalent server-side gateway for hosted model providers when online.
- Model selection policy based on connectivity, task complexity, privacy, capabilities, latency and spend limits.
- Deterministic non-AI path for basic reads/writes if all models are unavailable.
- Same tool contracts and permission rules for cloud and local models.

### E. Memory and learning
- User-editable preference memory with provenance and confidence.
- Episodic history of important completed actions and user decisions.
- Searchable user-approved knowledge from files/notes/web captures with source references.
- Procedural skills: reusable tested workflows/tools with manifests, permissions, versions and rollback.
- Optional future fine-tuning is separate and must never be assumed necessary to “learn a skill.”
- User can inspect, edit, export and delete memories/skills.

### F. Always-on continuity
- Cloud worker handles scheduled notifications and jobs when the PC and phone are off.
- PC Local Agent handles PC-specific actions and local Ollama inference only when the PC is awake and agent is connected.
- Phone PWA handles cached shell and local data; mobile native/local model features are a later, hardware-dependent phase.
- Offline writes queue durably and synchronize when connected.
- Service worker is for PWA caching/event-driven tasks, not a guaranteed 24/7 process.

## Non-functional requirements

- Security: strict user/device isolation, least privilege, no browser-held provider keys, secret redaction.
- Reliability: idempotent mutations, retries with bounds, audit logs, backups and rollback.
- Privacy: send only task-relevant context to a cloud model; make cloud vs local processing visible.
- Performance: streaming where supported; timeout and fallback behavior; do not block main UI on long jobs.
- Accessibility: keyboard, screen reader labels, reduced motion, text alternative to voice.
- Portability: provider-neutral interfaces; do not couple LifeOS domains to one model provider.
- Observability: request IDs, sanitized logs, metrics for failure/latency/cost and worker health.

## Explicit non-goals for first release

- Autonomous unrestricted shell/OS access.
- AI-generated code executing directly in the production app.
- Silent self-editing or self-deployment.
- Automatic external messaging, purchases, bookings or calendar writes without policy-approved authorization.
- Guaranteed always-on browser/mobile background execution.
- Fine-tuning a foundation model as the default skill-acquisition mechanism.
