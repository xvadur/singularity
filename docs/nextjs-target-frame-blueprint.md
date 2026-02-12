# Next.js Target Frame Blueprint (Contract-Preserving)

## Goal
Migrate from Express + Vite runtime shape to Next App Router without breaking current Jarvis contracts or workspace semantics.

## Non-negotiables
- Preserve endpoint contracts and payload compatibility:
  - `GET /api/status`
  - `POST /api/capture`
  - `POST /api/jarvis/chat`
  - `GET /api/jarvis/history`
  - `GET /api/jarvis/commands`
  - `POST /api/jarvis/inbox/process`
- Preserve localStorage compatibility key: `alfred_workquest_v1`.
- Preserve queue semantics (`commands.json`) and capture journal semantics.

## Migration phases

## Phase A: Domain extraction first
- Move scoring/economy/task mechanics into framework-agnostic TypeScript modules.
- Keep thin adapters in current Express handlers until Next routes are ready.

## Phase B: Route handler parity
- Recreate existing endpoints as Next route handlers with identical request/response shape.
- Keep additive fields only; avoid breaking removals/renames.

## Phase C: UI route segmentation
- Split monolithic UI into route segments:
  - `/capture`
  - `/tasks`
  - `/xp`
  - `/systems`
- Keep existing visual language and CSS class compatibility while restructuring.

## Phase D: Controlled cutover
- Run Express and Next in parallel during parity validation.
- Run contract diff tests on representative API fixtures.
- Shift traffic after parity checks pass; keep rollback switch.

## Data and runtime adapters
- Workspace file adapter remains authoritative for capture/queue/economy journals.
- OpenClaw gateway remains backend-only integration.
- Cron/ops jobs remain server-side and move behind route-independent services.

## Validation checklist
- Additive API compatibility checks for old clients.
- Regression checks:
  - capture write still succeeds with/without ticket meta
  - slash command queue behavior unchanged
  - jarvis chat/history flow unchanged
  - economy snapshot present and coherent
- Build/test gates:
  - `npm run build` green
  - endpoint fixture parity checks green

## Source alignment
- `/Users/_xvadur/singularity/Discovery.md`
- `/Users/_xvadur/singularity/Research.md`
- `/Users/_xvadur/singularity/Plan.md`
