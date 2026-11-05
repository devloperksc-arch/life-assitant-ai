# Decisions to confirm with the owner

These do not block Phase 0 and most of Phase 1, but must be answered before implementing the corresponding integration.

| Question | Recommended default | Needed by |
|---|---|---|
| Is the current vanilla frontend retained? | Yes, at least through first working Arc Reactor and tool refactor | Phases 0–2 |
| Backend language/framework? | Node.js LTS + TypeScript + Fastify in separate backend package | Phase 2/4 |
| Authentication? | Established managed OIDC/OAuth provider; no custom password system initially | Phase 4 |
| Canonical database? | PostgreSQL | Phase 4 |
| Local browser storage? | IndexedDB for records/outbox | Phase 4 |
| First hosted AI provider? | Pick one provider first; add LiteLLM when multiple are needed | Phase 5 |
| LiteLLM gateway? | Yes for multi-provider routing; private deployment and scoped runtime key | Phase 5 |
| Local AI? | Ollama on primary PC | Phase 5 |
| Android app strategy? | PWA first; native Android only for concrete missing APIs | Phases 1/7 |
| Local PC actions? | PC Local Agent with individually scoped tools | Phase 7 |
| Calendar source? | TADASHI calendar first, external read-only integration next | Phase 3/4 |
| Schedule auto-apply policy? | Always propose first until user configures narrow safe automation | Phase 3 |
| Conversation retention? | Minimal by default, user-configurable | Phase 4/6 |
| Skill runtime? | Isolated worker/container with default-deny permissions | Phase 6 |
| Cloud hosting/budget? | Owner-selected; do not create spend without explicit approval | Phase 4/7 |

Antigravity should not ask all of these before it can do Phase 0. It should record unknowns and proceed with safe audit work.
