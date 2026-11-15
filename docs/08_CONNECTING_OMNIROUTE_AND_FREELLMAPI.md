# Connecting OmniRoute & FreeLLMAPI to TADASHI LifeOS (Dual-Gateway Free-Only Architecture)

TADASHI LifeOS implements a production-grade, server-side **Dual-Gateway AI Router** designed to leverage **OmniRoute** as the primary gateway and **FreeLLMAPI** as an automatic failover gateway, enforcing a strict **Free-Only Policy** with zero surprise spending and server-only credentials.

---

## 1. Architectural Overview & Policy Guarantees

```text
Browser (TADASHI UI)
   │
   │ Authenticated request (Session token only; ZERO gateway secrets)
   ▼
TADASHI Backend / Vercel Serverless Function (/api/ai/chat)
   │
   ├─► Enforce Authentication & Request Size Limits
   ├─► Privacy Gate: If task is local_only, block from cloud server
   ├─► Enforce Strict Free-Model Allowlist (Reject paid models: gpt-4o, claude-3-5, etc.)
   │
   ├──► PRIMARY: OmniRoute (Server-to-Server)
   │       └── Uses approved free-tier upstream model
   │
   ├──► SECONDARY: FreeLLMAPI (Failover only)
   │       └── Triggered only on transient failures (408, 429, 5xx, network drops)
   │
   └──► IF BOTH FAIL: Fail closed with HTTP 503 (NO_FREE_CAPACITY).
           * ZERO surprise spending. NEVER invoke paid models or billable fallback.
```

### Core Policy Guarantees:
1. **OmniRoute Primary**: All online AI queries route first to OmniRoute.
2. **FreeLLMAPI Secondary (Failover Only)**: FreeLLMAPI is attempted only when OmniRoute encounters transient/infrastructure failure.
3. **Free-Tier Models Only**: Strict server-side allowlist (`AI_FREE_MODEL_ALLOWLIST`). Any requested model not on the allowlist (or any unallowlisted paid model like `gpt-4o`, `claude-3-5-sonnet`) is rejected immediately with HTTP 400 (`PAID_MODEL_BLOCKED`).
4. **Zero Surprise Spend**: In `free_only` routing mode, paid providers are completely disabled. If all free capacity is exhausted, the system fails closed with `NO_FREE_CAPACITY`.
5. **Zero Secret Leakage**: Gateway API keys and upstream tokens exist solely in server environment variables. They are never transmitted to browser JavaScript, DOM attributes, localStorage, telemetry, or client responses.
6. **Local-Only Privacy Invariant**: Tasks marked `local_only` are executed on-device by local Ollama on loopback (`127.0.0.1:11434`) and are strictly forbidden from transiting to cloud gateways.

---

## 2. Failover Policy Contract

Failover from OmniRoute to FreeLLMAPI occurs **only** for transient, network, or provider capacity errors:
- Connection refused / DNS resolution failure (`ECONNREFUSED`, `ENOTFOUND`)
- Gateway connection timeout (`408`, `AbortError`, request exceeding `AI_REQUEST_TIMEOUT_MS`)
- HTTP 429 Rate Limit / Free-tier quota exhaustion
- HTTP 500, 502, 503, 504 Gateway errors

**Failover is strictly prevented on:**
- HTTP 400 / 422 Bad Request or malformed schema (fails immediately)
- HTTP 401 / 403 Authentication or authorization failure (indicates operator config error)
- Model unallowlisted / Paid model rejected
- Client cancellation

---

## 3. Server Configuration & Environment Variables

Configure the following variables in your server environment (`server/.env` or Vercel Project Settings):

```env
# AI Routing Policy
AI_ROUTING_MODE=free_only
AI_PAID_MODELS_BLOCKED=true
AI_REQUEST_TIMEOUT_MS=45000
AI_MAX_FAILOVER_ATTEMPTS=1

# Primary AI Gateway (OmniRoute)
OMNIROUTE_BASE_URL=https://omniroute.yourdomain.com/v1
OMNIROUTE_API_KEY=your_omniroute_token_here
OMNIROUTE_MODEL=meta-llama/llama-3.2-3b-instruct:free

# Secondary AI Gateway (FreeLLMAPI)
FREELLMAPI_BASE_URL=https://freellmapi.yourdomain.com/v1
FREELLMAPI_API_KEY=your_freellm_token_here
FREELLMAPI_MODEL=meta-llama/llama-3.2-3b-instruct:free

# Strict Free-Tier Model Allowlist (comma-separated, wildcard supported: e.g. qwen/*)
AI_FREE_MODEL_ALLOWLIST=meta-llama/llama-3.2-3b-instruct:free,meta-llama/llama-3.1-8b-instruct:free,gemini-2.0-flash-exp:free,gemini-2.5-flash,mistralai/mistral-7b-instruct:free,qwen/qwen-2.5-7b-instruct:free
```

---

## 4. Deployment Topologies

### Topology A: Vercel Unified Deployment (Recommended)
- **Frontend**: Static production build served from `dist/` (`vercel.json` configured with `"outputDirectory": "dist"`).
- **Backend**: Vercel Serverless Functions in repository root `api/`:
  - `api/ai/chat.js` (`POST /api/ai/chat`)
  - `api/ai/health.js` (`GET /api/ai/health`)
  - `api/auth/register-device.js` (`POST /api/auth/register-device`)
- **Gateways**: Hosted externally on VPS / Fly.io / Railway or secured private tunnel. Note: `127.0.0.1` inside a Vercel function refers to the serverless container, not your local PC.

### Topology B: Standalone Node Service
- Frontend served statically (`python -m http.server 8000` or Nginx/Caddy/Vercel).
- Backend service running via `node server/src/server.js` on port `3000`.
- CORS configured via `CORS_ORIGINS` to accept requests from your frontend origin.

---

## 5. Local Development Quickstart (Windows PC)

To launch OmniRoute or FreeLLMAPI locally on your developer PC:

> [!TIP]
> **Windows PowerShell Execution Policy**: If PowerShell displays `PSSecurityException: running scripts is disabled`, use `npm.cmd` instead of `npm`, and ensure you run from your Desktop directory (`C:\Users\HP\Desktop`), never from `C:\WINDOWS\system32`.

### Launching OmniRoute:
```powershell
cd C:\Users\HP\Desktop
npx --yes omniroute
# Listens on http://127.0.0.1:8080/v1
```

### Launching FreeLLMAPI:
```powershell
cd C:\Users\HP\Desktop\freellmapi
npm.cmd install
npm.cmd run dev
# Listens on http://127.0.0.1:3001/v1
```

---

## 6. Verification and Health Checking

- **Safe Health Endpoint**: `GET /api/ai/health` (or `GET http://127.0.0.1:3000/ai/health`)
  - Returns current routing policy, allowlisted models, and gateway configuration status without exposing credentials.
- **Run Acceptance Test Suite**:
  ```bash
  node scripts/test-free-dual-gateway.js
  ```
  Runs all 12 unit and integration tests covering healthy primary calls, network failovers, 429 quota handling, 401 rejection, paid model blocks, and zero secret leakage.
