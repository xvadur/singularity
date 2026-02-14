# Singularity Final Implementation Plan (Approved Draft)

Date baseline: 2026-02-14
Scope baseline: Discovery Round 18 (`50/50` locked) + XP Engine v2 official docs + final handoff

## Summary
This is the decision-complete implementation plan to move from interview outputs to execution-ready delivery.
It locks `Jarvis_Singularity.pen` as the single UX source of truth, keeps runtime implementation in `chatui + alfred`, and integrates XP Engine v2 through additive contracts only (no endpoint expansion).

## Locked Foundations
1. UX source of truth: `/Users/_xvadur/singularity/Jarvis_Singularity.pen`.
2. Runtime target for this cycle: `chatui` frontend + `alfred/server-fixed.js` backend.
3. API policy: additive-only changes on existing endpoints.
4. Compatibility: preserve `alfred_workquest_v1` key and hydration behavior.
5. Day boundary: `03:00` user-local timezone.
6. Go-implement gate: all 50 interview decisions are closed.
7. Release model: per-flow flags + dark launch + internal verification.
8. XP fail-safe: auto kill-switch on breach thresholds (fallback to legacy path).

## In Scope
1. Final documentation consolidation and implementation mapping.
2. Runtime behavior implementation plan for gate/carry flow, capture/feed model, command lifecycle/retry, notification center behavior, and XP Engine v2 integration.
3. Acceptance and rollout planning.

## Out of Scope
1. New endpoints.
2. `legacy/` changes.
3. Full production cutover to `nextui` in this cycle.
4. Reopening locked formulas unless a hard contradiction is found.

## Deliverables
1. `docs/final-master-spec-2026-02-14.md` (this file)
2. `docs/final-route-state-matrix-2026-02-14.json`
3. `docs/final-component-state-data-map-2026-02-14.md`
4. `docs/final-api-contract-diff-2026-02-14.md`
5. `docs/final-xp-engine-integration-plan-2026-02-14.md`
6. Updated `Plan.md`, `Research.md`, `Progress.md`

## Important API / Interface Changes
No new routes. Only additive fields.

### `POST /api/capture`
Keep existing fields unchanged. Add:
1. `xpEngineEffect`
2. `gateStateAfter`
3. `notificationCandidates` (safe subset)
4. `flowFlagsApplied` (debug-safe, non-breaking)

### `GET /api/status`
Keep existing shape unchanged. Add:
1. `xpEngine`
2. `briefGates`
3. `kpiDiff`
4. `activityFeedMeta` (retention/order metadata)

### Frontend state interfaces
1. `captureMode`: shell-level context.
2. `gateState`: backend authority + local mirror cache.
3. `commandLifecycle`: backend authority.
4. `notificationState`: sorted by `timestamp desc`, tie-break `eventId desc`.
5. `highlightState`: clears on first write intent.

## File-Level Implementation Plan
## Backend (`alfred`)
1. `alfred/server-fixed.js`
2. `alfred/xp-engine/core/`:
   - `normalization.js`
   - `scoring.js`
   - `brief-gates.js`
   - `settlement.js`
   - `projection.js`
   - `invariants.js`
3. `alfred/xp-engine/runtime/`:
   - `ingest.js`
   - `persist.js`
   - `idempotency.js`
   - `status-projection.js`
   - `capture-projection.js`
4. `alfred/xp-engine/store/`:
   - `xp-ledger.jsonl`
   - `xp-day-snapshots.json`
   - `xp-idempotency.json`
   - `xp-audit.jsonl`

## Frontend (`chatui`)
1. `chatui/src/main.tsx`
2. `chatui/src/App.tsx`
3. `chatui/src/lib/xp-engine/`:
   - `kpi-diff.ts`
   - `notification-filter.ts`
   - `snapshot-cache.ts`
4. `chatui/src/components/`:
   - `layout/RuntimeShell.tsx`
   - `capture/FloatingCaptureBar.tsx`
   - `capture/CaptureFeed.tsx`
   - `briefs/MorningGatePopup.tsx`
   - `briefs/EveningGatePopup.tsx`
   - `notifications/NotificationCenter.tsx`
   - `commands/CommandLifecycleBlock.tsx`
   - `dashboard/KpiHero.tsx`
   - `dashboard/BriefCards.tsx`
   - `tasks/TaskPromotePopup.tsx`

## Data Layer (`jarvis-workspace`)
Keep existing sources of truth:
1. `data/system/capture/inbox.json`
2. `data/system/capture/commands.json`
3. `data/chat/chatui-events.jsonl`
Add XP engine files additively under `data/system/game/`.

## Behavioral Plan by Flow
1. Gate and carry:
   - Write intent always checks pending gate.
   - Carry order fixed: Evening -> Morning.
   - Skip requires one-line reason with visible damage.
   - Morning is not editable after submit.
2. Capture/feed:
   - Full markdown rendering in compose and feed.
   - Feed appends to bottom, successful submit scrolls to bottom.
   - Compose expands after 100 words.
   - Submit failure shows immediate error (no local outbox).
3. Command lifecycle:
   - Backend stage authority.
   - Retry every 30s.
   - Immediate manual retry on terminal failure.
   - FIFO queue, no dedupe, payload normalization with warning.
4. Notifications:
   - Adaptive density, 30-day retention.
   - Critical-only system banners.
   - Missing deep-link target is silent fail.
   - Highlight clears on first write intent.
5. XP Engine v2:
   - Enforce official invariants.
   - Keep day cap, multiplier max, and thresholded notifications.
   - Keep auto kill-switch thresholds and legacy fallback path.

## Testing and Validation
1. Contract tests for additive fields on `/api/capture` and `/api/status`.
2. Gate transition tests (including carry-over and 03:00 rollover).
3. Command retry/scheduler tests (`30s`, caps, terminal/manual behavior).
4. Notification ordering/highlight/deep-link behavior tests.
5. XP replay determinism and idempotency tests.
6. DST/timezone boundary tests around 03:00 local.
7. Compatibility tests for `alfred_workquest_v1`.
8. Build gate: `npm run build` must pass.

## Rollout and Ops
1. Per-flow flags:
   - `FLOW_BRIEF`
   - `FLOW_CAPTURE`
   - `FLOW_NOTIFY`
   - `FLOW_XP`
2. Dark launch + internal verification.
3. Progressive enablement by flow.
4. Rollback via flow flags and XP kill-switch.

## Definition of Done for Planning
1. No unresolved implementation decisions remain.
2. Public interface changes are additive and fully specified.
3. Test matrix is complete and executable.
4. Rollout, monitoring, and rollback are explicit.
5. Implementation can start in a new conversation without product decisions.
