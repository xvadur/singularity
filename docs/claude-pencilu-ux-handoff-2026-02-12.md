# Claude Handoff: Pencil-First UX Runtime

Date: 2026-02-12
Repo: /Users/_xvadur/singularity
Primary branch: codex/powerunit-benchmark-slice
Primary PR: https://github.com/xvadur/singularity/pull/7

## 1. What Is Already Done

- PowerUnit economy baseline implemented and opened in PR #7.
- Backend additive alias fields added for PowerUnit display.
- ChatUI economy panel shows PU metrics.
- Economy scoring formula tests added.
- Design import baseline exists in Pencil from `Design ChatUI Layout.zip`.

Files changed by PR #7:
- /Users/_xvadur/singularity/alfred/server-fixed.js
- /Users/_xvadur/singularity/chatui/src/App.tsx
- /Users/_xvadur/singularity/alfred/economy-scoring.test.js
- /Users/_xvadur/singularity/docs/economy/powerunit-benchmark.md
- /Users/_xvadur/singularity/docs/economy/habitica-powerunit-spec.md
- /Users/_xvadur/singularity/docs/economy/powerunit-validation.md
- /Users/_xvadur/singularity/jarvis-workspace/data/system/game/powerunit-benchmark.json

## 2. Current Local Working State

Git status currently includes local-only items:
- Modified: /Users/_xvadur/singularity/Progress.md
- Untracked folder: /Users/_xvadur/singularity/nextui/
- Untracked file: /Users/_xvadur/singularity/untitled.pen

Do not assume untracked items are disposable.

## 3. Runtime Architecture Contract (Must Preserve)

Source of truth docs:
- /Users/_xvadur/singularity/Discovery.md
- /Users/_xvadur/singularity/README.md

Core runtime boundary:
- UI client: /Users/_xvadur/singularity/chatui
- API/orchestration: /Users/_xvadur/singularity/alfred/server-fixed.js
- Persistence adapter: /Users/_xvadur/singularity/jarvis-workspace
- Agent runtime bridge: OpenClaw gateway called from backend only

Locked endpoints (do not break):
- GET /api/status
- POST /api/capture
- POST /api/jarvis/chat
- GET /api/jarvis/history
- GET /api/jarvis/commands
- POST /api/jarvis/inbox/process

Hard compatibility rules:
- Keep localStorage key `alfred_workquest_v1` compatible.
- Do not modify /Users/_xvadur/singularity/legacy/.
- Keep slash command queue semantics (server-side parse, pending queue).

## 4. Pencil-First UX Intent

Working direction:
- UX is being designed primarily in Pencil and iterated from that source.
- Claude has direct Pencil workflow access in your setup.
- Goal is runtime-accurate UX, not visual-only mockups.

Imported Pencil baseline:
- Screen name: `ChatUI / XU Import (Design ChatUI Layout)`
- This is a usable layout seed, not yet final product UX.

## 5. Task/XP Skill Findings Relevant to UX

Audited skills in OpenClaw workspace:
- /Users/_xvadur/.openclaw/workspace/skills/task-status/SKILL.md
- /Users/_xvadur/.openclaw/workspace/skills/xp-system/SKILL.md
- /Users/_xvadur/.openclaw/workspace/skills/unification/SKILL.md
- /Users/_xvadur/.openclaw/workspace/skills/time-tracker/SKILL.md
- /Users/_xvadur/.openclaw/workspace/skills/business-metrics/SKILL.md

Key runtime nuance:
- Multiple parallel data paths exist in `~/.openclaw/workspace` and in singularity `jarvis-workspace`.
- Event schema variants coexist (`domain/type/ts` and `category/timestamp/time`).
- UX should avoid hard-coding assumptions to one legacy format; rely on current API outputs from `/api/status` and `/api/capture`.

## 6. Known API Nuance in PR #7

In PR #7, `deltaPU` is always present for ticket-claim flow, but not guaranteed by backend default object for every capture mode.

Practical implication:
- Frontend merge with local default is safe.
- Contract language should remain additive/optional unless backend default adds `deltaPU: 0` globally.

## 7. UX Build Guardrails for Claude

When implementing UX from Pencil:
1. Preserve existing CSS class names in current ChatUI unless explicitly migrating with mapping plan.
2. Keep component responsibilities under 200 lines where possible.
3. No new API endpoints without explicit Discovery approval.
4. Keep backward-compatible parsing for economy fields and missing aliases.
5. Run `npm run build` after each logical implementation chunk.

## 8. Suggested Execution Sequence in Claude

1. Lock final Pencil information architecture (navigation + primary cards + action zones).
2. Define data-to-UI mapping per card using current `/api/status` response shape.
3. Implement shell/layout first, then capture flow, then queue/runtime panels, then economy/task/xp surfaces.
4. Validate slash-command and jarvis-trigger interactions against existing `/api/capture` behavior.
5. Only after parity, do stylistic polish and micro-interactions.

## 9. Copy-Paste Prompt for Claude

Use this as a starter in Claude:

"Implement ChatUI UX from Pencil as runtime-accurate UI in /Users/_xvadur/singularity/chatui using existing API contracts only. Preserve localStorage compatibility (`alfred_workquest_v1`), keep slash queue semantics, and avoid edits in legacy/. Treat /Users/_xvadur/singularity/Discovery.md as architecture contract. Start from layout parity, then data mapping, then interactions. Build must pass after each phase (`npm run build`)."

## 10. Fast Verification Checklist

- Build passes: `npm run build`
- Capture still works: POST /api/capture from UI
- Slash commands still enqueue pending items
- Jarvis chat bridge still works via existing endpoints
- Economy panel still renders with or without `powerUnit` alias
- No regression in localStorage hydration

