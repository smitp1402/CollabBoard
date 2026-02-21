# AI Agent Integration Execution Plan (Option A)

## 1) Scope and Goal

Integrate an AI Board Agent into the existing collaborative whiteboard using the current Option A architecture:
- Next.js + Firebase stack
- Serverless API route orchestration (`POST /api/ai/commands`)
- No queue/worker tier
- No LangGraph

Primary goal: ship a reliable AI workflow that can execute board mutations in real time for all connected users, including a right-side AI chat panel UX.

---

## 2) Success Criteria

### Functional
- Support at least 6 command types across creation, manipulation, layout, and complex templates.
- Right-side AI panel allows users to:
  - submit prompt
  - see run status (`running/completed/failed`)
  - view concise result/error summary
  - retry failed command

### Non-functional
- Single-step commands typically complete in `<2s` (best effort target).
- AI-generated board changes are visible to all active users via Firestore realtime sync.
- Duplicate client submissions do not create duplicate operations (`clientRequestId` + idempotency).

---

## 3) Workstreams

1. **API Orchestration**  
   Prompt intake, auth, board context load, LLM tool-call loop, response formatting.

2. **Tool Execution Layer**  
   Implement and validate tool handlers that map to Firestore writes.

3. **AI Panel UX**  
   Right-side panel interaction, command history view, retry behavior, status rendering.

4. **Data Model + Observability**  
   `ai_commands` storage, status lifecycle, structured logging, basic latency/error metrics.

5. **Quality and Release**  
   Unit/integration/e2e coverage and guarded rollout.

---

## 4) Phase-Based Implementation Plan (Sequential)

Use these phases in order. Do not start the next phase until the current phase exit criteria passes.

## Phase 1 — Right-Side AI Panel UI First (Day 1-2)

### Step-by-step tasks
1. Add right-side AI panel shell to the board page layout.
2. Build panel UI blocks:
   - command input area
   - submit button
   - command status area (`idle/running/completed/failed`)
   - response/error summary area
3. Add local state for prompt, loading, and command history list.
4. Implement optimistic UI submit flow with a temporary mocked response.
5. Add retry button behavior in UI state (mock mode).
6. Keep panel scoped to active board route/context.

### Exit criteria
- Panel is fully visible and usable on the right side.
- User can type prompt, submit, and see status transitions in UI.
- UI works end-to-end with mocked response state before backend integration.

### Handoff output
- Board-integrated right-side AI panel
- UI interaction flow ready for backend wiring

---

## Phase 2 — Foundation and Contracts (Day 2-3)

### Step-by-step tasks
1. Create `types/ai-types.ts`:
   - `AICommandRequest`
   - `AICommandResponse`
   - `AICommandStatus`
   - base tool-call types
2. Define Zod schemas for each tool argument payload.
3. Add `POST /api/ai/commands` route skeleton.
4. Add Firebase ID token verification.
5. Add board access authorization checks.
6. Return stub response with generated `commandId`.
7. Wire panel submit action from mock mode to real API stub response.

### Exit criteria
- Authenticated requests succeed.
- Unauthorized requests return correct status codes.
- Panel submit reaches real API route and displays contract response.

### Handoff output
- Contracts + schema file
- API route skeleton with auth guards

---

## Phase 3 — Tool Execution Core (Day 3-5)

### Step-by-step tasks
1. Implement `getBoardState` read helper (Firestore objects snapshot).
2. Create `lib/ai/tools.ts` tool dispatcher.
3. Implement creation tools:
   - `createStickyNote`
   - `createShape`
   - `createFrame`
4. Implement manipulation tools:
   - `moveObject`
   - `resizeObject`
   - `updateText`
   - `changeColor`
5. Implement `createConnector`.
6. Add batched Firestore writes for multi-operation tool steps.
7. Add validation fail-fast behavior before write execution.

### Exit criteria
- At least 3 single-step commands execute end-to-end.
- Firestore updates are correct and visible on board listener.

### Handoff output
- Tool executor module
- Validated board mutation path

---

## Phase 4 — AI Runner, Persistence, and Live Panel Integration (Day 5-7)

### Step-by-step tasks
1. Create `lib/ai/agentRunner.ts` with LLM tool-calling loop.
2. Build prompt payload with:
   - system instructions
   - user prompt
   - board state context
   - tool schema
3. Parse LLM tool calls and enforce allowlist.
4. Execute tool calls sequentially.
5. Persist command lifecycle in `boards/{boardId}/ai_commands/{commandId}`.
6. Store status updates: `running -> completed|failed`.
7. Add duplicate protection with `clientRequestId` + `idempotencyKey`.
8. Subscribe panel to `ai_commands` for realtime command status reflection.
9. Add retry action for failed command (new `clientRequestId`).

