# Phase 5 — hybrid AI routing with Ollama and LiteLLM

Precondition: Backend API, identity, tool registry and secret boundary exist. Owner has provisioned local Ollama and at least one hosted provider key in a protected secret store.

Requirements:
- Implement provider-neutral `AIProvider` interface and TADASHI policy router.
- Integrate Ollama on the primary PC through a local PC Agent. Do not have cloud server call localhost and do not expose port 11434 publicly.
- Integrate one hosted provider first. Add LiteLLM as a private gateway when multi-provider routing is actually being enabled.
- Keep all provider secrets server-side. Separate LiteLLM master/admin key from the restricted TADASHI runtime key.
- Route by task class, connectivity, local-only privacy setting, tool capability, latency and spend budgets.
- Keep basic deterministic LifeOS actions working without any model.
- Implement bounded retries, timeout, cancellation, fallback and safe provider failure messages.
- Evaluate tool calling and structured output on each model. Do not assume all Ollama models support the same tools.
- Add telemetry for provider/model/latency/token/cost with privacy-safe logs.

Tests:
- same tool schema works with one local and one hosted model;
- local-only requests never leave device;
- cloud unavailable falls back safely;
- local model unavailable does not pretend offline AI is available;
- tool hallucinations/invalid JSON are rejected;
- budget and timeout stop runaway calls;
- no credentials in browser, logs or responses;
- Ollama port not reachable from public network.

Do not enable all available provider keys by default. Owner chooses providers and limits.
