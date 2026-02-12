# Next Iteration Bootstrap Plan (Strangler)

## Execution Scope
- Baseline source: tag `iteration-1-benchmark-2026-02-12` on commit `d98f6dc`.
- Working branch: `codex/next-iteration-bootstrap`.
- Migration strategy: run Next.js in parallel to existing Express + Vite stack, then move slices route-by-route.

## API Parity Map

### `GET /api/status`
- Contract owner now: `alfred/server-fixed.js`.
- Required method/path parity: unchanged (`GET /api/status`).
- Response compatibility floor:
  - `timestamp: string`
  - `player: { name, level, totalXP, xpToNext, streak }`
  - `overview.inboxPending`, `overview.pendingCommands`
  - existing additive fields (`inbox`, `commands`, `economy`, `systems`, etc.) pass-through.
- Next bootstrap behavior:
  - `nextui/src/app/api/status/route.ts` proxies payload/status transparently from Alfred.

### `POST /api/capture`
- Contract owner now: `alfred/server-fixed.js`.
- Required method/path parity: unchanged (`POST /api/capture`).
- Request compatibility floor:
  - required `content: string`
  - optional: `source`, `threadId`, `sessionKey`, `type`, `priority`, `tags`, `meta`.
- Response compatibility floor:
  - `ok: boolean`
  - `item`
  - additive fields preserved (`queuedCommand`, `economyEffect`, `shopPurchase`, `economy`).
- Next bootstrap behavior:
  - `nextui/src/app/api/capture/route.ts` forwards body and auth headers (`authorization`, `x-alfred-token`) without shape rewrite.

## First Migration Slice (Implemented)
1. Added isolated Next app shell under `nextui/` (no big-bang rewrite).
2. Added API parity bridge handlers for `/api/status` and `/api/capture`.
3. Added typed contracts for bridge-side validation in `nextui/src/lib/contracts.ts`.
4. Added minimal parity UI for live verification:
   - `StatusParityCard`: calls `GET /api/status`.
   - `CaptureParityForm`: posts to `POST /api/capture`.
5. Kept current production path unchanged (`chatui` + `alfred` still authoritative).

## Three.js Value Map (Where It Adds Value)
- Worth adding:
  - Hero/ambient system visualization (low-information decorative layer).
  - Focus/progress scene on XP/quest dashboard only if directly tied to metrics.
  - Lightweight celebratory transitions for milestones (short-lived effects).
- Avoid:
  - Core data entry surfaces (`/capture`, task forms, chat stream).
  - Dense operational tables/monitoring panels.

## Three.js Baseline Integration (Implemented, No UI Regression)
- Added optional dependencies in `nextui`: `three`, `@react-three/fiber`.
- Added feature-flagged scene component: `nextui/src/components/effects/ThreeBackdrop.client.tsx`.
- Default behavior is non-Three ambient background.
- Enable explicitly with `NEXT_PUBLIC_ENABLE_THREE=1`.

## Next Slice Proposal
1. Move read-only dashboard widgets first (`player`, `overview`, `inbox`, `commands`) into Next route segments.
2. Keep mutations routed to existing Alfred handlers until all write paths have parity tests.
3. Introduce contract tests that compare Next proxy responses to Alfred direct responses for `status` and `capture`.

