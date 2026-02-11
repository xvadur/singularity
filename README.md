# singularity (monorepo)

Jarvis/Alfred console.

## Apps

- `alfred`: Express server for `alfred.xvadur.com` (dashboard at `/`, API under `/api/*`, chat at `/chat`)
- `chatui`: React UI (built and served by `alfred` at `/chat`)
- `jarvis-workspace`: local data layer for Jarvis/OpenClaw capture inbox, slash command queue, and event journal
- `legacy`: archived/recovered legacy ChatUI variants

## Current Status

- Jarvis chat bridge is active via:
  - `POST /api/jarvis/chat`
  - `GET /api/jarvis/history`
- Jarvis command queue endpoint:
  - `GET /api/jarvis/commands`
- Jarvis inbox processor endpoint:
  - `POST /api/jarvis/inbox/process`
- Chat capture now supports slash command ingest (`/log ...`) and writes to `jarvis-workspace/data/system/capture/commands.json`
- Chat UI now has `Agent` selector + `Jarvis toggle` (default OFF). When ON, the next sent message is forwarded to Jarvis, then toggle auto-returns to OFF.
- New dashboard links:
  - `/chat` for new console UI
  - `/legacy` for legacy UI proxy
- WorkQuest (XP/quests/streak/focus) is already started in `chatui/src/App.tsx`

## Workspace Storage

- Default runtime workspace path is `./jarvis-workspace` (inside this repo) when present.
- Override with `JARVIS_WORKSPACE=/absolute/path` if you want to keep runtime data elsewhere.

## Jarvis Inbox Cron

- Default schedule is every 3 hours (`JARVIS_INBOX_CRON_MS=10800000`).
- Disable with `JARVIS_INBOX_CRON_ENABLED=0`.
- Optional:
  - `JARVIS_INBOX_SESSION_KEY` to choose the session used for inbox processing
  - `JARVIS_INBOX_PROMPT` to override processing instructions

## Dev

```bash
npm install
npm run dev
```

- Dashboard (dev): `http://127.0.0.1:3031/`
- Chat UI (dev): `http://localhost:5173/` (proxies `/api/*` to `127.0.0.1:3031`)

## Build + Run (single port)

```bash
npm run build
npm run start
```

- Dashboard: `http://127.0.0.1:3030/`
- Chat (built): `http://127.0.0.1:3030/chat/`

## Security (optional)

If `alfred.xvadur.com` is public, protect the write endpoint:

- Set `CAPTURE_TOKEN` for the server (e.g. in `~/Library/LaunchAgents/com.xvadur.task-monitor.plist`)
- In Chat UI, paste the same token into **Token (optional)** so `/api/capture` can authenticate
