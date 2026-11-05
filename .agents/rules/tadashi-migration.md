---
trigger: always_on
description: TADASHI repository-specific safeguards and phased migration rules.
---

# TADASHI project rules

- Read the existing repository-root `AGENTS.md` before editing. It is not replaced by this file. Preserve all storage keys, script ordering, live-file mappings, line-ending requirements and user-data safety rules unless a reviewed migration plan explicitly changes them.
- The current UI is a vanilla HTML/CSS/JavaScript application. Preserve it in early phases; do not spontaneously migrate to React, Next.js, Vite or another framework.
- Inspect the currently checked-out code and branch before trusting documentation or this kit. Mark every repository claim as verified, contradicted or not yet checked.
- Keep the existing frontend operational as backend pieces are introduced. Put new backend code in a separate, clearly bounded service directory and document how to run it.
- Never commit credentials or place provider/API/OAuth/database secrets in frontend code, browser storage, URLs, screenshots, logs or test fixtures. Use environment variables or a managed secret store.
- Never expose Ollama's local API directly to the public internet. Use a local companion agent or authenticated private tunnel.
- AI models may only request registered, schema-validated tools. Never execute model-generated arbitrary code, SQL, shell, HTML or DOM selectors.
- Enforce user identity, scopes, risk classes, approval gates, idempotency keys, version checks, audit events and verification for tool execution.
- A schedule change is a draft proposal until the user approves it. Respect fixed commitments, time zones, deadlines, minimum chunks, buffers and calendar version conflicts.
- Offline writes go to a durable local outbox and must be idempotent when synchronized. Never silently discard or silently overwrite concurrent user edits.
- “Skill learning” means generating or configuring a versioned capability with a manifest, explicit least-privilege permissions, sandboxed tests, human approval, audit and rollback. Do not silently modify production code, grant new permissions or fine-tune model weights.
- Do not add packages, services, cloud resources, spend, OAuth scopes or production infrastructure without explaining why and recording the decision.
- Implement one roadmap phase at a time. Run the relevant acceptance tests before claiming completion.
- Never say a feature is complete because a screen or mock exists. Verify the end-to-end data/action path.
