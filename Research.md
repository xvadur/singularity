# Research

## Purpose
Evidence base for implementation decisions. Every claim should map to a source, experiment, or direct code reference.

## Status
- State: `in_progress`
- Owner: `Main Agent (Codex)`
- Last Updated: `2026-02-13`

## Research Tracks
- Track A: Habitica game loop extraction (task model, scoring, progression)
- Track B: Jarvis runtime fit (what maps cleanly vs what does not)
- Track C: Quest system extraction (single-user adaptation)
- Track D: API and architecture extraction for Next.js target
- Track E: Cron, reliability, and data integrity patterns

## Method
- Input from Discovery: Need proven RPG mechanics without inheriting Habitica's full product complexity; preserve Jarvis runtime contracts and local-first storage.
- Hypotheses:
  - Habitica's core scoring and cron rules are portable as pure domain logic.
  - Habitica's social/guild/payments layers are not portable for Jarvis MVP.
  - Next.js target should import mechanics, not Habitica architecture.
- Validation approach: Direct code mapping from Habitica fork to Jarvis domain candidates.
- Acceptance criteria: Produce implementation-ready mapping of "reuse as logic" vs "ignore for MVP."

## Findings
### Track A
- Finding: Habitica's scoring engine is centralized in `scoreTask` with deterministic task-value drift and explicit reward channels (XP, gold, HP, MP, streak, quest progress).
- Source: `/Users/_xvadur/singularity/references/habitica/website/common/script/ops/scoreTask.js`
- Applicability: Strong fit for Jarvis `domain/game/scoreTask.ts` baseline; keep formula shape, simplify stat dependencies.
- Finding: Level progression is handled by `updateStats` + `toNextLevel` and is independent from UI.
- Source: `/Users/_xvadur/singularity/references/habitica/website/common/script/fns/updateStats.js`, `/Users/_xvadur/singularity/references/habitica/website/common/script/statHelpers.js`
- Applicability: Directly portable to Jarvis progression module with fewer side effects.

### Track B
- Finding: Habitica does not model AI command queue/orchestration; Jarvis queue design remains custom and should not be replaced.
- Source: Negative mapping from scanned Habitica controllers/libs vs Jarvis runtime (`/Users/_xvadur/singularity/alfred/server-fixed.js`).
- Applicability: Keep Jarvis `inbox.json` + `commands.json` + `chatui-events.jsonl` as first-class runtime primitives.
- Finding: Habitica uses short-lived transient result payloads (`user._tmp`) to return side effects from scoring.
- Source: `/Users/_xvadur/singularity/references/habitica/website/common/script/ops/scoreTask.js`, `/Users/_xvadur/singularity/references/habitica/website/server/libs/tasks/index.js`
- Applicability: Good pattern for Jarvis API responses (`effects`, `rewards`, `warnings`) without polluting persisted state.

### Track C
- Finding: Quest lifecycle is explicit: invite/accept/start, progress accumulation, completion reward fan-out.
- Source: `/Users/_xvadur/singularity/references/habitica/website/server/controllers/api-v3/quests.js`, `/Users/_xvadur/singularity/references/habitica/website/server/models/group.js`
- Applicability: Reuse quest state machine concepts, but collapse social ceremony for single-user mode.
- Finding: Boss quest and collection quest share same progress contract but different completion triggers.
- Source: `/Users/_xvadur/singularity/references/habitica/website/server/models/group.js`
- Applicability: Use one unified Jarvis quest interface with pluggable progress strategy (`boss`, `collect`, `milestone`).

### Track D
- Finding: Habitica app architecture is large legacy stack (Express + Mongoose + old client architecture) and not a good skeleton for a fresh Next app.
- Source: `/Users/_xvadur/singularity/references/habitica/website/server`, `/Users/_xvadur/singularity/references/habitica/website/client`, `/Users/_xvadur/singularity/references/habitica/package.json`
- Applicability: Do not fork as runtime foundation; use `create-next-app` and port mechanics only.
- Finding: Common domain code is intentionally shared (`website/common/script/index.js`) and consumed by server/client.
- Source: `/Users/_xvadur/singularity/references/habitica/website/common/script/index.js`
- Applicability: Confirms strategy to place Jarvis mechanics in framework-agnostic domain package reused by route handlers and UI.

