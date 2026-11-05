# Phase 1 — global Arc Reactor interface and voice loop

Precondition: Phase 0 audit has been reviewed and the owner approved the scope. Read the root `AGENTS.md`, the audit report, product requirements and UI acceptance tests.

Build a first working Arc Reactor control surface integrated into the existing app. Preserve the current frontend and domain pages; do not migrate frameworks.

Requirements:
- Create one globally available assistant entry point/shell that can open from every page without destroying current page state.
- Implement explicit state machine: idle, listening, transcribing, thinking, speaking, planning, awaiting_approval, executing, offline, error.
- Show animated reactor core, transcript, conversation history, current context, online/offline/model/sync status and action cards.
- Implement push-to-talk and text fallback using existing `Voice`/`AI` adapters where safe; isolate providers behind small controller interfaces so they can be replaced later.
- Support interrupt/stop speaking, cancel current turn and transcript correction.
- Microphone capture begins only after explicit user action and is visibly indicated. Do not implement always-listening wake word.
- Respect reduced-motion, keyboard and mobile touch controls.
- Use mock agent state only for UI development and label it as demo. Do not claim fake tool calls changed real data.
- Do not expose new provider credentials or widen permissions.

Tests:
- all reactor states render;
- microphone denied/unavailable still permits text chat;
- stop speaking works;
- current page is preserved when opening/closing assistant;
- keyboard and 375px/1280px layouts work;
- no console errors and no unsafe HTML interpolation.

Report files changed, real vs mock integrations, test results and remaining gaps. Do not start Phase 2 in the same change.
