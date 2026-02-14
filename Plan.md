# Plan

## Purpose
Execution blueprint derived from locked Discovery contracts and validated Research findings.

## Status
- State: `in_progress`
- Owner: `Main Agent (Codex)`
- Last Updated: `2026-02-13`

## Strategic Summary
- Objective: implement full-scope v1 behavior parity for all four acceptance flows:
  - Morning Brief gate + skip-with-reason + summary visibility,
  - Global KPI shell with `60s` refresh and short-interval diffs,
  - Command lifecycle timeline with retry policy (`30s`, cap `20`, `failed-final`),
  - Task flow (`inbox preview`, one-click promote defaults, 3-status board continuity).
- Why now: Interview Round 16 closed the remaining behavior decisions and explicitly requested full implementation scope (no down-selection).
- Success KPIs:
  - all four acceptance flows implemented and testable end-to-end,
  - existing API contracts remain additive-safe (`/api/status`, `/api/capture`, queue semantics),
  - backward compatibility preserved for `alfred_workquest_v1`,
  - `npm run build` remains green after each delivery slice.

## Delivery Phases
1. Contract and UX State Foundation
2. Core Flow Implementation
3. Reliability and Guardrails
4. Verification and Release Readiness

## Architecture Plan
- System boundaries:
  - `nextui` is the active v1 UX behavior sandbox for locked flow implementation.
  - `alfred/server-fixed.js` remains API/runtime boundary.
  - `jarvis-workspace` files remain source of truth for capture/queue/event persistence.
- Data flow contracts:
  - Morning Brief and skip records persist in the same brief stream (`status=completed|skipped`, `skipReason` required for skipped).
  - KPI state uses periodic status snapshots with previous-snapshot diff calculation.
  - Command blocks expose lifecycle state and retry counters locally in feed context.
  - Task promote flow defaults to `status=Todo`, `priority=Medium`, preserving board contract.
- Scheduler/retry rules:
  - command auto-retry interval fixed at `30s`,
  - max retry attempts `20`,
  - terminal state `failed-final` with manual retry action.

## Implementation Plan
### Phase 1: Contract and UX State Foundation
- Deliverables:
  - runtime shell model for global KPI header and diff state.
  - Morning Brief schema/validation rules (`title<=120 chars`, `promise<=500 words`, required tag, sliders `1-100`).
  - command lifecycle enum and retry metadata model.
- Exit criteria:
  - feature state contracts are coded and reusable across route components.

### Phase 2: Core Flow Implementation
- Deliverables:
  - Morning Brief gate with `/chat` unlock and skip-with-reason persistence path.
  - sticky summary in `/chat` (always open) with `title`, `promise snippet`, `mood`, `expectedDifficulty`, `actualDifficulty`.
  - global KPI header on all routes with `60s` refresh and tri-state diff colors.
  - task preview/promote behavior with recency default and optional manual reorder.
  - command timeline rendering (`Accepted -> Plan -> Execution -> Measurement -> Done`).
- Exit criteria:
  - all four acceptance flows visible and functionally coherent in runtime UI.

### Phase 3: Reliability and Guardrails
- Deliverables:
  - retry engine behavior for command blocks (`30s`, cap `20`, terminal `failed-final`).
  - skip penalty mechanics (`-10 XP`) with immediate toast and day-close recap visibility.
  - day-close derived `actualDifficulty` computation step and `03:00` archive feed event handling.
- Exit criteria:
  - command failures and day-close paths behave deterministically under repeated runs.

### Phase 4: Verification and Release Readiness
- Deliverables:
  - acceptance matrix execution for all four flow tracks.
  - regression checks on existing contracts and compatibility guards.
  - implementation handoff notes for backend parity follow-up.
- Exit criteria:
  - all acceptance flows pass,
  - no contract-breaking API changes introduced,
  - build validation green.

## Testing and QA Plan
- Unit:
  - Morning Brief field validators (`title`, `promise`, required `tag`, skip reason).
  - KPI diff calculation (`previous snapshot` vs `current snapshot`).
  - command retry counters and terminal transition at attempt `20`.
- Integration:
  - status polling cadence and diff rendering continuity across route transitions.
  - command lifecycle transitions including failure and auto-retry.
  - inbox promote defaults (`Todo`, `Medium`) and board update behavior.
- End-to-end:
  - app open -> Morning Brief complete/skip -> `/chat` unlock + sticky summary.
  - command submit -> lifecycle progression -> retry/final-failure behavior.
  - task promote from inbox -> board status flow.
  - KPI refresh after `60s` showing signed diff colors.

## Rollout Plan
- Sequence:
  - ship state/contract scaffolding first,
  - ship visible UX flows,
  - ship retry/guardrails and day-close mechanics,
  - run acceptance matrix and finalize.
- Fallback:
  - preserve existing API endpoints and payload compatibility,
  - keep behavior behind additive UI/runtime state where possible.

## Final Open Items
- Item 1: confirm production source for `actualDifficulty` auto-derivation materials.
- Item 2: define backend parity timeline for moving Round 16 runtime behavior from `nextui` sandbox into primary runtime path.
