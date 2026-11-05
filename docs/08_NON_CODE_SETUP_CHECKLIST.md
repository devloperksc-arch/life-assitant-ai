# Work required outside the codebase

This checklist is just as important as implementation. Antigravity cannot safely create accounts, accept legal terms, complete OAuth consent, choose your budget, rotate credentials or configure DNS without the owner's direct involvement.

## 1. Repository and account security — do first

- [ ] Confirm the GitHub repository owner/admin and the canonical default branch.
- [ ] Review branch differences before deciding whether `android` or `desktop` work should be merged/cherry-picked.
- [ ] Inspect Git remotes locally without sharing credential-bearing URLs.
- [ ] Revoke/rotate any GitHub token that was embedded in a Git remote URL or exposed in the uploaded archive.
- [ ] Check Git history for secrets; rotate affected credentials before considering history rewriting.
- [ ] Enable GitHub secret scanning/push protection if available on the repository plan.
- [ ] Enable branch protection or rulesets for the default branch; require review and CI checks.
- [ ] Use a dedicated deployment identity/token with minimum permissions; never use a personal all-access token in deployment.

## 2. Choose hosting and ownership

Owner decisions required:
- [ ] Choose hosting provider/region for TADASHI API and worker.
- [ ] Choose a domain/subdomain, e.g. `app.<your-domain>` and `api.<your-domain>`; do not purchase until owner approves cost.
- [ ] Choose managed PostgreSQL or a self-hosted database with a tested backup plan.
- [ ] Choose HTTPS/TLS and secret storage (hosting provider's secret manager preferred).
- [ ] Decide who owns the domain, hosting account and recovery email.
- [ ] Set monthly infrastructure budget and spending alerts.
- [ ] Decide data residency, retention, deletion and backup retention rules.

Minimum cloud services likely needed:
- API/web hosting (HTTPS).
- PostgreSQL.
- Worker process / scheduled job runtime.
- Durable queue or equivalent reliable job table/queue.
- Object storage only if user files will be uploaded to cloud.
- Monitoring/error reporting with secret redaction.

## 3. Model providers and cost controls

- [ ] Decide first hosted model provider. Start with one; add more only after routing works.
- [ ] Create provider account and API key yourself.
- [ ] Set account/project spend caps and usage alerts before enabling the key.
- [ ] Add the key to the hosting secret manager or local `.env` (never chat or Git).
- [ ] Decide whether LiteLLM is self-hosted or whether a simpler direct single-provider adapter is enough for the first release.
- [ ] If using LiteLLM, create a separate runtime key for TADASHI and protect the master/admin key.
- [ ] Review provider privacy, retention, region, training/use terms, available models and pricing.
- [ ] Decide which categories of personal data may be sent to cloud models. Prefer local-only for private domains unless the user opts in.

## 4. Ollama and PC hardware

On the main PC:
- [ ] Install Ollama from the official source.
- [ ] Record OS, CPU, RAM, GPU and available VRAM/storage.
- [ ] Select and download one candidate local model based on hardware, context length and tool-call support.
- [ ] Test model latency, memory use, structured JSON and TADASHI tool calls with realistic tasks.
- [ ] Ensure Ollama listens only on localhost/private trusted interfaces.
- [ ] Do not open port `11434` on the router/firewall or expose it through a public reverse proxy.
- [ ] Decide whether the PC Local Agent should start at login and what scopes it receives.
- [ ] Decide whether the PC must stay powered on for PC-local tasks. Cloud jobs continue independently.

For the phone:
- [ ] Decide whether the first release is PWA only (recommended) or needs native Android functions.
- [ ] Test real offline behavior on the target Android phone and browser.
- [ ] Understand that local LLM inference on the phone is optional and depends on memory, storage, battery and runtime compatibility.

## 5. Calendar and external integrations

- [ ] Decide whether TADASHI's own calendar or Google Calendar/Outlook is authoritative.
- [ ] Create a separate OAuth application in the chosen provider's developer console.
- [ ] Configure consent screen, redirect URLs, test users and verified publisher details as required.
- [ ] Request only calendar scopes needed. Read-only first; request write scopes only when ready.
- [ ] Test refresh-token storage/revocation and external event version/ETag handling.
- [ ] Enter fixed commitments, recurring class/work hours, sleep window, meal windows, commute buffers, workout preferences, no-move events and preferred focus blocks.
- [ ] Decide whether calendar mutations require approval every time or allow narrow rules (e.g. only move TADASHI-created flexible study blocks).

## 6. Voice setup

- [ ] Decide STT and TTS providers independently of the LLM provider.
- [ ] Test microphone permissions and audio output on PC and Android.
- [ ] Choose local STT/TTS if offline voice is a requirement; test resource use on actual hardware.
- [ ] Add clear user-facing notice/controls for microphone capture; do not enable always-listening by default.
- [ ] Decide whether wake-word support is in scope; defer until push-to-talk is reliable.

## 7. Auth, privacy and account recovery

- [ ] Choose an established OIDC/OAuth or managed auth service; avoid custom password handling in the first release.
- [ ] Decide whether passkeys/2FA are required.
- [ ] Decide account recovery and device-revocation procedure.
- [ ] Decide whether conversation transcripts are stored, for how long, and whether users can disable/delete them.
- [ ] Decide how memory is reviewed/edited/deleted and how cloud deletion propagates to local devices/backups.
- [ ] Create a privacy/security contact and incident response steps if this becomes a publicly accessible service.

## 8. Operations and maintenance

- [ ] Configure scheduled PostgreSQL backups and test a restore.
- [ ] Configure worker health checks, alerting, queue monitoring and failure notification.
- [ ] Configure log redaction and retention.
- [ ] Configure CI: syntax/lint/unit/integration/E2E as appropriate.
- [ ] Configure error monitoring and uptime checks without logging private prompts or secrets.
- [ ] Define how to disable model providers, revoke devices, pause all autonomous jobs and roll back deployments.
- [ ] Decide who reviews dependency/security updates and how often.

## 9. Owner decision record

Before cloud Phase 4/5/7, fill this in:

| Decision | Owner choice | Date |
|---|---|---|
| Hosting provider + region | TBD | TBD |
| Domain/subdomain | TBD | TBD |
| PostgreSQL provider | TBD | TBD |
| Auth provider | TBD | TBD |
| First cloud model provider | TBD | TBD |
| LiteLLM now or later | Later recommended | TBD |
| Monthly spend cap | TBD | TBD |
| Local PC OS/hardware | TBD | TBD |
| Calendar source | TBD | TBD |
| Voice STT/TTS | TBD | TBD |
| Cloud data permissions | TBD | TBD |
| Backup/retention policy | TBD | TBD |
