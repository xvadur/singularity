# singularity (monorepo)

Jarvis/Alfred console.

## Apps

- `alfred`: Express server for `alfred.xvadur.com` (dashboard at `/`, API under `/api/*`, chat at `/chat`)
- `chatui`: React UI (built and served by `alfred` at `/chat`)
- `legacy`: archived/recovered legacy ChatUI variants

## Current Status

- Jarvis chat bridge is active via:
  - `POST /api/jarvis/chat`
  - `GET /api/jarvis/history`
- New dashboard links:
  - `/chat` for new console UI
  - `/legacy` for legacy UI proxy
- WorkQuest (XP/quests/streak/focus) is already started in `chatui/src/App.tsx`

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
