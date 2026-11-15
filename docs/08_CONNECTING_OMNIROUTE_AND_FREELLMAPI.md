# Connecting OmniRoute & FreeLLMAPI to TADASHI LifeOS

TADASHI LifeOS includes native support for OpenAI-compatible AI Gateways via `GatewayProvider` in `js/assistant/ai-router.js`. This allows you to connect smart multi-provider routers like **OmniRoute** and **FreeLLMAPI** directly into TADASHI without writing code or modifying application files.

---

## 1. What are OmniRoute and FreeLLMAPI?

| Tool | GitHub Repository | Primary Role | Default Endpoint |
|---|---|---|---|
| **OmniRoute** | [`cheaper-inference/OmniRoute`](https://github.com/cheaper-inference/OmniRoute) | Unified AI gateway supporting 1,400+ models across free and paid providers, with context compression (RTK/Caveman) and quota-aware auto-fallback. | `http://127.0.0.1:8080/v1` |
| **FreeLLMAPI** | [`tashfeenahmed/freellmapi`](https://github.com/tashfeenahmed/freellmapi) | Local proxy that aggregates free developer API keys (Groq, Together, DeepInfra, Mistral, Google Gemini, OpenRouter, Cerebras) with automatic HTTP 429 failover. | `http://127.0.0.1:3001/v1` |

Both tools run on your local machine and expose a standard OpenAI-compatible API (`/v1/chat/completions` and `/v1/models`).

---

## 2. How to Launch Them on Your PC

### Option A: Launching OmniRoute
Requirements: Node.js (v18+) and Git.

```bash
# 1. Clone the OmniRoute repository
git clone https://github.com/cheaper-inference/OmniRoute.git
cd OmniRoute

# 2. Install dependencies
npm install

# 3. Start the gateway server
npm run start
```
*OmniRoute starts listening on `http://localhost:8080/v1`.*

---

### Option B: Launching FreeLLMAPI
Requirements: Node.js (v20+) or Docker.

**Via Node.js:**
```bash
# 1. Clone the FreeLLMAPI repository
git clone https://github.com/tashfeenahmed/freellmapi.git
cd freellmapi

# 2. Install dependencies and start
npm install
npm run dev
```

**Via Docker (One-liner):**
```bash
curl -fsSL https://freellmapi.co/install.sh | bash
```
*FreeLLMAPI starts listening on `http://localhost:3001/v1` with a dashboard on `http://localhost:3001`.*

---

## 3. Connecting to TADASHI LifeOS

1. Open TADASHI LifeOS in your browser: **`http://localhost:8000/`**.
2. Navigate to **Manage (22 Domains)** → open **Settings & Voice** (or navigate to `http://localhost:8000/#settings`).
3. Under the **AI Gateway / Smart Router** card:
   - Click the preset button:
     - Click **⚡ OmniRoute** to auto-fill `http://127.0.0.1:8080/v1` and model `auto`.
     - Or click **🔄 FreeLLMAPI** to auto-fill `http://127.0.0.1:3001/v1` and model `auto`.
   - Toggle **Active Provider** switch to **ON**.
   - Optional: Enter your Bearer API key if your gateway requires one.
   - Click **Save Gateway**.
4. Click **Test Gateway Ping**:
   - TADASHI probes `${endpoint}/models` and displays a real-time status badge (e.g. `🟢 Online: 1400+ models ready`).

---

## 4. How the AI Router Hierarchy Works

When you chat with TADASHI (via the chat input, voice modal, or daily synthesis):

```mermaid
flowchart TD
    Prompt[User Input / Voice / Action] --> Router{AIRouter Resolve}
    Router -- Gateway Enabled & Healthy --> Gateway[AI Gateway: OmniRoute / FreeLLMAPI]
    Router -- Gateway Disabled / Offline --> Cloud{Gemini Cloud Key?}
    Cloud -- Yes --> Gemini[Google Gemini 1.5/2.0 API]
    Cloud -- No --> Ollama{Local Ollama Running?}
    Ollama -- Yes --> LocalOllama[Ollama 127.0.0.1:11434]
    Ollama -- No --> Deterministic[Deterministic Local DB Tools]
    Gateway -- Error / Fallback --> Cloud
```

- **Tool Calling Support**: TADASHI passes its 22 domain tool declarations (`manage_tasks`, `manage_calendar`, `manage_fitness`, etc.) in standard OpenAI format. The gateway executes tools through TADASHI's policy engine and confirmation gates.
- **Failover Chain**: If OmniRoute or FreeLLMAPI rate-limits or fails, `AIRouter` automatically falls back to Gemini Cloud or local Ollama.
- **Privacy Mode**: In `local_only` mode, local loopback gateway instances (`127.0.0.1` or `localhost`) are strictly permitted while remote internet endpoints are blocked.
