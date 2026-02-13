# Discovery

## Purpose
Single source of truth for product intent, scope, architecture, integrations, UX direction, and delivery constraints.

## Status
- State: `in_progress`
- Owner: `Main Agent (Codex)`
- Last Updated: `2026-02-12`

## Product Vision
- Problem statement: The Jarvis system currently has three disconnected UI surfaces: a primitive vanilla HTML dashboard at `/` (alfred/public/index.html) with no interactivity beyond 60s auto-refresh, a monolithic 1390-line React component (chatui/src/App.tsx) that combines capture form, WorkQuest gamification, and system monitoring into one unstructured file, and a legacy dashboard (legacy/) that is archived and unused. There is no navigation between views, no proper component architecture, and no dedicated Jarvis chat interface — only a simple toggle that fires a single message.
- Target users: Solo developer/operator (xvadur) managing a personal AI productivity system (Jarvis/OpenClaw) for daily task capture, quest tracking, XP-based gamification, health monitoring, and AI agent orchestration.
- Core value proposition: A single, unified command center that replaces all three disconnected UIs with a properly architected React dashboard featuring client-side routing, dedicated sections for each concern (capture, quests, tasks, XP, chat, vitality, systems), and data visualization — making Jarvis the central interface for all personal productivity operations.
- Success definition: One dashboard application that serves as the sole UI for the Jarvis system, where the user can navigate between all features via sidebar, interact with Jarvis through a full chat interface, capture tasks/ideas instantly, track quest progress and XP visually, and monitor system health — all without leaving the `/chat/` route.

## Scope
- In scope: Dashboard component decomposition (App.tsx -> ~25 components), client-side routing (react-router-dom, 8 routes), React context-based state management (3 providers), Jarvis full chat interface (useJarvisChat hook + JarvisChat component), data visualization with recharts (XP trends, vitality charts), icon system (lucide-react), CSS organizational split (app.css -> styles/ directory), alfred server root redirect to /chat/.
- Out of scope: Backend API changes (all endpoints already functional), new gamification mechanics (XP engine fully implemented), mobile native app, authentication/multi-user support, OpenClaw gateway changes, new data storage formats.
- Phase boundaries: Foundation (types, lib, context extraction) -> Component Decomposition (break monolith) -> Layout + Routing (navigation shell) -> New Features (Jarvis chat, charts, CommandCenter) -> Integration (alfred redirect, build, verify).

## Functional Goals
- Goal 1: Decompose the monolithic chatui/src/App.tsx (1390 lines) into ~25 focused, reusable React components organized by domain (capture, quests, workquest, jarvis, dashboard, shared, layout) with extracted types (types/), pure functions (lib/), and context providers (context/).
- Goal 2: Implement client-side routing with react-router-dom providing 8 dedicated routes: / (dashboard home), /capture (form + inbox), /quests (tracker + creator), /tasks (board), /xp (XP dashboard + history + achievements), /jarvis (full chat), /vitality (health monitor), /systems (status + events).
- Goal 3: Build a full Jarvis chat interface with message history, user/assistant bubbles, text input, and send functionality — replacing the current simple toggle that can only fire a single message. Wire to existing POST /api/jarvis/chat and GET /api/jarvis/history endpoints.

## Non-Functional Goals
- Performance: Dashboard must load in under 2 seconds on localhost. Auto-refresh polling at 30s intervals must not cause UI jank. Recharts renders must be lazy or deferred to avoid blocking initial paint.
- Reliability: All existing functionality must survive the decomposition without regression. localStorage game state (key: alfred_workquest_v1) must remain backward-compatible. API fetch failures must show graceful error states, not blank screens.
- Security: No new security concerns — all API calls stay on same origin (no CORS), no auth changes. Capture token (CAPTURE_TOKEN) behavior preserved.
- Maintainability: No component file should exceed 200 lines. Each component has a single responsibility. Shared UI primitives (Card, Badge, ProgressBar, MetricRow) extracted for reuse. CSS split by domain, no inline styles.

## UX and Interaction Model
- Primary flows: (1) Open dashboard -> see CommandCenter hero with level, XP ring, streak, vitality at a glance -> navigate via sidebar to any section. (2) Capture flow: sidebar -> /capture -> type quick note/task -> see it in inbox list below. (3) Jarvis chat: sidebar -> /jarvis -> full conversation with message history and text input. (4) XP tracking: sidebar -> /xp -> see level progression, focus ring, 7-day XP chart, achievements, prompt history.
- Agent interaction model: Jarvis toggle arms capture messages to also route through POST /api/jarvis/chat. When toggled on, each capture simultaneously submits to inbox AND sends to Jarvis for processing. JarvisChat page provides direct, dedicated conversation independent of capture.
- Toggle and command behavior: Slash commands (e.g., /log ...) detected in capture input are parsed and enqueued to jarvis-workspace/data/system/capture/commands.json. Agent mode selector allows choosing between agent profiles. Jarvis armed toggle persists in localStorage (alfred_jarvis_toggle_v1).
- Accessibility expectations: Keyboard navigable sidebar, focus management on route changes, semantic HTML (nav, main, aside), sufficient color contrast on dark theme (current glassmorphism passes WCAG AA for text).

