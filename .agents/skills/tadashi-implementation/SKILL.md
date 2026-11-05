---
name: tadashi-implementation
description: Safely audit, plan, implement and verify TADASHI LifeOS roadmap phases while preserving existing user data and the vanilla frontend.
---

# TADASHI Implementation Skill

Use this skill for work in the `life-assitant-ai` repository.

## Required preparation

1. Read the repository root `AGENTS.md` and README.
2. Read `docs/00_CURRENT_STATE_AND_GUARDRAILS.md`, `docs/02_TARGET_ARCHITECTURE.md`, the relevant phase prompt and the acceptance checklist.
3. Inspect the live source and current git status. Never assume a ZIP snapshot or older docs match the checkout.
4. Create or use a feature branch/worktree. Keep changes scoped to the named phase.
5. Make a plan and identify data/schema/security risks before editing.

## Implementation loop

1. **Observe:** inspect current code, data shapes, call sites and UI flows.
2. **Plan:** list exact files to change, new dependencies, migration impact, threat surface and rollback.
3. **Implement:** make the smallest coherent change. Keep old behavior working unless the phase explicitly migrates it.
4. **Verify:** run syntax/lint/test/build checks that exist; add tests for new behavior; manually check relevant flows at 375px and 1280px where UI is touched.
5. **Report:** summarize behavior, changed files, test commands/results, known limitations and rollback.

## Stop conditions

Stop and request owner review before:
- deleting/replacing persisted user data or changing existing storage keys;
- a destructive database migration without verified backup and rollback;
- exposing a service publicly or changing firewall/network boundaries;
- creating paid cloud resources or enabling billable APIs;
- requesting broad OAuth scopes;
- adding arbitrary code execution, unrestricted shell access or unreviewed skill permissions;
- changing production auth, DNS, domain, provider keys or deployment secrets;
- merging branches or pushing to protected/default branches.

## Skill references

- Roadmap: `references/phase-roadmap.md`
- Verification: `references/verification-checklist.md`
- Security and operations: `references/security-operations.md`

## Completion report format

- Phase and goal
- What changed (files/modules)
- Behavior verified
- Commands/tests and results
- Data migrations and backup/rollback
- Security/permission impact
- Known gaps / follow-up work
- Exact next recommended phase
