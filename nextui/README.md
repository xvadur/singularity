# Jarvis Next Bootstrap

This app is the Next.js strangler bootstrap for Singularity.

## Goal
- Keep existing API contracts untouched while migrating UI slices incrementally.
- Current parity bridge routes:
  - `GET /api/status`
  - `POST /api/capture`

## Environment
Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Defaults:
- `ALFRED_BASE_URL=http://localhost:3031`
- `NEXT_PUBLIC_ENABLE_THREE=0`

## Run

```bash
npm run dev
```

Or from repository root:

```bash
npm run dev:next
```

## First migration slice
- API parity proxy handlers in `src/app/api`.
- Verification UI in `src/app/page.tsx`.
- Feature-flagged Three.js baseline in `src/components/effects/ThreeBackdrop.client.tsx`.

