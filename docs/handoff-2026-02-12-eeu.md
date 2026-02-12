# Handoff - 2026-02-12 (EEU Economy + Context-First Discovery)

## 1) Co je hotove
- Implementovany internal EEU economy engine (off-chain, bez noveho frameworku):
  - ledger + event journal
  - progress-claim model (delta progress)
  - shared damped curve EEU -> XP + coins
  - anti-inflation (soft slowdown + hard cap + flags)
  - 3-tier shop (Micro/Standard/Major)
- API kontrakty zostali rovnake (bez novych endpointov), iba additive payload fields:
  - `POST /api/capture` podporuje `meta.ticket` a `meta.shopPurchase`
  - `POST /api/capture` vracia `economyEffect`, `shopPurchase`, `economy`
  - `GET /api/status` vracia `economy` snapshot
- Frontend ma:
  - Ticket ID / Planned EEU / Progress / Task Type controls
  - EEU Economy monitor box
  - Reward shop actions
  - Last economy effect box
- Fixnuty runtime crash v `Life Stats` pri null hodnotach.

## 2) Klucove subory
- Backend:
  - `/Users/_xvadur/singularity/alfred/server-fixed.js`
- Frontend:
  - `/Users/_xvadur/singularity/chatui/src/App.tsx`
- Discovery + plan docs:
  - `/Users/_xvadur/singularity/Discovery.md`
  - `/Users/_xvadur/singularity/Plan.md`
  - `/Users/_xvadur/singularity/Progress.md`
- New docs:
  - `/Users/_xvadur/singularity/docs/habitica-mechanics-primer.md`
  - `/Users/_xvadur/singularity/docs/current-singularity-reality-snapshot.md`
  - `/Users/_xvadur/singularity/docs/nextjs-target-frame-blueprint.md`
  - `/Users/_xvadur/singularity/docs/discovery-interview-context-template.md`

## 3) Data files (workspace)
- Ledger:
  - `/Users/_xvadur/singularity/jarvis-workspace/data/system/game/economy-ledger.json`
- Economy events:
  - `/Users/_xvadur/singularity/jarvis-workspace/data/system/game/economy-events.jsonl`
- Capture test data boli pocas testovania zapisane do:
  - `/Users/_xvadur/singularity/jarvis-workspace/data/system/capture/inbox.json`
  - `/Users/_xvadur/singularity/jarvis-workspace/data/chat/chatui-events.jsonl`

## 4) Co je overene
- `npm run build` prechadza.
- UI nabehne na dev serveri a economy panel funguje.
- `GET /api/status` vracia data.
- Shop aj ticket-claim flow je funkcny v UI.

## 5) Ranny postup (next steps)
1. Spustit stack:
```bash
cd /Users/_xvadur/singularity
npm run dev
```
2. Otvorit:
- `http://localhost:5173/`
3. Quick verification (5 min):
- vytvor task s `Ticket ID`, `Planned EEU`, `Progress 20`
- update rovnakeho ticketu na `Progress 60`
- over `Last economy effect` + `EEU Economy` box
- kup `Micro Reward` a over odpočet coinov
4. Pozriet data:
- `economy-ledger.json`
- `economy-events.jsonl`
5. Ak je vsetko OK, pripravit commit.

## 6) Navrh commitov (conventional)
- `feat: add internal EEU economy ledger with additive capture/status extensions`
- `docs: add context-first discovery artifacts and nextjs migration blueprint`
- `fix: guard life stats rendering against null values`

## 7) Co robit po commitnuti
1. Dokoncit Discovery interview (dalsie roundy) uz len cez context-template:
   - "How Habitica does it"
   - "How Jarvis currently does it"
   - "What decision changes in implementation"
2. Zajtra navrhnut prvy Next parity slice:
   - route handler parity pre `/api/status` + `/api/capture` v Next appke (bez cutoveru).

## 8) Poznamka
- `alfred_workquest_v1` ostal zachovany (compat).
- `legacy/` nebolo menene.
- Endpoint set sa nezmenil, len payload je rozsireny additive.
