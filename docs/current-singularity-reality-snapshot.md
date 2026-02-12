# Current Singularity Reality Snapshot

## Purpose
Concrete "what exists now" baseline so Discovery choices are compared against real implementation, not assumptions.

## Already implemented (code reality)
- Capture pipeline with workspace persistence:
  - writes capture items to `inbox.json`
  - writes slash commands to `commands.json`
  - writes append-only capture events to `chatui-events.jsonl`
- Active API surface (already live):
  - `GET /api/status`
  - `POST /api/capture`
  - `POST /api/jarvis/chat`
  - `GET /api/jarvis/history`
  - `GET /api/jarvis/commands`
  - `POST /api/jarvis/inbox/process`
- Jarvis bridge behavior:
  - backend resolves session key via `resolveJarvisSessionKey(...)`
  - chat send/wait/history roundtrip through OpenClaw gateway
- Frontend local WorkQuest loop:
  - prompt-based XP/streak/achievements in `chatui/src/App.tsx`
  - localStorage key `alfred_workquest_v1` in active use

Primary sources:
- `/Users/_xvadur/singularity/chatui/src/App.tsx`
- `/Users/_xvadur/singularity/alfred/server-fixed.js`
- `/Users/_xvadur/singularity/jarvis-workspace/data/system/capture/inbox.json`
- `/Users/_xvadur/singularity/jarvis-workspace/data/system/capture/commands.json`
- `/Users/_xvadur/singularity/jarvis-workspace/data/chat/chatui-events.jsonl`

## Implemented in this phase (new additive behavior)
- Internal EEU economy ledger (off-chain):
  - `jarvis-workspace/data/system/game/economy-ledger.json`
  - `jarvis-workspace/data/system/game/economy-events.jsonl`
- Additive payload extensions:
  - `POST /api/capture` now accepts optional `meta.ticket` and `meta.shopPurchase`
  - `POST /api/capture` now returns additive `economyEffect`, `shopPurchase`, `economy`
  - `GET /api/status` now returns additive `economy` snapshot
- Economy rules:
  - planned EEU slider support (1-1000)
  - progress claim delta only
  - soft slowdown + hard daily cap
  - shared damped conversion to XP + coins
  - simple 3-tier shop with atomic coin debit in ledger

## Still decision/roadmap level (not full implementation yet)
- Full Next.js app cutover (App Router + route handlers parity migration).
- Complete decomposition of monolithic `chatui/src/App.tsx`.
- End-to-end 03:00 wall-clock migration for all runtime jobs (economy day boundary and roll checks are now in place, but overall runtime still has legacy interval inbox cron).

## Constraints still active
- No `legacy/` modifications.
- Existing endpoint names preserved.
- `alfred_workquest_v1` preserved unchanged (compatibility key retained).
