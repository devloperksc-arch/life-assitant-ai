# Phase 6 — user-controlled memory and skill acquisition

Precondition: identity, tools/policy, backend and audit infrastructure are ready.

Implement separate layers for preferences, episodic history, searchable knowledge and procedural skills. Do not treat fine-tuning as the default way to add capabilities.

Memory requirements:
- capture only appropriate durable facts/preferences with source, timestamp and confidence;
- let the user inspect, correct, export and delete memories;
- support private/local-only memory policy and cloud context minimization;
- cite source documents for knowledge retrieval and treat document content as untrusted data.

Skill requirements:
- define versioned manifest, runtime, inputs/outputs, permissions, network domains, resource limits, tests and risk class;
- allow TADASHI to draft a skill and test it only in an isolated sandbox;
- default deny filesystem, network, shell and secrets;
- require passing tests and explicit user approval before install;
- require renewed approval for permission expansion or updates that expand capability;
- record digest, version, permissions, approval and execution audit;
- support disable, revoke and rollback.

Start with safe skills such as lecture-PDF summarizer on selected files, flashcard generator, weekly LifeOS report and project test runner with an allow-list.

Tests: prompt injection in imported documents cannot change policy; failed skill tests block install; skill has no secret access; network is blocked by default; approval bound to version/digest; disable and rollback work.
