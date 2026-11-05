# Official technical references

Check these sources during implementation because product features, model IDs, API support and pricing change.

## Antigravity

- Rules and workspace instructions: https://antigravity.google/docs/rules/
- Agent skills and workflow migration: https://antigravity.google/docs/migration/workflows-to-skills
- Getting started / Projects: https://antigravity.google/docs

Antigravity's current documentation describes workspace `AGENTS.md`/`GEMINI.md` and `.agents/rules/*.md` for rules, and `.agents/skills/<skill-name>/SKILL.md` for reusable skills. Its migration guide says legacy workflow support stopped on 19 October 2026, so this kit uses Skills instead of `.agents/workflows/`.

## Ollama

- API introduction (local and cloud base URLs): https://github.com/ollama/ollama/blob/main/docs/api/introduction.mdx
- OpenAI compatibility: https://github.com/ollama/ollama/blob/main/docs/api/openai-compatibility.mdx
- Tool support: https://ollama.com/blog/tool-support

Use current documentation to verify API compatibility and tool-call support per model. Never expose the local Ollama listener publicly.

## LiteLLM

- Getting started: https://docs.litellm.ai/docs/
- Providers: https://docs.litellm.ai/docs/providers
- Virtual keys: https://docs.litellm.ai/docs/proxy/virtual_keys

Treat example config in this kit as a template. Validate current configuration syntax against the version you deploy.

## Web app/offline behavior

- MDN Service Worker API: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- MDN IndexedDB API: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

A service worker supports caching and event-driven capabilities but should not be treated as a guaranteed continuously running AI worker. Put 24/7 cloud jobs in a persistent server-side worker.
