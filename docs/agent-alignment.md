# Agent Alignment (Current)

Last update: 2026-02-11

## What Codex already implemented

- Monorepo structure with:
  - `apps/alfred` (dashboard + API server)
  - `apps/chatui` (new console UI served under `/chat`)
- Jarvis bridge endpoints in `apps/alfred/server-fixed.js`:
  - `POST /api/jarvis/chat`
  - `GET /api/jarvis/history`
- Legacy link in dashboard header:
  - `http://127.0.0.1:3030/legacy`
- WorkQuest/XP foundations in `apps/chatui/src/App.tsx`:
  - XP, level progress, streak, focus meter
  - quest creation/progress/history
  - achievements + adaptive hints

## What is NOT finished yet

- No standalone `BossPanel` module in `apps/chatui` yet
- No standalone `TicketSystem` module in `apps/chatui` yet
- Legacy full "boss/xp/tickets" parity is not complete

## Suggested branch split for 4 parallel agents

Use existing branches:

- `codex/codex` -> core integration, API contracts, data model ownership
- `codex/claude` -> analytics quality: cognitive/linguistic scoring calibration + tests
- `codex/opencode` -> UI componentization: Boss panel, Ticket system, quest UX polish
- `codex/antigravity` -> deployment/ops: `alfred.xvadur.com`, reverse proxy, env hardening

## Coordination rules (important)

- Keep API schema source-of-truth in `apps/alfred/server-fixed.js`
- Do not break these stable routes:
  - `/api/status`
  - `/api/capture`
  - `/api/jarvis/chat`
  - `/api/jarvis/history`
- If one branch changes route payload shape, add migration note in PR
- Rebase/merge from `main` daily before pushing new feature work
