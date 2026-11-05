# TADASHI phased roadmap

| Phase | Goal | Must not do yet | Exit condition |
|---|---|---|---|
| 0 | Audit, fix verified blockers, establish tests and migration plan | No wholesale rewrite, cloud deployment or branch merge | Reproducible baseline, evidence-backed report, approved architecture decisions |
| 1 | Global Arc Reactor UI and voice loop | No arbitrary code execution or backend-dependent assumptions | UI accessible from every page; state machine, transcript, interrupt, typed text fallback work |
| 2 | Typed tool registry, policy, proposals and audit | No model-to-DOM/SQL/shell shortcuts | Registered tools validated; risky actions gated; results verified; undo where supported |
| 3 | Availability and schedule proposals | No automatic movement of fixed/external events | Free/busy algorithm and approval-bound, versioned proposals pass timezone/conflict tests |
| 4 | API, identity, PostgreSQL and device sync | No destructive production migration | Authenticated API; IndexedDB outbox; idempotent sync; conflicts visible and recoverable |
| 5 | Hybrid model routing: local Ollama + cloud gateway | No public Ollama port or browser provider keys | Same tools work with tested local and cloud providers; fallbacks and budgets verified |
| 6 | Memory and skill acquisition | No self-modifying production code or unreviewed skills | User-controlled memory; sandboxed/tested/approved skill lifecycle |
| 7 | 24/7 worker and device companions | No unsupported promise of browser background execution | Cloud jobs continue with devices off; device-only jobs wait safely for device connectivity |

Each phase should be split into small reviewable PRs. Do not skip phases merely to reach a visual demo.