### Exit criteria
- Full request is traceable from prompt to persisted command result.
- Panel shows live command status without refresh.
- Duplicate submit does not duplicate board writes.

### Handoff output
- Agent runner + command history persistence
- Realtime-integrated panel workflow

---

## Phase 5 — Capability Completion (Day 7-9)

### Step-by-step tasks
1. Validate command coverage for:
   - creation
   - manipulation
   - layout
   - complex templates
2. Implement deterministic template builders:
   - SWOT (4 quadrants + labels)
   - user journey (5 stages)
   - retrospective (3 columns)
3. Implement layout operations:
   - grid arrangement
   - even spacing
4. Add command-level summaries that describe executed steps.

### Exit criteria
- Required prompt suite passes without manual intervention.

### Handoff output
- Feature-complete AI command set
- Acceptance prompt pass report

---

## Phase 6 — Hardening, Testing, and Release (Day 9-10)

### Step-by-step tasks
1. Add endpoint rate limiting (`per user` and/or `per board`).
2. Improve safe error handling and failure summaries.
3. Add structured logs:
   - `commandId`, `boardId`, `actor`, latency, status, failure reason
4. Add baseline metrics dashboards (success/failure/latency).
5. Execute test matrix:
   - unit
   - integration
   - e2e (two-browser realtime)
6. Add feature flag `ai_agent_enabled`.
7. Run staged rollout: internal -> limited users -> full.
8. Validate rollback path by disabling feature flag.

### Exit criteria
- Stable release candidate with guarded rollout and tested rollback.

### Handoff output
- Release-ready AI feature
- Test evidence + rollout checklist

---

## 5) API Contract (MVP)

## `POST /api/ai/commands`

### Request
```json
{
  "boardId": "string",
  "prompt": "string",
  "clientRequestId": "string",
  "selection": ["objectId-1", "objectId-2"],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}
```

### Response
```json
{
  "commandId": "string",
  "status": "running|completed|failed",
  "summary": "string"
}
```

### Error model
- `401` unauthenticated
- `403` unauthorized board access
- `400` invalid payload/tool args
- `429` rate limited
- `500` execution/LLM internal error

---

## 6) Firestore Model

## Collection
- `boards/{boardId}/ai_commands/{commandId}`

## Fields
- `prompt: string`
- `actor: { uid: string, displayName?: string }`
- `status: "running" | "completed" | "failed"`
- `summary: string`
- `error?: { code: string, message: string }`
- `clientRequestId: string`
- `idempotencyKey: string`
- `createdAt: timestamp`
- `updatedAt: timestamp`

---

## 7) Testing Plan

## Unit
- Tool schema validation tests (success + failure)
- Tool executor tests for each tool handler
- Layout algorithm tests (grid/spacing)
- Idempotency behavior tests

## Integration
- API route + Firebase auth + Firestore write flow
- LLM tool-call response parsing/validation
- Duplicate request handling (`clientRequestId`)

## End-to-end
- Two-browser realtime validation:
  - user A runs command
  - user B sees board update immediately
- AI panel lifecycle:
  - submit -> running -> completed/failed
  - retry failed command

## Acceptance test prompts
- "Add a yellow sticky note that says User Research"
- "Create a blue rectangle at position 100, 200"
- "Arrange these sticky notes in a grid"
- "Create a SWOT analysis template with four quadrants"

---

## 8) Risks and Mitigations

- **Risk:** LLM returns malformed tool args  
  **Mitigation:** strict Zod validation + fail-fast + clear summary.

- **Risk:** duplicate writes due to retries/network  
  **Mitigation:** `clientRequestId` + idempotency checks before execution.

- **Risk:** conflicting concurrent object updates  
  **Mitigation:** MVP last-write-wins + object version checks where available.

- **Risk:** latency spikes above target  
  **Mitigation:** concise tool schema, smaller board context payload, capped step count.

---

## 9) Rollout and Rollback

## Rollout
- Gate with feature flag (`ai_agent_enabled`).
- Enable for internal users first.
- Expand gradually to all authenticated users.

## Rollback
- Disable feature flag (panel hidden + endpoint blocked).
- Keep board collaboration unaffected.
- Preserve `ai_commands` for postmortem analysis.

---

## 10) Definition of Done

Integration is complete when all are true:
- Required command categories are operational.
- AI panel is usable in board UI and reflects live status.
- Realtime shared state works across multiple users.
- Idempotency and basic rate limiting are in place.
- Tests pass (unit + integration + e2e critical paths).
- Production rollout can be toggled with feature flag.
