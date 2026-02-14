# Discovery Interview Opening Handoff (Ultimate Schema v1)

Date: 2026-02-13
Owner: xvadur + Codex + Jarvis review
Working file: `/Users/_xvadur/singularity/Jarvis_Singularity.pen`
Target runtime: Next app (`nextui`) with backend parity in later phase

## Purpose
Open a fresh Discovery interview conversation with a single synchronized context, so design and backend can proceed without contract drift.

## Canonical Inputs
- `/Users/_xvadur/singularity/Discovery.md`
- `/Users/_xvadur/singularity/Plan.md`
- `/Users/_xvadur/singularity/Progress.md`
- `/Users/_xvadur/singularity/docs/claude_handoff_13.2.md`
- `/Users/_xvadur/singularity/docs/pencil-antigravity-merge-handoff.md`
- `/Users/_xvadur/singularity/docs/nextjs-target-frame-blueprint.md`

## Current Pencil Baseline (confirmed)
- `pgZ00`: Jarvis Command Center
- `cSmAZ`: Jarvis ChatUI - Runtime Thread
- `fNPnB`: Jarvis Tasks - PowerUnit Board
- `sxzmI`: Jarvis Capture Hub

## Locked Decisions From Jarvis Advisory
These are treated as default decisions unless explicitly overridden in interview.

1. Day starts on `/` (Dashboard), not `/chat`.
2. Morning Brief is mandatory by default, with explicit skip override.
3. Brief required fields: `Energy` and `Promise`; `Topic` optional.
4. Session name: auto-generated, manual edit allowed, user-only edits.
5. Dashboard metrics: `4 fixed + 2 dynamic`.
6. `/chat` should be hybrid feed (prose blocks + Jarvis annotations), not pure bubbles.
7. Jarvis annotations are trigger-based, not per message.
8. Trigger set: command, manual review, 03:00 archive summary.
9. Sticky daily header on `/chat` is required.
10. Edit window for old entries: 5 minutes, then append-only corrections.
11. BottomCaptureBar should be persistent across all routes.
12. Default mode: `Capture`, with last-used memory.
13. Keyboard shortcuts: `Cmd+Shift+C/L/T/D` when input is not focused.
14. `/tasks` inbox is preview-first (top 5), expandable.
15. One-click promote from inbox to task is required.
16. Task board should be status-column oriented.
17. MVP statuses: `Todo -> In Progress -> Done`.
18. Scoring formula panel should be optional (toggle), not always visible.
19. `/capture` should stay payload-driven (same form, mode affects processing intent).
20. Economy preview should update live while typing.
21. Slash command parser handoff should be visible in UI state.
22. API failure UX: toast + preserve input (never lose text).
23. 03:00 should produce explicit day-sealed archive event in UI.
24. Always-visible global KPIs: `Words Today`, `XP Today`, `Cashflow Today`.
25. v1 Definition of Done: UX behavior parity first; visual parity later; backend parity after.

## 4-Phase Discovery Framework (for new conversation)

### Phase 1: Scope Lock (7-10 min)
Goal: lock product boundaries for v1 behavior parity.
- Confirm route priorities (`/`, `/chat`, `/tasks`, `/capture`).
- Confirm what is in v1 vs moved to v2/v3.
- Confirm no contract-breaking backend scope in this phase.

### Phase 2: UX Behavior Lock (10-12 min)
Goal: lock how users interact on each route.
- Morning Brief lifecycle and unlock logic.
- Feed block taxonomy and annotation behavior.
- BottomCaptureBar behavior and shortcuts.
- Task board workflow and inbox promote flow.
- Capture form behavior and command feedback states.

### Phase 3: Data and Contract Lock (5-7 min)
Goal: lock runtime-safe behavior against existing contracts.
- Keep endpoint contracts unchanged.
- Keep queue semantics (`commands.json`) and capture journaling.
- Keep local storage compatibility (`alfred_workquest_v1`).
- Lock 03:00 archive and session naming behavior.

### Phase 4: Execution and QA Lock (5-7 min)
Goal: convert decisions into implementable checklist.
- Prioritized sequence: Pencil edits -> Next UI implementation -> backend parity.
- Acceptance criteria per route.
- Error states and regression checks.
- Build/test gates and rollout checkpoints.

## 30-Minute Question Script
Use these in sequence. One question at a time.

1. What exact condition unlocks `/chat` after Morning Brief?
2. Should skip override be single-click or two-step confirm?
3. What is the exact energy scale and default value?
4. What are validation limits for Promise text?
5. Should Topic suggestion come from Jarvis context or remain manual only?
6. Should KPI header be global sticky on all routes?
7. How often should KPI data refresh (poll interval/manual/hybrid)?
8. What threshold reveals dynamic Queue card?
9. What threshold reveals dynamic Cashflow card?
10. Should low-energy warning be dismissible for the day?
11. Should high-backlog warning be dismissible for the day?
12. What block types are mandatory in hybrid `/chat` feed?
13. Should journal block support markdown formatting in v1?
14. Should Jarvis annotations have distinct visual frame and prefix always?
15. Should `/ask` create both command block and immediate annotation block?
16. Where should manual "Jarvis review" trigger live in UI?
17. Should feed sorting be strictly chronological with no grouping?
18. Should correction entries reference original entry ID in UI?
19. Should BottomCaptureBar mode memory reset daily or persist across days?
20. Should shortcuts be disabled while modal/dialog is open?
21. Should `/tasks` inbox preview sort by recency or priority first?
22. Should "Show all" expand inline or open side panel?
23. One-click promote default task type: Todo or inferred from source?
24. One-click promote default priority: Medium or inherited from capture?
25. Should scoring formula toggle state persist per user session?
26. Should capture form keep same fields for all modes in v1?
27. Should economy preview show one value (EEU) or EEU+XP+coins estimate?
28. Should slash command states include `Parsing -> Queued -> Processed` timeline?
29. Should 03:00 archive event be visible on Dashboard too or only `/chat`?
30. What are the 3 mandatory acceptance flows for v1 sign-off?

## Expected Outputs From Interview
1. Discovery updates with explicit decision records and rationale.
2. Plan updates with phase outcomes and implementation order.
3. Progress updates with start/completion entries for interview round.
4. One implementation lock doc for builders (`nextui` + backend).

## Paste-Ready Kickoff Prompt (new conversation)
Use this block to open the next interview conversation:

```text
Run a 4-phase Discovery interview for Jarvis Ultimate Schema v1 using:
- /Users/_xvadur/singularity/docs/discovery-interview-opening-handoff-2026-02-13.md
- /Users/_xvadur/singularity/Discovery.md
- /Users/_xvadur/singularity/Plan.md
- /Users/_xvadur/singularity/Progress.md
- /Users/_xvadur/singularity/docs/pencil-antigravity-merge-handoff.md

Interview mode:
- One question at a time.
- Keep answers decision-grade, implementation-ready.
- Use locked decisions in the handoff as defaults unless overridden.
- Finish with explicit route-by-route behavior contract and v1 DoD checklist.

Do not implement code yet. This session is Discovery lock only.
```
