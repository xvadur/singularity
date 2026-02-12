# nextui

Contract-preserving Next.js migration sandbox for Singularity.

## Purpose
- Build Next App Router runtime in parallel with existing Express + Vite stack.
- Recreate existing API contracts behind Next route handlers before cutover.

## Current parity
- `GET /api/status` -> proxied to `ALFRED_BASE_URL/api/status`.

## Implemented UX routes from `untitled.pen`
- `/` -> `Jarvis Command Center`
- `/chat` -> `Jarvis ChatUI - Runtime Thread`
- `/tasks` -> `Jarvis Tasks - PowerUnit Board`
- `/capture` -> `Jarvis Capture Hub` scaffold

## Environment
- `ALFRED_BASE_URL` default: `http://127.0.0.1:3031`

## Run
```bash
cd nextui
npm run dev
```
