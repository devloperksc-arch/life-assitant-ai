# Security and operations rules

- Keep credentials in a server-side secret manager or protected runtime environment. `.env` files are local-only and must be ignored by Git. Commit only `.env.example` with blank placeholders.
- Rotate any credential that has appeared in a Git remote URL, commit, log, screenshot or shared archive. Removing it from the latest file is not enough if it exists in history.
- Use HTTPS for all remote app/API traffic. Use secure, HttpOnly, SameSite cookies or an established OAuth/OIDC flow for browser sessions; avoid long-lived bearer tokens in localStorage.
- Apply user/device authorization on every API request and tool execution. A model cannot grant itself a scope.
- Rate-limit login, model, tool, skill and file endpoints. Add provider spend/token budgets and max execution time.
- Treat imported PDFs, web pages, code, email and tool output as untrusted data. Prompt injection in data must not override the system/tool policy.
- Do not allow arbitrary model-generated shell/SQL/JavaScript. Build a small allow-listed tool surface.
- Keep Ollama bound to localhost/private trusted network. Never forward port 11434 directly to the public internet.
- Protect LiteLLM master/admin keys. Give TADASHI a scoped runtime key, not the master key.
- Encrypt backups; test a restore. Set retention, deletion and export behavior before storing personal history in the cloud.
- Cloud worker: use a durable queue, leases/heartbeats, retry limits, dead-letter queue, idempotency keys and an emergency pause switch.
- Record audit event IDs and outcomes, but never log raw prompts containing unnecessary private data or secrets.