### Track E
- Finding: Cron wrapper implements strong anti-double-run protection (`_cronSignature`) plus transactional saves.
- Source: `/Users/_xvadur/singularity/references/habitica/website/server/libs/cron.js`
- Applicability: Reuse idempotency/lock idea for Jarvis periodic inbox processing to prevent duplicate processing runs.
- Finding: Daily penalties and resets are cron-driven, including "missed schedule" logic and state reset.
- Source: `/Users/_xvadur/singularity/references/habitica/website/server/libs/cron.js`, `/Users/_xvadur/singularity/references/habitica/website/common/script/cron.js`
- Applicability: Useful for Jarvis "end-of-day / missed commitments" mechanics if enabled in MVP+1.

### Track F (Interview Round 16 Contract Evidence)
- Finding: Morning Brief is now a hard UX/runtime gate with explicit skip path (required reason), strict content limits, and persistence in the same brief stream.
- Source: `/Users/_xvadur/singularity/Discovery.md` (`2026-02-13` Interview Round 16 section).
- Applicability: Implement as deterministic validation/state machine in UI + persistence adapters; avoid separate skip-only storage.
- Finding: KPI behavior is contract-locked to `60s` refresh cadence with short-interval diff semantics and tri-state coloring.
- Source: `/Users/_xvadur/singularity/Discovery.md` (`2026-02-13` Interview Round 16 section).
- Applicability: Requires previous-snapshot cache in app shell and stable diff rendering across route changes.
- Finding: Command execution observability and recovery are lock-defined (`Accepted -> Plan -> Execution -> Measurement -> Done`, auto-retry every `30s`, hard cap `20`, then `failed-final` + manual retry).
- Source: `/Users/_xvadur/singularity/Discovery.md` (`2026-02-13` Interview Round 16 section).
- Applicability: Requires explicit command lifecycle enum + retry counter in runtime state, with local failure presentation.
- Finding: Task promote flow defaults are lock-defined (`Todo`, `Medium`) and inbox ordering remains recency-first with optional manual reorder override.
- Source: `/Users/_xvadur/singularity/Discovery.md` (`2026-02-13` Interview Round 16 section).
- Applicability: Implement predictable defaults first, then add reorder persistence without breaking fast-path promote.

## Technical Notes
- Benchmarks: Not run yet (code reading pass only).
- Experiments: Not run yet (next step is deterministic replay tests for extracted scoring rules).
- Tradeoffs:
  - Reusing formulas gives speed and design confidence.
  - Reusing architecture would import unnecessary complexity (social, payments, moderation, legacy stack).
  - Best leverage path is "mechanics extraction + contract-preserving integration."

## Recommended Decisions
- Decision: Use `create-next-app` as platform skeleton; do not use Habitica as app skeleton.
- Why: Habitica architecture is high-complexity and mismatched to Jarvis runtime.
- Expected impact: Faster path to maintainable Next codebase.
- Decision: Extract a Jarvis `domain engine` with Habitica-inspired modules (`taskTypes`, `scoreTask`, `progression`, `questProgress`, `dailyReset`).
- Why: Mechanics are proven and largely UI-agnostic.
- Expected impact: Stable gameplay behavior with lower implementation risk.
- Decision: Keep Jarvis runtime adapters unchanged in MVP (workspace files + OpenClaw orchestration via backend boundary).
- Why: Already implemented and tied to your operational workflow.
- Expected impact: Migration without breaking capture/chat/runtime loop.
- Decision: Add cron lock/idempotency semantics in Jarvis processing similar to Habitica cron wrapper.
- Why: Prevent duplicate processing under concurrent requests.
- Expected impact: Higher runtime reliability.
- Decision: Implement Round 16 contracts as first-class product invariants before visual polish.
- Why: The interview locked behavioral acceptance for all four core flows and v1 sign-off requires full scope.
- Expected impact: Reduces rework and contract drift during implementation.

## Gaps
- Missing evidence:
  - Exact subset of Habitica scoring constants to keep vs tune for introspective use case.
  - Whether to persist WorkQuest on server in MVP or keep `alfred_workquest_v1` local-first.
- Unknowns requiring follow-up:
  - Final quest taxonomy for Jarvis (boss/collection/milestone mix).
  - Next API shape for bulk scoring and side-effect payloads.

## Research Log
- `2026-02-12`: Habitica extraction pass 1 -> forked and mapped core mechanics + cron + quest flow -> next action: define Jarvis domain module spec and migration tasks in Plan.md.
- `2026-02-13`: Round 16 synthesis -> translated rapid 30-question contract locks into implementation evidence for Morning Brief, KPI diffs, command lifecycle/retry, and task promote defaults.
