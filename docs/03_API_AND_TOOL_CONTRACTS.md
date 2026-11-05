# API and tool contracts (draft)

This is a contract draft for implementation. Antigravity must reconcile it with actual code and write an OpenAPI document plus runtime schemas during the backend phase. Do not assume endpoints already exist.

## API conventions

- Prefix: `/api/v1`.
- JSON request/response unless streaming response is explicitly documented.
- Authenticated user and registered device identity are derived from the session, never trusted from arbitrary client-supplied `userId` fields.
- All mutating requests carry `Idempotency-Key`.
- All resources that can be concurrently edited expose `version` or ETag.
- Return a request/correlation ID for support and audit.
- Use UTC ISO 8601 timestamps for instants and store the user's IANA timezone separately.
- Never include credentials, provider secrets, raw environment variables or internal stack traces in responses.

## Initial endpoint surface

| Method | Path | Purpose |
|---|---|---|
| GET | `/health/ready` | Readiness without disclosing secrets |
| POST | `/auth/session` | Session creation through chosen auth provider |
| DELETE | `/auth/session` | Session logout/revocation |
| GET | `/devices` | Current user's registered devices |
| POST | `/devices/register` | Register this device and its declared capabilities |
| GET | `/lifeos/:domain` | Read allowed domain records |
| POST | `/lifeos/:domain` | Create record through domain service |
| PATCH | `/lifeos/:domain/:id` | Update record with version precondition |
| POST | `/lifeos/:domain/:id/archive` | Archive instead of hard delete where possible |
| POST | `/assistant/turns` | Start assistant turn; support streaming separately |
| GET | `/assistant/turns/:id` | Retrieve turn and action status |
| POST | `/assistant/actions/:id/approve` | Approve exact proposal version and scope |
| POST | `/assistant/actions/:id/reject` | Reject proposal |
| POST | `/assistant/actions/:id/cancel` | Cancel a cancellable running action |
| GET | `/schedule/availability` | Compute free slots with constraints |
| POST | `/schedule/proposals` | Create a draft schedule proposal only |
| GET | `/schedule/proposals/:id` | Retrieve proposal and version |
| POST | `/schedule/proposals/:id/approve` | Approve exact proposal; no apply unless explicitly designed as combined transaction |
| POST | `/schedule/proposals/:id/apply` | Apply approved proposal with conflict recheck |
| POST | `/schedule/proposals/:id/rollback` | Roll back if still safe and supported |
| GET | `/sync/pull` | Fetch changes since cursor |
| POST | `/sync/push` | Submit outbox operations idempotently |
| GET | `/sync/status` | Last sync, pending queue, conflicts |
| GET | `/skills` | List installed/proposed skills |
| POST | `/skills/proposals` | Draft a skill package and permissions |
| POST | `/skills/:id/test` | Run tests in isolated sandbox |
| POST | `/skills/:id/install` | Install tested skill after user approval |
| POST | `/skills/:id/disable` | Disable skill |
| POST | `/skills/:id/rollback` | Roll back version |
| GET | `/memory` | Read user-visible memory with filters |
| PATCH | `/memory/:id` | Edit/confirm memory |
| DELETE | `/memory/:id` | Delete memory according to retention policy |

## Tool registry contract

Each model-visible tool is a narrow operation backed by a domain service. The model must not receive database credentials or raw SQL capability.

```ts
export type ToolRisk =
  | "read"
  | "navigation"
  | "reversible_write"
  | "external_effect"
  | "destructive";

export interface ToolDefinition<I, O> {
  name: string;
  description: string;
  inputSchema: object;      // JSON Schema; implementation should validate at runtime
  risk: ToolRisk;
  requiredScopes: string[];
  requiresApproval: boolean;
  execute(input: I, context: ToolContext): Promise<O>;
}

export interface ToolContext {
  userId: string;           // derived from authenticated principal
  deviceId: string;         // registered device identity
  requestId: string;
  isOnline: boolean;
  approvedActionId?: string;
  idempotencyKey: string;
  abortSignal: AbortSignal;
}
```

## Required initial tools

| Tool | Input (summary) | Risk | Notes |
|---|---|---|---|
| `get_current_context` | none | read | Current page, timezone, online state, device capability summary |
| `navigate_to_page` | allow-listed page ID | navigation | Never arbitrary URL/DOM selector |
| `search_lifeos` | query + allowed domains | read | Search only user-authorized domains |
| `get_today` | date + timezone | read | Return tasks, events, habits/routines |
| `list_tasks` | filters | read | Bounded pagination |
| `get_calendar` | range + timezone | read | Return versioned schedule blocks |
| `get_availability` | date range + constraints | read | Deterministic scheduling service |
| `propose_schedule` | movable item IDs + range + constraints | reversible_write | Draft only; does not mutate calendar |
| `apply_schedule_proposal` | proposal ID + version | reversible_write | Requires exact approval and final conflict check |
| `create_task` | validated task fields | reversible_write | Use DB/domain service; idempotent |
| `update_task` | ID + version + patch | reversible_write | Reject stale version |
| `log_workout` | session/sets | reversible_write | No inferred health claims |
| `get_sync_status` | none | read | Pending ops/conflicts/cursor |
| `list_skills` | filter | read | Include version and status |
| `propose_skill_install` | goal + files/inputs + requirements | reversible_write | Draft manifest and test plan; no execution or install |
| `run_skill` | skill/version + bounded inputs | reversible_write | Only installed, enabled skill; enforce its manifest |
| `disable_skill` | skill ID | reversible_write | Owner action; audit event |
| `undo_action` | action ID | reversible_write | Only where compensating action is valid |

## Action proposal shape

```json
{
  "id": "proposal-id",
  "kind": "schedule.reschedule",
  "status": "awaiting_approval",
  "createdAt": "2026-11-05T07:00:00Z",
  "expiresAt": "2026-11-05T07:10:00Z",
  "resourceVersions": {"calendar": 42},
  "summary": "Move the 90-minute study block to an available slot",
  "changes": [
    {"resourceId": "event-123", "before": {"startAt": "...", "endAt": "..."}, "after": {"startAt": "...", "endAt": "..."}}
  ],
  "reasoningSummary": "The suggested slot avoids fixed commitments and preserves the deadline buffer.",
  "requiredScopes": ["calendar.write"],
  "risk": "reversible_write"
}
```

This is illustrative. Use schema validation and do not put hidden chain-of-thought in `reasoningSummary`; return concise, user-facing reasons only.

## Approval rules

- Approval is bound to the authenticated user, device/session, proposal ID, proposal version and exact resource versions.
- Any change to the proposal invalidates prior approval.
- Any conflicting resource update between proposal and apply must invalidate or regenerate the proposal.
- Approval UI must show the full affected items and before/after values.
- External effects and destructive actions require their stronger confirmation policy.

## Error codes (suggested)

`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VERSION_CONFLICT`, `APPROVAL_REQUIRED`, `APPROVAL_STALE`, `IDEMPOTENCY_CONFLICT`, `PROVIDER_UNAVAILABLE`, `MODEL_TIMEOUT`, `DEVICE_OFFLINE`, `SKILL_TEST_FAILED`, `RATE_LIMITED`, `INTERNAL_ERROR`.
