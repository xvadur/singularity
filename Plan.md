# Plan

## Purpose
Polished synthesis from Discovery + Research into a concrete execution blueprint.

## Status
- State: `in_progress`
- Owner: `Main Agent + Claude`
- Last Updated: `2026-02-12`

## Strategic Summary
- Objective: Ship a context-first, Habitica-inspired task economy in the existing Singularity contracts while preparing contract-safe Next.js migration.
- Why now: Discovery rounds locked scheduler/task-model/observability and exposed the need for a shared-context interview workflow plus deterministic economy mechanics.
- Success KPIs:
  - additive economy fields live on `/api/status` and `/api/capture` without contract regressions,
  - `alfred_workquest_v1` compatibility preserved,
  - shop + claim loop active with anti-inflation safeguards,
  - `npm run build` green after changes.

## Delivery Phases
1. Foundation
2. Core Implementation
3. Integration and Hardening
4. Validation and Launch

## Architecture Plan
- System boundaries:
  - ChatUI remains capture/dashboard client.
  - Alfred server remains orchestration boundary for status/capture/jarvis/economy ledger writes.
  - Jarvis workspace remains source-of-truth persistence adapter.
- Data flow:
  - Task capture with optional `meta.ticket` -> backend computes economy deltas -> ledger/event append -> additive response.
  - Shop action uses existing `POST /api/capture` with additive `meta.shopPurchase`.
  - Status poll returns additive economy snapshot.
- Queue and cron responsibilities:
  - Existing slash queue semantics unchanged.
  - Existing inbox cron unchanged functionally.
  - Economy day roll checks run backend-side with `03:00 local` day-boundary semantics.
- Environment strategy:
  - Continue current monorepo runtime.
  - Prepare Next target in phased parity migration (`docs/nextjs-target-frame-blueprint.md`).

## Implementation Plan
### Phase 1
- Deliverables:
  - shared context docs:
    - `docs/habitica-mechanics-primer.md`
    - `docs/current-singularity-reality-snapshot.md`
    - `docs/nextjs-target-frame-blueprint.md`
    - `docs/discovery-interview-context-template.md`
  - Discovery interview protocol lock (context-first).
- Dependencies: Discovery + Research baseline.
- Exit criteria: artifacts committed and referenced in ongoing interview flow.

### Phase 2
- Deliverables:
  - backend economy engine (internal ledger + events) with additive API extensions.
  - frontend ticket controls (`plannedEEU`, `progressPct`, `taskType`, `ticketId`) and shop controls.
  - cache key `alfred_economy_cache_v1` (optional UI snapshot cache).
- Dependencies: existing `/api/capture` and `/api/status` contracts.
- Exit criteria: captures work with/without economy metadata and no endpoint breakage.

### Phase 3
- Deliverables:
  - anti-inflation guardrails (diminishing + soft slowdown + hard cap + flags).
  - economy status observability in UI.
  - daily roll checks and storage trimming for ledger hygiene.
- Dependencies: phase 2 ledger fields and response payloads.
- Exit criteria: deterministic claims and coherent economy totals under repeated updates.

### Phase 4
- Deliverables:
  - regression verification and build validation.
  - Next migration phase map ready for route-handler parity implementation.
- Dependencies: phases 1-3.
- Exit criteria: build green, contract-safe changes, documented migration path.

## Testing and QA Plan
- Unit:
  - deterministic economy claim math for boundary values (`plannedEEU=1|1000`, `progress delta` edge cases).
- Integration:
  - `/api/capture` with legacy payload (no ticket/shop metadata).
  - `/api/capture` with `meta.ticket`.
  - `/api/capture` with `meta.shopPurchase`.
  - `/api/status` economy snapshot shape.
- End-to-end:
  - create ticket capture -> progress update -> observe economy delta in UI.
  - shop purchase success/failure against coin balance.
- Manual verification:
  - slash command behavior unaffected.
  - jarvis trigger behavior unaffected.
  - localStorage hydration unchanged for `alfred_workquest_v1`.

## Rollout Plan
- Pre-release checklist:
  - additive-only API contract diff check.
  - build pass.
  - workspace files bootstrap for new game ledger paths.
- Deployment steps:
  - ship backend economy extensions first.
  - ship frontend controls and economy panel.
  - monitor recent flags/cap behavior for tuning.
- Fallback and rollback:
  - economy metadata is optional; legacy capture path remains valid.
  - UI can ignore economy fields and still function.

## Ownership Matrix
- Codex instances:
  - implement additive runtime changes and docs.
- Claude:
  - parallel validation and optional migration planning support.
- Human decisions required:
  - post-MVP shop expansion policy.
  - strict wall-clock 03:00 scheduler migration for all jobs.
  - calendar scope finalization.

## Final Open Items
- Item 1: tune economy curve after real usage telemetry (warning rates + cap pressure).
- Item 2: finalize Next.js cutover sequencing windows and rollback trigger thresholds.
