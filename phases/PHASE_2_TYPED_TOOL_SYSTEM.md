# Phase 2 — typed tool registry, policy and action verification

Precondition: Phase 1 has been reviewed. Follow `docs/03_API_AND_TOOL_CONTRACTS.md` and the security rules.

Build the central tool registry and a policy layer that becomes the only supported path for AI-driven actions.

Requirements:
- Define typed tool contracts and runtime schemas.
- Separate read/navigation/reversible-write/external-effect/destructive risk classes.
- Validate user/device scopes server-side (or trusted local boundary where backend is not yet available).
- Convert existing Gemini function/tool definitions into adapters to domain services; do not let the model mutate DB/localStorage directly.
- Add proposal cards with before/after details and Approve/Edit/Reject for actions requiring review.
- Add idempotency keys, request IDs, precondition/version checks, audit records and verified results.
- Unknown tools, arbitrary code, SQL, shell and DOM selectors must be rejected.
- Ensure external/destructive actions require explicit approval and undo/backup where possible.
- Keep existing manual UI actions functional.

Start with safe tools: get current context, navigate to allowed page, search LifeOS, get today's agenda, list tasks, get calendar, get sync status. Add writes only after policy and audit tests pass.

Tests:
- invalid tool names/schema/scopes rejected;
- model cannot self-grant scopes;
- actions only run through registered domain service;
- retries do not duplicate writes;
- user can approve/edit/reject exact proposal;
- success is shown only after DB/domain persistence is checked;
- destructive action snapshots/confirmation remain intact.

Do not introduce PC shell control or skill runtime yet.
