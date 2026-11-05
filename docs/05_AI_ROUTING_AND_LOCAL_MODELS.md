# AI routing: Ollama + LiteLLM + TADASHI Agent Router

## Product roles

### Ollama
Use Ollama for local inference on the PC. It exposes local APIs and supports tool calling for compatible models. Model/tool support must be tested model-by-model. A local Ollama endpoint is not a universal aggregator for all provider keys.

- Local API is commonly available at `http://localhost:11434`.
- No local inference should require internet after the model is downloaded, except capabilities that explicitly need online services.
- Keep Ollama on loopback/private trusted interfaces. Never expose port `11434` directly to the public internet.
- The TADASHI cloud server cannot call a user's `localhost`; localhost refers to the server itself. Use a local PC agent with an authenticated outbound connection or a private VPN/tunnel.

### LiteLLM
Use LiteLLM as an optional unified gateway for hosted model providers when the user wants several cloud providers under one API. It can provide a common request interface and routing/fallback/virtual-key/budget functions depending on deployment configuration.

- Run it server-side, behind authentication/network restrictions.
- Store provider API keys in a secret manager/runtime environment.
- Keep the LiteLLM master/admin key separate from the TADASHI runtime key.
- Do not expose the admin UI or master key to browser code or the model.
- Add a provider only after current docs, regional availability, privacy terms, pricing and tool-calling behavior are checked.

### TADASHI Agent Router
This is TADASHI's own policy layer. It selects local, cloud or deterministic execution. It is not replaced by LiteLLM.

## Suggested routing policy

| Task class | Default | Fallback / notes |
|---|---|---|
| Page navigation / basic CRUD | Deterministic local domain service | No LLM required |
| Read local task/calendar summary | Deterministic local code; local model optional | Works without network |
| Simple natural-language intent | Local Ollama if installed and model passes tool tests | Deterministic clarification if model offline |
| Complex planning / long reasoning | Hosted model via LiteLLM if user policy permits | Local model with reduced capability; disclose reduced quality |
| Sensitive/private context | Local route by default when feasible | Ask before sending to cloud if user policy requires |
| Skill/code generation | Sandboxed draft model route | Never install/run directly; test + approval |
| Web research / live facts | Online tools plus hosted model | Offline: say current verification unavailable |
| Voice | Separate STT/TTS adapters | Browser speech may be online/platform-dependent; local STT/TTS optional |

## Provider-neutral interface

```ts
export interface AIRequest {
  taskClass: "intent" | "planning" | "summarization" | "tool_selection" | "skill_draft";
  messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: unknown }>;
  tools?: ToolSchema[];
  privacy: "local_only" | "cloud_allowed";
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export interface AIResponse {
  provider: string;
  model: string;
  text?: string;
  toolCalls?: Array<{ name: string; arguments: unknown }>;
  usage?: { inputTokens?: number; outputTokens?: number };
  latencyMs: number;
}

export interface AIProvider {
  id: string;
  isAvailable(): Promise<boolean>;
  generate(request: AIRequest, signal: AbortSignal): Promise<AIResponse>;
}
```

The model router must:
- maintain an allow-list of configured providers/models;
- choose based on task class, connectivity, privacy, latency and budget;
- check tool support and schema reliability for each model;
- have timeouts and bounded retries/fallbacks;
- record provider/model/latency/cost metadata without logging secrets or unnecessary personal prompt content;
- never allow an AI provider to choose a higher privilege level for itself.

## Credentials and network topology

```text
TADASHI API / Orchestrator
  |-- HTTPS private --> LiteLLM gateway --> hosted provider APIs
  |
  +-- authenticated outbound device channel --> PC Local Agent
                                                 |
                                                 +-- http://127.0.0.1:11434 --> Ollama
```

- The PC agent registers device identity and scopes. It should initiate outbound connectivity; do not ask the user to port-forward Ollama.
- If the cloud cannot reach PC agent, queue PC-specific actions until the device reconnects.
- On full internet loss, the PC web app/agent can use local Ollama and local database; the phone can still use cached data and supported local deterministic operations.

## LiteLLM configuration template

See `infra/litellm-config.yaml.example`. Replace placeholder model names with currently supported deployment identifiers from official docs. Do not commit any key values.

## Model selection checklist

Before enabling a model, test:
- valid structured output/schema adherence;
- function/tool-call accuracy with the same TADASHI tool schema;
- hallucinated or duplicate tool calls;
- cancellation, timeouts and streaming;
- privacy/data retention terms and region;
- cost per expected workload and budget enforcement;
- local memory/VRAM/RAM and latency for Ollama models;
- safe behavior when tools/providers fail.

Do not hardcode a currently popular model name into business logic. Use configuration and periodically re-check provider lifecycle/availability.
