# Target architecture and recommended decisions

## Recommended default architecture

Use a **modular monolith for the TADASHI backend** at first; avoid premature microservices. Keep LiteLLM as a separate gateway process because it has its own provider adapters, credentials and lifecycle. Keep Ollama on the PC.

```text
Phone PWA / PC Browser
  | HTTPS + authenticated session
  v
TADASHI API (Node.js + TypeScript + Fastify)
  |-- Auth/session + device registry
  |-- LifeOS domain services + typed tool registry
  |-- Action policy / approval / audit
  |-- Scheduling service
  |-- Memory + skill metadata
  |-- Sync API + outbox/inbox processing
  |-- Job enqueue API
  |
  +--> PostgreSQL (canonical cross-device data)
  +--> Cloud worker + durable queue/scheduler
  +--> LiteLLM gateway --> selected hosted model providers
  +--> PC Local Agent (authenticated outbound connection) --> Ollama on localhost

Phone browser:
  IndexedDB + service-worker app-shell cache + pending sync outbox

PC browser:
  IndexedDB + pending sync outbox
  PC companion (later): secure local API to Ollama + explicit OS tool adapter
```

## Decisions recommended (record as ADRs before implementation)

### DEC-001 — Keep current frontend during backend introduction

Keep existing `index.html`, CSS and vanilla JavaScript architecture during Phase 0/1. Add the Arc Reactor as a self-contained module and adapt existing global events. Do not rewrite to React/Next/Vite without measured evidence and owner approval.

### DEC-002 — Backend stack

Recommended: Node.js LTS + TypeScript + Fastify for the TADASHI API and worker-facing services. Reasons: JavaScript is already used in the project; one language for tool schemas and domain integration; Fastify provides a small API foundation. Keep deployment and dependency choices documented. Add dependencies only in a dedicated backend package, not to the frontend accidentally.

### DEC-003 — Database and local persistence

- PostgreSQL is the authoritative account-level cross-device store.
- IndexedDB is the browser's local persistent store and outbox.
- Keep the existing localStorage data readable while introducing a migration/export path.
- Use explicit schema migrations and backups. Never silently discard old data.

### DEC-004 — Provider architecture

- `AIProvider` abstraction owned by TADASHI.
- Ollama adapter points to a local PC agent, not to a public exposed Ollama port.
- LiteLLM is the hosted-provider gateway, with API keys stored server-side.
- TADASHI's own router chooses local/cloud/deterministic processing according to policy.
- Model names are configuration, not hard-coded business logic.

### DEC-005 — Tool execution

All models call the same server/local-agent typed tool registry. Validate tool name, schema, user/device scopes, risk class, preconditions, idempotency and approval before execution. Do not expose arbitrary `eval`, SQL, shell or DOM control.

### DEC-006 — Skill acquisition

Skills are versioned packages with manifests, a declared capability set, least privilege and sandbox tests. Installation and permission expansion require user approval. Never equate skill creation with automatic base-model retraining.

### DEC-007 — Device strategy

Start with a responsive PWA. Add native Android/PC shells only when a concrete OS/background capability cannot be met by the PWA. A browser service worker is not a 24/7 agent process.

## Trust boundaries

1. Browser/PWA is untrusted; never store provider secrets there.
2. API is authenticated and validates every request.
3. Model output is untrusted; schema/policy validation required.
4. Imported documents, web content, chat history and skill source are untrusted data.
5. PC Local Agent is a separate device identity with explicit scopes; do not grant it full PC access by default.
6. LiteLLM gateway admin and runtime identities must be separate.

## Recommended initial deployment topology

- One HTTPS TADASHI web/API deployment.
- One managed or backed-up PostgreSQL database.
- One worker/queue service (can share backend code and deploy separately).
- One private LiteLLM gateway or hosted gateway if multiple providers are truly needed.
- Ollama on the user's PC, accessed only locally by PC Local Agent.
- No public port forwarding to Ollama.

Do not deploy until the non-code checklist is complete and owner approves hosting, cost limits and privacy policy.