## Integrations
- Internal systems: Alfred Express server (alfred/server-fixed.js) serves the built React app at /chat/* and provides all API endpoints. Jarvis workspace (jarvis-workspace/) stores inbox.json, commands.json, chatui-events.jsonl for persistence.
- External systems: OpenClaw AI agent gateway (called via alfred server, not directly from frontend). Cloudflare Tunnel exposes alfred to public URL (alfred.xvadur.com).
- APIs and contracts:
  - GET /api/status -> { timestamp, player, overview, inbox, quests, tasks, life, events, openclaw, systems, vitality }
  - POST /api/capture -> { id, type, content, priority, tags, meta } -> { ok, captureId, jarvisReply? }
  - POST /api/jarvis/chat -> { threadId, message } -> { reply, history }
  - GET /api/jarvis/history -> { messages[] }
  - GET /api/jarvis/commands -> { queue[], stats }
  - POST /api/jarvis/inbox/process -> { summary }

## Jarvis Runtime Architecture (Current)
- Architecture type: Runtime-first local-first system where UI is a client and `alfred/server-fixed.js` is the orchestration boundary for capture, status aggregation, queueing, and OpenClaw calls.
- Layer 1 (UI client): `chatui/src/App.tsx` handles capture form, WorkQuest scoring, Jarvis toggle, and polling of `/api/status` every 30s.
- Layer 2 (API/orchestration): `alfred/server-fixed.js` validates requests, writes workspace files atomically, maintains cache for status snapshots, and bridges to OpenClaw gateway methods.
- Layer 3 (workspace persistence): `jarvis-workspace/data/system/capture/inbox.json` (captured items), `jarvis-workspace/data/system/capture/commands.json` (slash command queue), `jarvis-workspace/data/chat/chatui-events.jsonl` (append-only journal).
- Layer 4 (agent runtime): OpenClaw gateway methods (`chat.send`, `chat.history`, `agent.wait`, `sessions.list`, `cron.list`) are called only from backend.
- Session model: Backend normalizes `sessionKey` using `resolveJarvisSessionKey(inputSessionKey, threadId)`; when no explicit key is given it derives `agent:main:webchat:<threadId>` or falls back to `OPENCLAW_SESSION_KEY`.
- Capture pipeline: UI -> `POST /api/capture` -> payload validation + slash command parse -> write inbox item + update capture stats -> optional queue insert -> append event journal -> cache invalidation.
- Slash command flow: Content starting with `/` is parsed server-side; currently `/log ...` resolves to command payload and is inserted as `pending` into `commands.json`.
- Jarvis chat pipeline: UI toggle ON -> next capture optionally triggers `POST /api/jarvis/chat` -> backend sends `chat.send`, waits run completion (`agent.wait`), reads `chat.history`, returns extracted assistant reply text.
- Inbox automation flow: `POST /api/jarvis/inbox/process` and 3h cron (`JARVIS_INBOX_CRON_MS`) call `triggerJarvisInboxProcessing`; processing is skipped when inbox and command queue have no pending work (unless `force=true`).
- Status assembly flow: `GET /api/status` aggregates xp/quests/tasks/life/events/openclaw/workspace, then serves cached response (TTL 30s) with stale fallback on refresh errors.
- Safety controls: Optional `CAPTURE_TOKEN` guard for write endpoint; idempotency keys for gateway send requests; strict session key sanitization; atomic file writes to reduce corruption risk.

## Technical Direction
- App structure: Extend existing chatui/ workspace (not a new project). Add react-router-dom for multi-page SPA, recharts for data viz, lucide-react for icons. Decompose into types/, lib/, context/, hooks/, components/ (layout, dashboard, capture, quests, tasks, workquest, jarvis, shared), styles/. Main entry (main.tsx) wraps App with BrowserRouter (basename="/chat") and three nested context providers (Status > Game > Capture).
- Data model direction: No changes to data models. StatusResponse type from /api/status is the primary read model. GameState (quests, runs, streak, achievements, settings) persists in localStorage. Capture submissions go to alfred API. All types extracted from App.tsx into types/ directory.
- Event and queue flow: User captures -> POST /api/capture -> alfred writes to inbox.json + chatui-events.jsonl -> cache invalidated -> next GET /api/status returns updated data -> StatusContext auto-refresh picks it up. Slash commands parsed client-side, enqueued server-side. Jarvis cron processes pending inbox every 3 hours (configurable).
- Runtime/deployment model: Dev: `npm run dev:all` runs alfred (port 3031) + Vite dev server (port 5173, proxies /api to 3031). Prod: `npm run build` compiles chatui to dist/, `npm run start` runs alfred (port 3030) serving dist/ at /chat/*. Cloudflare Tunnel routes public traffic to 127.0.0.1:3030.

## Technical Direction (Next.js Target)
- Target shape: `create-next-app` baseline with App Router as the primary web runtime, while preserving the existing Jarvis runtime contracts and workspace file format.
- API continuity rule: Keep endpoint contracts stable (`/api/status`, `/api/capture`, `/api/jarvis/chat`, `/api/jarvis/history`, `/api/jarvis/commands`, `/api/jarvis/inbox/process`) and re-home implementations behind Next route handlers.
- Domain extraction rule: Move WorkQuest and prompt scoring logic out of UI into framework-agnostic TypeScript modules so rules can run identically in server handlers and client visualization.
- Infrastructure adapters: Keep `jarvis-workspace` as persistence adapter and OpenClaw gateway adapter as backend-only integration point (never from browser).
- Migration strategy: Run architecture migration in phases (contract freeze -> domain extraction -> Next route handlers -> UI route migration -> cutover), with old Express path as fallback during transition.
- Non-negotiables: Preserve `alfred_workquest_v1` compatibility during migration, preserve slash command queue semantics, preserve cron-driven inbox processing behavior.

## Risks and Constraints
- Product risks: Decomposing a working monolith could introduce regressions if prop passing or context wiring is incorrect. Mitigate with incremental extraction (one component at a time) and build verification after each.
- Technical risks: (1) Vite base: '/chat/' must exactly match React Router basename="/chat" — mismatch causes blank pages or 404s. (2) localStorage key alfred_workquest_v1 holds full GameState — GameContext must read/write identical format or existing user progress is lost. (3) CSS class names must not change during organizational split or styling breaks silently.
- Operational risks: The submit function (App.tsx lines 539-714, ~175 lines) is the most complex piece — it handles capture submission, XP calculation, quest progression, achievement unlocking, streak updates, and Jarvis triggering. Splitting it across contexts would create coupling bugs. Keep as one cohesive function in CaptureContext.
- Mitigations: Build after every phase. Keep vanilla HTML dashboard accessible at /dashboard as fallback during migration. No CSS renaming — only file organization. Test all routes end-to-end before redirecting root /.

## Open Questions
- Q1: EEU calibration tuning after first production week (`softStart=1200`, `cap=2500` currently).
- Q2: Shop catalog expansion policy after MVP (keep fixed 3-tier vs configurable templates).
- Q3: Full platform-wide migration to strict wall-clock `03:00 local` scheduler (current inbox cron remains interval-based).
- Q4: Calendar integration scope in ChatUI mini-calendar (`create event only` vs full sync/edit/delete path).

## Interview Notes
- This section is filled during structured interview rounds with user.
- Use dated entries.
- Interview format lock: every new decision prompt must include:
  1. How Habitica does it.
  2. How Jarvis currently does it.
  3. What the decision changes in implementation.

### `2026-02-12` Pre-Interview Pack (Skill-Assisted)
- Skills used: `habitica-domain-mapper`, `chat-intent-router`, `api-contract-guard`, `localstorage-compat-check`.

#### Contract Lock Snapshot
| Endpoint | Caller (current) | Handler (current) | Contract status |
| --- | --- | --- | --- |
| `GET /api/status` | `chatui/src/App.tsx` (`refresh`) | `alfred/server-fixed.js` | locked |
| `POST /api/capture` | `chatui/src/App.tsx` (`submit`) | `alfred/server-fixed.js` | locked |
| `POST /api/jarvis/chat` | `chatui/src/App.tsx` (`submit` when armed) | `alfred/server-fixed.js` | locked |
| `GET /api/jarvis/history` | future dedicated chat page | `alfred/server-fixed.js` | locked |
| `GET /api/jarvis/commands` | monitor/debug surfaces | `alfred/server-fixed.js` | locked |
| `POST /api/jarvis/inbox/process` | manual trigger + cron flow | `alfred/server-fixed.js` | locked |

#### Intent Routing Baseline
| Intent class | Entry | Backend effect | Must preserve |
| --- | --- | --- | --- |
| `plain_capture` | capture form submit | append to `inbox.json` + event journal | graceful errors, no contract drift |
| `slash_command` | content begins with `/` | parsed server-side, enqueue `commands.json` as `pending` | server-side parse authority |
| `jarvis_armed_capture` | toggle ON + next capture | capture + optional `POST /api/jarvis/chat` | one-shot toggle behavior |
| `direct_chat` | dedicated chat route (target) | `POST /api/jarvis/chat` + `GET /api/jarvis/history` | `resolveJarvisSessionKey(...)` semantics |

#### Habitica -> Jarvis MVP Mapping
| Habitica concept | Jarvis mapping | Source of truth today | API impact | Compatibility risk |
| --- | --- | --- | --- | --- |
| `habit` (up/down behavior) | prompt run scoring event | `chatui/src/App.tsx` `runs[]` | none | `alfred_workquest_v1` shape |
| `daily` | recurring commitment quest step (planned) | local game state + future domain module | none (MVP) | streak/reset semantics |
| `todo` | capture task in inbox | `jarvis-workspace/.../inbox.json` | `POST /api/capture` | low |
| `reward` | XP/badge/reward unlock surface | local achievements + future reward model | none (MVP) | low |
| `streak` | `streakDays` progression | `alfred_workquest_v1` | none | high if schema changed |
| `quest` (boss/collection) | quest object with progress strategy | local quests + workspace quest list | none (MVP) | medium |
| cron penalties/reset logic | inbox processing + future daily reset | `JARVIS_INBOX_CRON_*` flow | `POST /api/jarvis/inbox/process` | medium |
| social party/challenge layer | no MVP equivalent | none | none | none |

#### LocalStorage Compatibility Gate
- Canonical key must remain: `alfred_workquest_v1`.
- Hydration must stay defensive (`try/catch`, missing-field defaults).
- Any migration must be additive and idempotent.
- No backend persistence switch as part of interview prep.

#### Implementation-Ready Scope (Post-Interview)
- Primary files: `chatui/src/App.tsx`, `alfred/server-fixed.js`, extracted domain modules (`chatui/src/lib` or new shared package during Next migration).
- Hard guardrails:
  - no new endpoints without Discovery decision,
  - preserve slash command queue semantics,
  - preserve `resolveJarvisSessionKey(...)` behavior,
  - preserve `alfred_workquest_v1` compatibility.

#### Regression Checklist (must pass after changes)
1. Plain capture with Jarvis OFF -> inbox write succeeds.
2. Plain capture with Jarvis ON -> capture succeeds and Jarvis call is attempted.
3. Slash command (`/log ...`) -> queue entry appears as `pending`.
4. Jarvis gateway failure -> capture still succeeds with graceful error.
5. Build verification -> `npm run build` passes.

#### Open Decisions for Interview Round
1. Session model default: one global thread vs multi-thread by context.
2. Cron placement in Next target: web process vs dedicated worker.
3. Queue strategy: file-first (`commands.json`) vs event-log-first with compatibility layer.
4. WorkQuest persistence horizon: localStorage-only MVP vs server persistence now.
5. MVP task taxonomy: which subset of Habitica task types to expose in first UI.

### `2026-02-12` Interview Round 2 (Decisions Captured)
- User inputs:
  - Q1 Session model: `B` (multi-session by context).
  - Q2 Cron placement: undecided (user requested clarification of differences).
  - Q3 Queue strategy: `A` (keep file-first `commands.json`).
  - Q4 WorkQuest persistence for MVP: `B` (add server persistence now).
- Round 2 summary:
  - Direction is now clearly multi-session, file-first queue, and server-backed WorkQuest persistence.
  - Cron execution model remains open and blocks final architecture lock for operations reliability.
- Proposed concrete decisions from this round:
  1. Adopt contextual session keys (`capture`, `chat`, `review`) with backend authority via `resolveJarvisSessionKey(...)`.
  2. Keep `commands.json` as primary queue format for MVP and migration period.
  3. Introduce server persistence for WorkQuest in MVP with strict backward compatibility bridge from `alfred_workquest_v1`.
  4. Defer cron placement final call to next round with explicit tradeoff choice.

### `2026-02-12` Interview Round 3 (Decisions Captured)
- User inputs:
  - Cron requirement: daily Jarvis cleanup at 03:00 local time must run inside Singularity flow.
  - Daily-driver usage: user writes daily journal + slash commands + Jarvis conversations through toggle flow.
  - Multi-session naming: daily session name derived from morning brief, format like `Utorok 10.2 Main quest`.
  - MVP taxonomy: `C` (`habit + daily + todo + reward`).
  - Slash command set (MVP): `/log`, `/cvicenie`, `/kalendar`, `/jedlo`, `/busines`.
  - Queue behavior: slash command writes into queue JSON; Jarvis can process on user command or at 03:00 cron.
- Round 3 summary:
  - Product behavior is now clearly daily-operational with scheduled cleanup automation at 03:00.
  - Sessioning is explicitly human-readable and tied to morning brief context.
  - Command queue remains central integration surface for structured intent ingest.
  - One conflict remains: persistence authority (local-first preference in round 3 vs server-persistence direction from round 2).
- Proposed concrete decisions from this round:
  1. Add explicit `03:00 local` cleanup schedule requirement to runtime contract (same processing path for manual and cron trigger).
  2. Move from generic context labels to dynamic session title scheme: `<weekday> <date> <Main quest>`.
  3. Lock MVP task taxonomy to full Habitica set (`habit`, `daily`, `todo`, `reward`).
  4. Lock MVP slash command registry to five commands listed above, all persisted to queue JSON for deferred processing.
  5. Carry persistence decision as staged hybrid candidate (`local-first UX + server durability bridge`) until next round finalization.

### `2026-02-12` Interview Round 4 (Decisions Captured)
- User inputs:
  - Q1 Cron execution model: unresolved; user needs clearer explanation of options.
  - Q2 Source of truth: selected `B` (server-first), with explicit concern about not losing writing and understanding local files vs localStorage.
  - Q3 Queue payload schema: `B` (command-specific payload variants).
  - Q4 Session naming mutability: `B` (editable during the day).
  - Q5 03:00 processing scope: process all pending items; user also wants journal-heavy workflow and possible metadata extraction before token-heavy Jarvis processing.
- Round 4 summary:
  - Direction is now server-first persistence with strong durability expectations for daily writing.
  - Command model should support command-specific payloads while staying in queue JSON flow.
  - Daily session titles remain user-editable after morning brief.
  - 03:00 processing should include all pending queue items by default.
  - Metadata extraction pipeline is desired but user is unsure about introducing RAG complexity in MVP.
- Proposed concrete decisions from this round:
  1. Adopt server-first persistence semantics for journal/workquest writes: UI submits to backend immediately; backend persists to workspace files/database boundary; localStorage remains cache/compat layer.
  2. Keep queue file-first while allowing command-specific payload structures under each command entry.
  3. Allow same-day session title edits with history-safe update policy.
  4. Keep 03:00 cron scope as "process all pending" unless explicit command policy disables a command.
  5. Defer full RAG/vector pipeline; allow lightweight metadata extraction scripts in Phase 2 first.

### `2026-02-12` Interview Round 5 (Decisions Captured)
- User inputs:
  - Cron model preference: "asi web proces" (choose web process for now).
  - Clarification request: whether server-first means data is written to GitHub.
- Round 5 summary:
  - Cron execution model is now set to web process for MVP/near-term.
  - Persistence model clarified: server-first means writes go to backend persistence (workspace files or DB), not GitHub by default.
- Proposed concrete decisions from this round:
  1. Set 03:00 cleanup cron to run in web process in current phase.
  2. Keep server-first runtime persistence boundary in backend storage.
  3. Treat GitHub sync as optional backup/export concern, not runtime source of truth.

### `2026-02-12` Interview Round 6 (Decisions Captured)
- User inputs:
  - Metadata preprocessing: considering LlamaIndex and questioning whether it should already be part of MVP.
  - Journal/prompt storage: `A` (append-only JSON/JSONL).
  - Session title history: `A` (latest-only, no rename history).
  - 03:00 execution policy: `A` (process all pending).
  - Thread behavior: daily thread generation plus command-driven flows (`/log`, `/cvicenie`, `/kalendar`, `/jedlo`, `/busines`) with global command concept across channels (app + Telegram intent).
  - Product analytics requirement: right-sidebar operational writing analytics (recent prompt history, prompts-vs-words time graph, heatmap, last prompt words, rolling totals and averages for 24h/7d/30d, comparative benchmark metrics).
  - Processing pipeline idea: append raw logs with metadata -> optional preprocessing (LlamaIndex/scripts) -> Jarvis processing at cron to reduce token-heavy direct reads.
- Round 6 summary:
  - Writing/journaling is now core product behavior, not side feature.
  - Queue-first architecture remains valid and is expanded into command-global workflow.
  - User wants all pending command items processed at 03:00.
  - LlamaIndex in MVP is still undecided and depends on complexity tolerance.
- Proposed concrete decisions from this round:
  1. Lock append-only event storage for journaling/prompt logs in MVP (`JSONL` first).
  2. Keep session-title policy latest-only (no historical rename timeline in MVP).
  3. Keep 03:00 policy as process-all-pending by default.
  4. Add writing-analytics dashboard scope to MVP requirements (right sidebar + rolling metrics + heatmap pipeline from event logs).
  5. Treat LlamaIndex as a gated MVP+ decision: only enable in MVP if minimal, scriptable ingestion is proven lightweight in repo.

### `2026-02-12` Interview Round 7 (Decisions Captured)
- User inputs:
  - LlamaIndex in MVP: `A` (include now).
  - Thread topology: one thread per command category (`business`, `jedlo`, `karol`, `cvicenie`, `daily runtime`) with user writing directly into those threads.
  - Command parity requirement: existing Jarvis `/log` and `/calendar` behavior should be mirrored in ChatUI threads; same command intent should land in same persistence location regardless of channel.
  - Journal/event layout: `B` (per-day JSONL partitioning).
  - 03:00 processing strategy: `B` (batch processing with continuation until queue is exhausted).
- Validation notes (repo-grounded):
  - Slash commands are already parsed server-side and enqueued to `jarvis-workspace/data/system/capture/commands.json` (`alfred/server-fixed.js`).
  - Session authority is backend-owned via `resolveJarvisSessionKey(...)` (`alfred/server-fixed.js`).
  - Current cron is interval-based (`JARVIS_INBOX_CRON_MS`, default 3h), not wall-clock-fixed `03:00`, so scheduler alignment is still an implementation gap.
  - Current ChatUI sends `threadId` only to `/api/jarvis/chat` and it is currently fixed to `agentMode=general-assistant`; capture writes are not yet command-thread scoped.
  - Existing Jarvis task model is file-based in `.openclaw/workspace/data/system/tasks/active.json`, which is already read by Singularity status aggregation.
  - `/log` and `/calendar` are already documented in Jarvis ops docs and calendar parser tooling (`.openclaw/workspace/data/docs/SKILL.md`, `.openclaw/workspace/scripts/calendar/quick-cal.py`).
- Round 7 summary:
  - Command-centric threads are now the primary interaction model.
  - Cross-channel command parity is now explicit product behavior, not optional integration.
  - LlamaIndex has moved from "maybe later" to MVP scope, but must stay bounded and script-first.
  - 03:00 processing must be resilient for large daily volume, not single-shot.
- Proposed concrete decisions from this round:
  1. Lock "global command namespace" contract: `/log`, `/calendar`, `/cvicenie`, `/jedlo`, `/business`, `/karol` resolve to canonical command IDs before enqueue.
  2. Lock thread model as `one persistent thread per command category`, with daily entries appended under that thread.
  3. Lock cross-channel parity rule: ChatUI, Telegram, and Jarvis direct command inputs must write into the same command queue and event schema.
  4. Lock MVP LlamaIndex scope to nightly metadata extraction pipeline only (no vector retrieval requirement in MVP UI/chat path).
  5. Lock 03:00 processor to batch mode with cursor/checkpoint semantics (continue processing next batch until pending queue reaches zero or run budget limit).
  6. Lock journal persistence to per-day JSONL files with compatibility bridge for existing `chatui-events.jsonl` readers during migration.

### `2026-02-12` Interview Round 8 (Decisions Captured)
- User inputs:
  - Task/thread access policy: hybrid by Jarvis toggle. Jarvis OFF -> read-only behavior for Jarvis thread/task interaction. Jarvis ON -> full Jarvis access from app.
  - Command alias policy: `B` (normalize known aliases and map to canonical commands).
  - Batch guard policy: `A` (count-based batch limit).
  - LlamaIndex scope: `A` (metadata extraction only in MVP).
  - Daily thread gate: `B` (mandatory morning-brief popup before first daily write).
  - Morning brief flow detail: on first daily interaction, popup captures daily topic/title + content; this creates that day's daily thread; Jarvis morning-brief workflow publishes system-status report into dashboard.
  - Daily behavior requirements: left sidebar threads per category (`jedlo`, `karol`, `cvicenie`, `business`, `daily`) and daily journaling with right-sidebar writing metrics.
- Round 8 summary:
  - Access model is now explicitly gated: safe read-only default, action mode only when Jarvis is armed.
  - Command input tolerance is improved by canonical alias normalization.
  - Night processing complexity is bounded by count-based batching.
  - LlamaIndex MVP is now constrained to offline metadata extraction only.
  - Morning brief is a hard daily entry gate and becomes thread title authority.
- Proposed concrete decisions from this round:
  1. Lock access matrix: `Jarvis OFF` = read-only task/thread actions; `Jarvis ON` = mutating command actions enabled via same queue pipeline.
  2. Lock canonical command mapper with alias support (e.g. `/kalendar -> /calendar`, `/busines -> /business`) before enqueue.
  3. Lock nightly processor limiter to count-based batching with continuation loops until queue is drained or run budget stops.
  4. Lock LlamaIndex MVP feature set to metadata extractors only (`no embeddings`, `no retrieval`, `no RAG query path`).
  5. Lock morning-brief-first UX: block first daily write until popup is completed, then create daily thread using user-provided topic/title.
  6. Lock dashboard requirement for morning-brief status output as first-class daily system summary.

### `2026-02-12` Interview Round 9 (Decisions Captured)
- User inputs:
  - Runtime behavior clarification: the daily writing thread is `runtime` (named from morning brief). Toggle OFF means pure journaling/capture. Toggle ON means Jarvis is loaded and replies to next message in that runtime thread.
  - Efficiency concern: loading full runtime history is too expensive; user expects efficient context handling (preprocessing while toggle is OFF).
  - Nightly batch config: `B` from options (`250 items per batch`, `2 retries`).
  - Morning-brief popup schema (explicit): `topic`, `tag`, `estimatedDifficulty (1-100)`, `currentEnergy (1-100)`, `dailyPromise`, `content`.
  - Dashboard rendering choice: `A` (dedicated Morning Brief card).
  - Clarification request: user asked what "event log" means.
- Clarification added:
  - `Event log` in this project = append-only technical journal of captures/commands/chat events (timestamps + metadata) used for analytics, replay/debugging, and preprocessing. It is not the same as user-facing prose journal text.
- Round 9 summary:
  - Runtime thread behavior and toggle semantics are now explicit and actionable.
  - Performance requirement is now clear: Jarvis ON should use compact context, not raw full-thread replay.
  - Batch processing is now numerically constrained (`250`, `retry 2`).
  - Morning brief schema is now defined enough to implement UI validation and daily XP framing.
- Proposed concrete decisions from this round:
  1. Lock `runtime` as the canonical daily free-writing thread created by morning brief title/topic.
  2. Lock toggle semantics in runtime thread: OFF -> write-only capture path; ON -> Jarvis response path on next message.
  3. Lock incremental preprocessing strategy: every OFF submission triggers async metadata extraction + rolling runtime summary update to support fast ON-context assembly.
  4. Lock nightly batch defaults to `batchSize=250`, `retryLimit=2`.
  5. Lock Morning Brief popup fields and slider ranges exactly as provided (`1-100` for both difficulty and energy).
  6. Lock dashboard Morning Brief as dedicated card widget.

### `2026-02-12` Interview Round 10 (Decisions Captured)
- User inputs:
  - Context pack strategy: `A` (`rolling summary + latest 6 messages + command/thread state snapshot`).
  - Jarvis ON behavior clarification: selected `B` but semantically refined to "persistent conversation mode" in runtime thread (stays ON until manually toggled OFF), with compact context on each ON reply.
  - Nightly failure policy: `B` (fixed retry interval, then skip item).
  - Event retention: `A` (keep raw for 90 days, then compressed archive).
  - Task sync boundary: unresolved (`user requested clarification`).
- Round 10 summary:
  - ON-context assembly is now concretely bounded for token efficiency.
  - Jarvis ON is confirmed as stateful chat mode, not one-shot trigger.
  - Retry behavior is selected but dead-letter/escalation policy is still open.
  - Retention baseline is selected (`90d raw + archive`) and ready for implementation.
  - Task extraction/write policy from runtime text remains the last major behavioral open point.
- Proposed concrete decisions from this round:
  1. Lock ON context pack to `rolling summary + latest 6 runtime messages + command state snapshot`.
  2. Lock runtime toggle to persistent ON session mode until user turns it OFF.
  3. Lock nightly retry policy to fixed interval with skip-after-limit behavior (with explicit skip reason logging).
  4. Lock retention baseline to `raw 90 days` + compressed historical archive.
  5. Carry task sync policy as explicit open decision for next round with simplified user framing.

### `2026-02-12` Interview Round 11 (Decisions Captured)
- User inputs:
  - Task sync policy: `1.A` (`runtime` free text does not auto-create or mutate tasks).
  - Clarification: user explicitly does not want to edit tasks from `daily/runtime`; task add/edit should happen in dedicated `task` thread.
  - Retry interval: `3.A` (fixed retry interval of 5 minutes).
- Round 11 summary:
  - Task boundaries are now explicit and low-risk: runtime is for journaling/reasoning, task thread is for task mutations.
  - Night retry cadence is concretely defined at 5-minute intervals.
  - Remaining open area is confirmation/safety behavior for risky mutating commands and post-retry recovery handling.
- Proposed concrete decisions from this round:
  1. Lock `runtime` thread as non-mutating for task state (no implicit task extraction to active task store).
  2. Lock task lifecycle mutations (`create/update/complete`) to dedicated `task` thread command flow.
  3. Lock nightly retry cadence to fixed 5-minute interval between attempts.
  4. Keep high-risk command confirmation policy as explicit follow-up decision.

### `2026-02-12` Interview Round 12 (Decisions Captured)
- User inputs:
  - Risky command confirmation: `1.C` (no extra confirmation prompt; when in Jarvis mode it should behave directly like Jarvis).
  - UX expectation: show clear liveness/response indicator while Jarvis is processing; deep collapsible tool trace is desirable but can be MVP+.
  - Retry outcome policy: `2.A` (dead-letter queue + UI notification after retry exhaustion).
  - Task thread behavior refinement: user prefers thread-context-driven behavior; task thread messages append into task system data with timestamp context.
  - Architecture pivot proposal: remove in-app Jarvis chat/toggle dependency from ChatUI MVP; ChatUI acts as capture/dashboard surface writing append-only records, while active Jarvis interaction happens in Telegram/terminal over the shared workspace.
  - Scheduler answer: `4.C` (24h interval) while also acknowledging previous 03:00-oriented workflows.
  - Product intent reinforcement: keep focus on Habitica-inspired gamified task management + Jarvis-backed dashboard views; include category threads, daily runtime with morning brief, and calendar note/event UX.
- Round 12 summary:
  - Safety mode is now operator-trust-first (no confirm prompts), with emphasis on visibility rather than friction.
  - Failure handling is strengthened via dead-letter + notification.
  - Major scope pivot is introduced: ChatUI as capture/dashboard layer, Jarvis conversational runtime externalized (Telegram/terminal).
  - Task write shape remains partly open between free-append semantics and structured/form-based Habitica-style task entries.
  - Scheduler requirement is conflicting (`03:00` legacy vs `24h interval` selection) and must be reconciled before implementation plan lock.
- Proposed concrete decisions from this round:
  1. Lock no-confirm interaction policy for task-thread mutating actions in MVP.
  2. Lock MVP Jarvis feedback UX to lightweight liveness/status indicator; defer full collapsible tool-trace UI to MVP+.
  3. Lock dead-letter queue + UI notification as retry-exhaustion outcome.
  4. Adopt architecture pivot candidate: ChatUI captures/appends to shared workspace; Jarvis interactive agent remains primary in Telegram/terminal channels.
  5. Carry explicit conflict marker for scheduler requirement and resolve in next round before Plan freeze.
  6. Carry task-input contract (free append vs structured form) as final core product-shape decision, with Habitica-inspired form as strong candidate for task quality.

### `2026-02-12` Interview Round 13 (Decisions Captured)
- User inputs:
  - Scheduler finalization: `1.A` (fixed `03:00 local` run).
  - Task model finalization: full task management should be Habitica-inspired with structured task cards/tickets (not free-form append contract as primary model).
  - Jarvis observability in UI: baseline should be `indicator + basic steps` (show that Jarvis is active/processing; deep trace can stay out of MVP).
  - Product focus reinforcement: stop scope drift and center MVP on gamified task management powered by Habitica mechanics + Jarvis-backed dashboard data.
  - UX direction additions: category threads + daily runtime remain; exercise/tasks can surface as dedicated cards; mini-calendar can evolve toward Google Calendar event creation popup flow.
- Round 13 summary:
  - Three remaining architecture conflicts are now resolved: scheduler, task input model, and observability baseline.
  - Discovery can now shift from "interaction contract debate" to concrete XP/task mechanics design.
  - Calendar integration is now an explicit scope question, not an implicit side note.
- Proposed concrete decisions from this round:
  1. Lock scheduler to fixed wall-clock execution at `03:00 local`.
  2. Lock task UX contract to Habitica-style structured task cards/tickets as first-class task management model.
  3. Lock MVP observability to status indicator + basic processing steps (no full tool trace in MVP).
  4. Continue with ChatUI as capture/dashboard surface while Jarvis conversational runtime remains primary in Telegram/terminal.
  5. Move next interview rounds to XP balance and gamification rules.

### `2026-02-12` Interview Round 14 (Context-First Reset + EEU Economy Lock)
- User inputs:
  - Process correction: interview should not continue with isolated ABCD questions before shared context; user requested explicit walkthrough of Habitica mechanics, current Jarvis implementation reality, and full Next migration frame first.
  - Economy model preference: internal "crypto-style" performance unit without adding blockchain/framework layer.
  - Reward economy scope: selected `XP/EEU + coins + simple shop` for MVP.
  - Slider mapping: selected damped/logarithmic conversion (`1-1000` input, non-linear output).
  - Claiming model: selected progress-claim behavior (reward only delta progress).
  - Anchor model: selected time anchor (`100 EEU = 60 minutes deep focus`).
  - Conversion model: selected shared conversion curve for XP and coins.
  - Anti-inflation: selected combo guard (diminishing + daily cap + flags).
  - Cap profile: selected balanced profile (`softStart=1200`, `hardCap=2500`).
- Round 14 summary:
  - Discovery interview protocol is now explicitly context-first to prevent decision drift.
  - EEU economy direction is now concrete and implementation-ready for MVP.
  - Reward/shop system is approved as bounded MVP scope without on-chain integration complexity.
- Proposed concrete decisions from this round:
  1. Lock interview format to contextualized prompts (`Habitica baseline` + `Jarvis reality` + `implementation impact`).
  2. Lock economy model to internal off-chain EEU ledger.
  3. Lock task ticket input to `plannedEEU (1-1000)` + `progressPct (0-100)` with delta-only claims.
  4. Lock conversion to shared damped curve producing both XP and coins.
  5. Lock anti-inflation defaults to `softStart=1200`, `hardCap=2500`, plus audit flags.
  6. Lock shop MVP to fixed 3-tier catalog (`Micro 40`, `Standard 120`, `Major 300` coins).

## Decision Log
- `2026-02-12`: Extend chatui/ instead of creating new project -> reuses all existing code (1390 lines of business logic, 766 lines of CSS, working API integration), avoids duplication, maintains monorepo build pipeline -> zero migration cost for existing features
- `2026-02-12`: Use React Context + hooks instead of Redux/Zustand -> current state complexity (3 domains: status, game, capture) fits Context pattern well, avoids adding state management dependency, consistent with existing hooks-based architecture -> simpler mental model
- `2026-02-12`: Keep recharts (used in legacy) instead of alternatives -> already proven in the codebase, lightweight, React-native, sufficient for XP bars and vitality charts -> consistency with legacy precedent
- `2026-02-12`: Jarvis architecture documented as runtime-first boundary -> backend orchestrates capture/queue/chat/sessioning while UI remains replaceable -> enables Next migration without changing core runtime contracts
- `2026-02-12`: Next.js selected as target platform direction -> unified fullstack boundary and cleaner long-term product architecture -> plan migration by preserving existing runtime contracts during transition
- `2026-02-12`: Habitica adopted as mechanics reference, not application skeleton -> extract scoring/quest/cron rules only and implement in Jarvis domain modules -> avoids importing legacy multi-user SaaS complexity
- `2026-02-12`: Interview round 2 selected contextual multi-session model -> better separation between capture/chat/review flows while preserving backend session authority -> aligns with Next migration and Jarvis runtime model
- `2026-02-12`: Interview round 2 selected queue file-first strategy (`commands.json`) -> keeps current runtime stable and low-risk -> no queue contract rewrite in MVP
- `2026-02-12`: Interview round 2 selected server persistence direction for WorkQuest -> enables cross-device continuity and central game-state authority -> requires localStorage compatibility bridge for `alfred_workquest_v1`
- `2026-02-12`: Interview round 3 set hard requirement for daily 03:00 Jarvis cleanup inside Singularity -> operational consistency with current Jarvis routine -> cron behavior becomes product contract
- `2026-02-12`: Interview round 3 refined multi-session naming to morning-brief-driven daily titles -> improves contextual continuity for journal and main quest tracking -> requires deterministic session naming helper
- `2026-02-12`: Interview round 3 locked MVP slash-command set (`/log`, `/cvicenie`, `/kalendar`, `/jedlo`, `/busines`) with queue-json ingest -> keeps command routing explicit and automation-friendly -> no endpoint expansion required
- `2026-02-12`: Interview round 4 selected server-first persistence intent for daily writing/workquest -> prevents perceived data-loss risk and aligns with daily-driver goal -> localStorage becomes compatibility/cache layer
- `2026-02-12`: Interview round 4 selected command-specific slash payload variants -> preserves flexibility for `/cvicenie`, `/kalendar`, `/jedlo`, `/busines` semantics -> requires validation guards per command
- `2026-02-12`: Interview round 4 selected editable daily session titles and full pending processing at 03:00 -> supports iterative planning flow and complete nightly processing -> requires safe rename + processing guardrails
- `2026-02-12`: Interview round 5 selected web-process cron execution for 03:00 cleanup -> fastest, simplest deployment path for current phase -> revisit worker split when metadata pipeline load increases
- `2026-02-12`: Interview round 5 clarified server-first persistence semantics -> data writes go to backend storage layer (not GitHub) and localStorage remains client cache/compat -> avoids source-of-truth confusion
- `2026-02-12`: Interview round 6 confirmed append-only journal/event persistence as core daily-driver requirement -> preserves high-volume writing without loss -> aligns with server-first + queue-first architecture
- `2026-02-12`: Interview round 6 confirmed process-all-pending policy for 03:00 cron -> ensures no queued intent is skipped overnight -> requires guardrails for heavy processing load
- `2026-02-12`: Interview round 6 introduced explicit writing analytics scope (history, words/prompts graph, heatmap, rolling totals/averages) -> turns capture telemetry into first-class UX module -> requires event schema stability
- `2026-02-12`: Interview round 7 locked command-centric thread topology with cross-channel command parity -> unifies ChatUI/Telegram/Jarvis runtime behavior around one queue contract -> prevents fragmented capture semantics
- `2026-02-12`: Interview round 7 promoted LlamaIndex preprocessing into bounded MVP scope -> supports nightly metadata extraction before token-heavy Jarvis reasoning -> keeps MVP implementable by limiting to offline batch pipeline
- `2026-02-12`: Interview round 7 selected per-day JSONL + batch-at-03:00 processing strategy -> scales high-volume journaling and avoids single-run overload -> requires checkpointed processing semantics
- `2026-02-12`: Interview round 8 selected toggle-gated hybrid access model (`OFF=read-only`, `ON=mutating`) -> preserves safety by default while enabling full Jarvis control when explicitly armed -> aligns with existing Jarvis toggle mental model
- `2026-02-12`: Interview round 8 selected alias normalization + count-based nightly batching -> reduces command friction and keeps processing bounded under high daily volume -> requires canonical command map + batch counter instrumentation
- `2026-02-12`: Interview round 8 selected mandatory morning-brief popup gate for daily thread creation -> enforces daily planning ritual and consistent thread naming -> requires first-write guard in UI and brief status surface on dashboard
- `2026-02-12`: Interview round 9 locked runtime-thread toggle semantics (`OFF capture`, `ON Jarvis reply`) -> matches user daily writing workflow while preserving controlled assistant activation -> requires runtime-specific intent router rules
- `2026-02-12`: Interview round 9 selected incremental preprocessing for ON-context efficiency -> avoids full-thread replay latency/cost by maintaining compact summaries and metadata -> requires async extractor pipeline after each OFF write
- `2026-02-12`: Interview round 9 locked Morning Brief schema and widget shape + nightly batch defaults (`250`, retry `2`) -> provides implementable UI contract and processing limits -> requires validation rules and batch failure policy
- `2026-02-12`: Interview round 10 locked compact ON context pack (`summary + latest 6 + command snapshot`) and persistent ON conversation mode -> keeps Jarvis responsive while controlling token cost -> requires deterministic context assembler per runtime thread
- `2026-02-12`: Interview round 10 selected fixed-interval retry with skip and 90-day raw retention + archive -> provides operationally bounded ingestion and storage policy -> requires skip logging and archive compaction job
- `2026-02-12`: Interview round 11 locked thread responsibility split (`runtime` journaling, `task` mutations) -> prevents accidental task churn from exploratory writing -> requires explicit task command contract in task thread
- `2026-02-12`: Interview round 11 locked 5-minute retry interval -> makes failure handling deterministic and observable -> requires retry scheduler configuration + metrics on skip outcomes
- `2026-02-12`: Interview round 12 selected trust-first task-thread interaction (no confirm prompts) + dead-letter-with-notification recovery -> optimizes flow speed while keeping failure visibility -> requires robust DLQ surfacing in dashboard
- `2026-02-12`: Interview round 12 introduced ChatUI/Jarvis boundary pivot (capture surface vs external conversational runtime) -> reduces in-app agent complexity and aligns with Telegram/terminal usage -> requires migration of toggle/chat assumptions out of MVP UI scope
- `2026-02-12`: Interview round 13 finalized scheduler to fixed `03:00 local` execution -> reconciles prior interval conflict and aligns with existing operational ritual -> requires wall-clock scheduler implementation instead of pure elapsed interval.
- `2026-02-12`: Interview round 13 finalized task-management UX as Habitica-style structured cards/tickets -> keeps game loop quality and avoids noisy free-form task ingestion -> requires explicit task schema/forms and scoring hooks.
- `2026-02-12`: Interview round 13 finalized MVP Jarvis observability baseline (`indicator + basic steps`) -> gives operator confidence without heavy trace UI complexity -> requires lightweight processing-state stream in dashboard.
- `2026-02-12`: Interview round 14 locked context-first interview protocol -> decisions must be grounded in shared mechanics and current implementation to avoid low-context guessing -> requires contextual prompt template in next rounds.
- `2026-02-12`: Interview round 14 locked internal EEU economy with damped conversion, delta-progress claims, and 3-tier shop -> enables crypto-style performance economy without blockchain complexity -> requires additive `/api/capture` and `/api/status` payload extensions plus local ledger/event storage.

### `2026-02-12` NextUI Round 1: Scope Lock
- User inputs:
  - Primary MVP Goal: `A` (Journaling-first / Perfect Capture).
- Round summary:
  - The focus for the NextUI baseline is on building a high-frequency, reliable, and interactive capture experience before expanding to other dashboard metrics.

### `2026-02-12` NextUI Round 2: Capture Mechanics Lock
- User inputs:
  - Architecture: Bottom-anchored context window.
  - Controls: Explicit category buttons below input (`capture`, `log`, `daily`, `tasks`).
  - Feedback: Dynamic frame color change based on selected category.
  - Persistence: Category selection maps to specific storage locations (JSON folders/files).
- Round summary:
  - Transition from automatic morphing to explicit user-driven categorization via button bar for high intent clarity.

### `2026-02-12` NextUI Round 3: UX Interaction Lock
- User inputs:
  - Shortcuts: `Cmd + [First Letter]` with underlined labels.
  - Navigation: `Tab` cycling.
  - Automation: Slash command auto-switch based on prefix.
  - Visual: Dynamic border/shadow color sync.

### `2026-02-12` NextUI Round 4: Post-Submission & State Feedback
- User inputs:
  - Feedback: History Feed (above) + Liveness Stream (below).

### `2026-02-12` NextUI Round 5: Error Handling
- User inputs:
  - Error Handling: `C` (Toast & Shake).
- Round summary:
  - The input bar shakes on error, showing a red toast, while preserving text in the input for manual retry.

### `2026-02-12` NextUI Round 3: UX Behavior Lock
- User inputs:
  - Shortcuts: `Cmd + [First Letter]` (e.g., `Cmd+L` for Log).
  - Visual Cue: Underlined first letter in category labels.
  - Navigation: `Tab` key cycles through categories.
  - Automation: Slash commands (e.g., `/task`) trigger category auto-switch.
  - Feedback: Dynamic frame border or shadow color change on interaction.
- Round summary:
  - The interaction model is designed for high-speed, no-mouse operations while providing clear, color-coded visual feedback.
- Locked decisions:
  - `BottomCaptureBar` will implement keyboard listeners for `Cmd+Key` and `Tab`.
  - CSS implementation of underlined shortcuts in labels.
  - `activeCategory` state transition triggered by slash prefix detection in the main input.
