# Discovery

## Purpose
Single source of truth for product intent, scope, architecture, integrations, UX direction, and delivery constraints.

## Status
- State: `in_progress`
- Owner: `Main Agent (Codex)`
- Last Updated: `2026-02-14`

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

### `2026-02-13` Interview Round 15 (Ultimate Schema v1: Morning Brief + Tags + Global KPI Header)
- User inputs:
  - Morning Brief gating: mandatory by default; `/chat` unlock requires brief completion or explicit skip with required reason (one-line prompt shown after pressing Skip).
  - Morning Brief fields:
    - required `title`,
    - required `tag`,
    - `promise` (note attached to title) with max `500 words`,
    - `mood` slider `1-100`,
    - `dayDifficulty` slider `1-100`.
  - Tag behavior: `B` (pick from a fixed list + allow custom tag input).
  - Tag taxonomy updates:
    - rename `jedlo` -> `vitals`,
    - add `financie`, `uspechy`, `neuspechy`.
  - KPI header: `A` (sticky global KPI header on all routes).
- Round 15 summary:
  - Morning Brief is locked as a daily planning artifact that is visible on Dashboard and can segment the `/chat` feed via `tag`.
  - Global KPI header is part of the runtime shell, not route-local UI.
- Implementation impact:
  - Add strict Morning Brief validation (required fields + word cap) and persist skip reasons.
  - Establish a canonical tag list with optional freeform tags for edge cases.
  - Implement a sticky KPI header in the app shell across routes with responsive behavior.

### `2026-02-13` Interview Round 16 (Rapid ABCD Mode)
- User inputs:
  - KPI refresh policy: custom override (not A/B/C/D) => refresh every `60s`.
  - KPI feedback behavior: show delta diff on refresh for each KPI metric (example `+123` in green for increases).
  - Roadmap note: additional KPI metrics can be added later; keep current implementation extensible.
  - Interview choice format update: use numbered options `1/2/3/4` for rapid rounds.
  - Morning Brief `promise` word limit behavior: `A` (hard stop input at `500` words; cannot type beyond cap).
  - Morning Brief `tag` behavior: `B` (select from canonical list with optional custom tag entry).
  - Morning Brief skip persistence: store skipped entry in the same Morning Brief storage location (empty brief payload + required `skipReason`).
  - Morning Brief `title` validation: max `120` characters.
  - Morning Brief `title` minimum: no explicit minimum length beyond non-empty trimmed value.
  - Post-brief `/chat` opening state: `2` (today feed with sticky summary card at top).
  - Sticky summary behavior: always open (`1`), no collapse mode.
  - Sticky summary visible fields: `title`, `promise snippet`, `mood`, `expectedDifficulty`, `actualDifficulty` (custom override).
  - `actualDifficulty` policy (custom override):
    - computed automatically at day-close from collected daily materials/events,
    - still computed when `expectedDifficulty` is missing (including skipped brief days),
    - skipping Morning Brief applies explicit damage/penalty.
  - Skip penalty profile: `1` (fixed small penalty; no percentage component).
  - Skip penalty amount: `2` => `-10 XP` per skipped Morning Brief.
  - Skip penalty UX visibility: `2` (instant toast on skip + repeated in day-close summary).
  - KPI diff color semantics: `1` (`+` green, `-` red, `0` neutral).
  - KPI diff baseline: `1` (compare against previous 60s refresh snapshot).
  - KPI diff reset behavior: `1` (no reset on route change; continuous between poll snapshots).
  - `/tasks` inbox preview ordering (Q18): custom `1 + 4` => default sort by recency with optional manual reorder controls.
  - One-click promote default target status (Q19): `1` => `Todo`.
  - One-click promote default priority (Q20): `1` => `Medium`.
  - Slash-command lifecycle timeline (custom override for Q21): `Accepted -> Plan -> Execution -> Measurement -> Done`.
  - Command failure visibility (Q22): `1` => show error only on the specific command block in feed.
  - Failed command recovery (Q23): `4` => auto-retry without explicit user action.
  - Auto-retry limit (Q24): `4` => no retry cap (continuous retry until success/terminal external stop).
  - Conflict note: this Q24 decision overrides earlier capped-retry assumptions for command execution flow in this interview track.
  - Auto-retry interval (Q25): `1` => fixed `30s` between retry attempts.
  - Retry cap correction (Q26 custom override): hard limit `20` attempts per failed command.
  - Conflict note update: this Q26 decision supersedes Q24 unlimited-retry assumption.
  - Post-cap failure handling (Q27): `1` => mark `failed-final` and expose manual retry action only.
  - BottomCaptureBar mode memory (Q28 corrected): `2` => reset to `Capture` each morning after Morning Brief completion.
  - 03:00 day-sealed archive visibility (Q29): `1` => render only in `/chat` feed.
  - V1 sign-off acceptance scope (Q30 custom override): implement all acceptance flows (`Morning Brief`, `Command lifecycle`, `Task board/promote`, `KPI refresh+diff`) with no down-selection.
- Round 16 summary:
  - KPI update cadence is intentionally slower (`60s`) to reduce noise, with explicit visual delta to preserve perceived liveness.
  - Morning Brief text cap is strict at input-time for predictability.
  - Tag model remains controlled but flexible via custom fallback.
  - Skip flow is treated as first-class Morning Brief record state, not a separate transient UI event.
  - Title input is concise by design with a strict max-length cap.
  - Title validation is permissive on minimum length to keep morning flow fast.
  - Post-brief chat entry prioritizes daily context with persistent summary visibility.
  - Summary visibility is mandatory to preserve daily orientation.
  - Daily summary must show both planned and realized difficulty signals.
  - Actual difficulty is system-derived at closure-time, not manually entered.
  - Brief skip remains allowed but has gameplay cost.
  - Skip penalty model is simple and deterministic (flat small deduction).
  - Current tuned skip penalty is `-10 XP`.
  - Penalty feedback must be immediate and end-of-day auditable.
  - KPI deltas require explicit positive/negative/neutral visual semantics.
  - KPI diffs represent short-interval movement, not full-day cumulative change.
  - Route navigation does not alter KPI diff continuity.
  - Inbox preview stays fast by default (recency) while allowing operator override when needed.
  - Promote flow aligns with MVP 3-status board by entering at `Todo`.
  - Promote flow uses a stable default priority for quick conversion from inbox.
  - Command lifecycle should expose reasoning/execution checkpoints, not only queue status.
  - Failure context should stay local to the failed command artifact.
  - Retry strategy is automation-first, not manual interaction-first.
  - Command retry behavior is bounded with a clear max-attempt guard.
  - Retry cadence is aggressive and predictable with short fixed delay.
  - Terminal failure state should remain operator-controllable with explicit manual restart.
  - Capture-bar mode should be normalized daily after brief ritual.
  - Day-sealed archive is treated as timeline artifact primarily for chat/runtime context.
  - V1 completion is defined by full-scope behavior delivery, not partial acceptance subset.
- Implementation impact:
  - Add periodic status refresh timer (`60s`) in global KPI data source.
  - Store previous KPI snapshot to compute per-metric delta and render signed diff styling.
  - Enforce 500-word cap directly in Morning Brief input control with live word counter.
  - Provide canonical tag picker with optional freeform custom-tag field.
  - Persist skipped Morning Brief as `status=skipped` in the same data stream used by completed Morning Brief entries.
  - Enforce title `maxlength=120` with visible remaining-character counter.
  - Validate title as non-empty after trim, without additional minimum-length rule.
  - Render sticky daily summary card at top of today's runtime feed after successful brief completion.
  - Keep summary card permanently expanded in `/chat`.
  - Support dual difficulty fields in summary rendering (`expected` at brief time, `actual` as later update).
  - Add day-close scoring step that derives `actualDifficulty` from daily data before archive/close finalization.
  - Apply damage rule on skipped-brief days while keeping closure pipeline deterministic.
  - Implement skip damage as a fixed-value deduction and expose value for later tuning.
  - Use default skip penalty constant `10 XP` in scoring pipeline.
  - Emit skip-penalty toast event immediately and include same deduction in day-close recap payload.
  - Render KPI diff badges with tri-state color mapping (`positive`, `negative`, `neutral`).
  - Compute KPI delta from last poll snapshot stored in client state (`60s` cadence).
  - Keep KPI diff state in shared app-shell scope so route transitions do not reset it.
  - Implement inbox preview as recency-sorted list with user-driven reorder persistence.
  - Set promote action default status mapping to `Todo` and keep override optional.
  - Set promote action default priority mapping to `Medium`.
  - Map slash-command UI state machine to five visible stages: `Accepted`, `Plan`, `Execution`, `Measurement`, `Done`.
  - Attach command failure payload/rendering to the originating feed block without separate global alert dependency.
  - Implement automatic retry scheduling for failed command blocks with status updates reflected in the same feed artifact.
  - Enforce retry attempt counter with hard stop at `20` attempts.
  - Use fixed retry scheduler tick at `30s` for auto-retry loop.
  - After max retries, transition command status to `failed-final` and enable manual retry trigger.
  - Reset BottomCaptureBar active mode to `Capture` on daily brief completion boundary.
  - Emit/render day-sealed archive item in `/chat` feed without duplicating card on dashboard.
  - Keep all four acceptance flow tracks in implementation checklist and release gate.

### `2026-02-13` Interview Round 17 (Design Iteration v2: Pencil Capture Surface)
- User inputs:
  - Capture interaction model:
    - primary input should be a floating bottom capture bar,
    - quick-action buttons and keyboard shortcut affordances should be visible in this bar.
  - App tab structure for v2 focus:
    - `Dashboard`,
    - `Capture` (timeline/day log, primary writing surface),
    - `Tasks`.
  - Capture timeline semantics:
    - `Capture` tab acts as the daily log stream where user writes all runtime notes/events.
  - Floating capture bar category buttons:
    - `tasks`,
    - `business`,
    - `daily`,
    - `vitals`,
    - `expense`,
    - `win`,
    - `loss`.
  - Evening Brief requirement:
    - add Evening Brief with behavior similar to Morning Brief,
    - trigger window begins at `20:00 local`,
    - if user tries to write into capture after `20:00`, Evening Brief prompt should appear first.
  - Evening Brief policy decision: `1` => mandatory with skip allowed only with required reason (parity with Morning Brief skip model).
  - Evening popup behavior (consolidated):
    - after `20:00`, any write attempt in capture opens Evening Brief popup,
    - popup can be dismissed by outside click,
    - dismissal is temporary; popup re-opens on the next write attempt until Evening Brief is completed or skipped with reason.
  - Evening Brief content contract (custom override):
    - editable fields: `title`, `reflection/comment`,
    - `title` max length is `120` characters (parity with Morning Brief),
    - `reflection/comment` requires minimum `500` words,
    - `reflection/comment` has no upper word limit,
    - computed read-only fields: `actualDifficulty` (derived from tracked metrics), `expense` (derived from expense log),
    - computed fields are not user-editable in Evening Brief form.
  - Evening card requirement:
    - Evening Brief should generate a card analogous to Morning card,
    - card should summarize full-day tracked parameters plus user commentary.
  - Brief card placement override (v2 correction):
    - remove floating/pinned brief cards from timeline surfaces,
    - both `Morning Brief` and `Evening Brief` cards are rendered only on `Dashboard`.
  - Dashboard brief-card visibility policy (v2 correction):
    - show `Morning Brief` and `Evening Brief` cards together during the day,
    - day-cycle rotation boundary is fixed at `03:00 local` for the next daily brief set.
  - Dashboard activity log requirement (custom override):
    - add a dedicated `Notification Center / Activity Log` panel on Dashboard,
    - log all relevant system/runtime events as user-facing notifications,
    - activity log acts as canonical dashboard event stream (newest first),
    - default visible list size is last `7` events,
    - no `Show all` expansion in Dashboard v2 scope,
    - mandatory event scope: brief/gate, command lifecycle, penalties/refunds, task changes, system health, and periodic KPI diff updates.
  - Notification visual priority policy: `1` => color-code events by type (`XP`, `Task`, `System`, `Brief`).
  - Notification type-color map (fixed): `2` => `XP=blue`, `Task=green`, `System=red`, `Brief=amber`.
  - Notification timestamp format policy: `4` => conditional format (`relative` for items newer than `24h`, otherwise `absolute` date/time).
  - Notification row click behavior policy (custom override):
    - click opens contextual navigation to related feed/tab (`task`, `brief`, `capture`, or `system` target),
    - destination should open in its global/default feed view,
    - referenced entity/event should be visually highlighted in that feed (no hard filter lock).
  - Notification target highlight persistence policy: `3` => highlight remains active until user explicitly clears it.
  - Notification type -> destination mapping policy: `2`
    - `Task` -> `Tasks` tab,
    - `Brief` -> `Dashboard` brief section,
    - `XP` -> `Dashboard` activity section,
    - `System` -> `Dashboard` notification center.
  - Notification deep-link requirement (custom override):
    - routing must jump/scroll to the concrete message record(s) referenced by notification payload,
    - opening only the generic destination surface without anchoring to referenced message(s) is invalid behavior.
  - KPI diff notification trigger policy (custom override):
    - KPI diff events are tied to XP progression rather than pure time cadence,
    - emit notification on diff update only when XP gain reaches at least `+5 XP`,
    - aggregate XP gain into a single notification event (e.g., `+12 XP` stays one event),
    - notification payload should include XP source context (`words`, `task`, `milestone`, `expectedXP-goal`),
    - notification payload should include remaining progress toward daily `expectedXP` target.
  - 03:00 rollover policy for unfinished Evening Brief: `2` => carry over to next day and block Morning Brief until Evening Brief is resolved.
  - Morning-blocked entry UX when Evening carry-over is active: `3` => redirect user to `Capture` and immediately present Evening popup.
  - Carry-over brief sequence contract (custom override):
    - on first write intent of new day with carry-over, show Evening popup first,
    - after successful Evening submit, immediately show Morning popup in the same flow,
    - only after completing/skipping both required gates is normal capture writing unlocked.
  - Carry-over popup dismissal behavior:
    - outside-click may temporarily dismiss current popup,
    - next write attempt re-opens required pending popup (`Evening` first, then `Morning`).
  - Carry-over penalty contract (custom override):
    - unresolved carry-over state applies `damage = -10`,
    - skip in this carry-over gate flow applies `damage = -30`.
  - Carry-over penalty recovery policy: `1` => if both carry-over gates (`Evening` then `Morning`) are completed within the same day, the `-10` carry damage is refunded.
  - Floating bar visibility scope: `1` => visible across all primary tabs (`Dashboard`, `Capture`, `Tasks`).
  - Floating capture routing behavior (custom override):
    - default capture mode routes to `daily` stream (continuous mental/day-log writing),
    - clicking a category button changes capture mode visual state (including color),
    - after submit, the entry is persisted to the selected category destination.
  - Post-evening-submit capture behavior: `1` => floating capture bar unlocks immediately for normal writing flow.
  - Floating bar shortcuts (custom override):
    - fixed mappings based on underlined initial letter in each category label,
    - shortcut hints should be visibly underlined on the corresponding category trigger.
  - Capture timeline filtering contract (custom override):
    - top row contains category pills with prompt counts per feed,
    - include explicit `all` pill as default feed reset,
    - timeline area below pills shows chronologically ordered records with category color coding,
    - clicking capture mode (from floating bar) while on timeline switches active timeline feed to that category,
    - clicking category pill switches timeline feed to the selected category.
  - Capture layout extension:
    - `Capture` route includes right sidebar with writing/usage metrics (word counts and related stats).
  - Capture right-sidebar metrics contract (custom override, ordered top -> bottom):
    - live compose counter while typing (`characters`),
    - words written today,
    - prompts sent today,
    - words written in last 24h,
    - cumulative words vs remaining to daily goal `2500` (XP derivation baseline),
    - 6-hour activity chart:
      - x-axis = last 6 hours (hour buckets),
      - y-axis = counts,
      - per hour show paired bars (`words`, `prompts`),
      - newest data fills left-to-right as each hour progresses,
    - global prompt timeline:
      - ordered newest -> oldest,
      - each item rendered with node/dot + vertical connector line,
      - label shows first 5 words + timestamp.
  - 6-hour chart window policy: `1` => fixed rolling window of last 6 closed hours.
  - Metrics scope policy:
    - sidebar metrics are global/day-oriented by default,
    - category pill changes switch feed content, not the global metrics baseline.
  - Morning Brief XP contract extension (custom override):
    - Morning Brief includes `expectedXP`/expected output requirement used as multiplier eligibility gate,
    - `expectedXP` range is locked to `0-1000`,
    - `expectedXP` input control is slider (`0-1000`),
    - multiplier is awarded for meeting day parameters defined in Morning Brief and baseline XP system,
    - baseline XP parameter model remains an explicit follow-up definition item.
- Round 17 summary:
  - Capture is now explicitly a persistent, floating command surface and not a route-local static form.
  - The `Capture` route is the main daily narrative/timeline feed.
  - Evening ritual is now a first-class UX gate similar to Morning Brief.
  - Evening gate follows the same strictness and auditability rules as morning flow.
  - Evening gate interception is persistent after cutoff and outside-click dismissal is temporary until resolved.
  - Evening Brief shifts from planning to automated end-of-day assessment with user reflection.
  - Evening reflection is long-form by requirement (minimum 500 words).
  - Reflection capture is intentionally unbounded for deep end-of-day journaling.
  - Evening title stays concise with Morning-parity max length.
  - Brief cards become dashboard-only artifacts rather than timeline-pinned elements.
  - Dashboard brief section uses concurrent Morning+Evening visibility with a `03:00` day-rotation boundary.
  - Dashboard becomes both control surface and system-observability surface through centralized notifications.
  - Dashboard notification surface is compact by default (7 most recent items).
  - Notification center remains intentionally non-expandable on Dashboard.
  - Notification stream is full-scope and includes KPI header diff events.
  - KPI-diff notifications are value-significant (`+5 XP`) instead of noise-heavy periodic logging.
  - XP notifications should be source-aware and goal-progress-aware for decision usefulness.
  - Event scanning speed relies on stable type-color mapping.
  - Type-color legend is fixed for consistent recognition across sessions.
  - Notification time parsing should favor quick recency scan for fresh items and explicit date/time clarity for older items.
  - Notification list acts as actionable routing surface to the originating domain with in-feed contextual highlight, not read-only history.
  - Notification-driven context highlight should be durable until explicit user dismissal.
  - Notification routing is meaningful only when it resolves to concrete referenced records, not just a destination tab.
  - Cross-day continuity favors unresolved-evening-first gating over silent closure.
  - Carry-over resolution starts in Capture flow, not on passive dashboard view.
  - Carry-over operates as a strict sequential gate: Evening before Morning.
  - Carry-over penalties are stronger for explicit skip than for carry state itself.
  - Carry penalty becomes recoverable through same-day compliance.
  - Capture entry point remains spatially consistent across routes.
  - Capture affordance is intentionally omnipresent for low-friction logging.
  - Category selection in floating bar acts as explicit routing intent before submit.
  - Shortcut memorability is tied to visible first-letter mnemonic cues.
  - Timeline navigation should remain category-aware while preserving one-feed-at-a-time reading mode.
  - Evening completion should not impose additional writing lock after successful submit.
  - Metrics rail is a constant observational layer: live compose + day progress + short-range trend + full prompt history.
  - Morning Brief evolves into explicit XP expectation contract, not only narrative planning.
  - XP expectation budget is constrained to a bounded `0-1000` planning range.
  - XP expectation entry is optimized for quick planning via slider control.
  - Hourly chart semantics prioritize stable closed buckets over live partial-hour volatility.
- Implementation impact:
  - Implement a global floating capture bar component in runtime shell with mode shortcuts and button actions.
  - Narrow primary navigation emphasis to three core tabs while preserving deeper thread/category access in capture actions.
  - Add evening-gate state machine (`after 20:00` + pre-capture interception) parallel to Morning Brief gating logic.
  - Reuse brief skip-reason validation/persistence rules for Evening Brief to keep behavior consistent.
  - Enforce pre-capture guard check after `20:00` on each write intent until evening state becomes `completed|skipped`.
  - Support outside-click popup collapse while keeping mandatory re-open on subsequent write intents after cutoff.
  - Implement Evening Brief view-model with mixed editable/computed fields and explicit read-only rendering for computed values.
  - Validate Evening title length with `maxlength=120`.
  - Enforce Evening reflection validator with hard minimum `500` words before submit.
  - Do not enforce max-length truncation on Evening reflection field.
  - Add Evening summary card composition pipeline based on daily metrics + reflection text.
  - Render Morning/Evening brief cards only in dashboard card stack and remove timeline pinning behavior.
  - Add daily-card rotation logic tied to `03:00 local` boundary while keeping both cards visible during active day.
  - Add dashboard notification-center data model and rendering for runtime events (brief gates, penalties/refunds, command/task/system events).
  - Set notification-center default query/window to latest seven events.
  - Keep dashboard notification rendering fixed-size (7) with no full-log expansion control.
  - Include KPI diff deltas as notification event type in the same dashboard activity stream.
  - Gate KPI diff notification writes behind XP threshold check (`>= +5 XP` per diff update).
  - Emit one XP notification per qualifying diff update with source metadata and `expectedXP` remaining field.
  - Apply deterministic per-type color tokens to notification rows for quick visual parsing.
  - Bind notification row styling to fixed map: `XP blue`, `Task green`, `System red`, `Brief amber`.
  - Render notification timestamps using conditional formatter: `<24h => relative`, `>=24h => absolute`.
  - Implement notification row click handlers that route user to the linked domain tab/feed based on event type and payload target.
  - Route into default/global feed state and apply persistent highlight to the target record/event until explicit clear (instead of forcing a narrowed hard filter).
  - Apply fixed notification destination map: `Task->Tasks`, `Brief->Dashboard/briefs`, `XP->Dashboard/activity`, `System->Dashboard/notifications`.
  - Implement anchor navigation to exact referenced record(s) on destination load (auto-scroll/focus to payload-linked message(s)).
  - Add rollover guard: unresolved Evening Brief state persists across day boundary and gates Morning Brief entry.
  - Add route-level redirect guard to `Capture` with forced Evening popup when Morning is blocked by prior-day unresolved evening state.
  - Chain popup resolver: on carry-over days enforce ordered completion `Evening -> Morning` before enabling capture submit pipeline.
  - Apply carry-over damage `-10` and carry-over skip damage `-30` in scoring pipeline for gate-related outcomes.
  - Add conditional refund logic that restores carry damage (`+10`) after successful same-day completion of both carry-over gates.
  - Implement global fixed bottom-center capture bar container in runtime shell layout.
  - Keep floating capture bar mounted in shared runtime shell for all primary tab routes.
  - Implement capture mode state machine with default `daily`, color-coded mode switching, and destination-aware persistence on submit.
  - Release evening-gate write lock immediately after Evening Brief submit succeeds.
  - Bind fixed keyboard shortcuts to category modes using underlined initial-letter hints in the floating bar UI.
  - Add category-pill count model and active-feed state for Capture timeline (`all` + per-category views).
  - Add right-side Capture metrics panel aligned with timeline filtering state.
  - Implement deterministic metric pipeline for live compose counts, day totals, rolling 24h totals, 6h per-hour paired bars, and global prompt timeline cards.
  - Use six closed hourly buckets for chart aggregation and maintain deterministic left-to-right render.
  - Add `expectedXP` Morning Brief field and connect it to multiplier-eligibility evaluation hooks once baseline XP params are finalized.
  - Validate Morning Brief `expectedXP` input within `0-1000`.
  - Render `expectedXP` as a slider widget with deterministic min/max bounds.

### `2026-02-14` Interview Round 18 (Final Implementation Interview: Single-Question Mode, Completed)
- User inputs (Q1-Q50 captured):
  - Q1 Gate strictness: write intent opens required gate popup (Morning/Evening by carry state); submit grants XP path; skip requires reason and applies XP damage.
  - Q2 Skip reason format: free one-line reason; skip button must show explicit damage value.
  - Q3 Carry order: when carry exists, enforce `Evening` before `Morning`.
  - Q4 Gate source of truth: backend authority with local mirror cache in UI.
  - Q5 Brief draft autosave cadence: every `2s`.
  - Q6 Evening `<500` words behavior: block direct submit; allow skip with required reason.
  - Q7 `expectedXP` slider granularity override: range `0-1000`, step `1`.
  - Q8 Brief title constraint override: no hard UI character cap; constrained by context budget policy.
  - Q9 Morning editability: not editable after submit.
  - Q10 Day boundary authority: `03:00` in user-local timezone.
  - Q11 Active gate visual conflict: floating capture bar minimizes to icon while gate popup is open.
  - Q12 Pending gate interception: popup re-opens on every write intent while pending.
  - Q13 Capture mode reset override: no automatic reset; default main stream (`mainstream`) and explicit button switching only; active mode colors capture border.
  - Q14 Mode shortcuts override: `Command + initial letter` from category button label/icon.
  - Q15 Category-pill counts: update live on successful submit events (not while typing draft).
  - Q16 Timeline post-submit behavior: auto-scroll to bottom.
  - Q17 Metrics baseline clarification: capture metrics remain globally aggregated; UI refresh follows system refresh interval.
  - Q18 6h chart behavior: live chart includes active partial current hour.
  - Q19 Feed/capture rendering override: full content displayed; markdown rendered in capture and feed; compose box expands after `>100` words.
  - Q20 Capture submit failure: show immediate error, no local outbox queue.
  - Q21 Promote-to-task flow override: opens task-control popup form in "needs details" draft state; no persistent override default memory.
  - Q22 Command-stage authority: backend-only.
  - Q23 Command auto-retry scheduler location: backend.
  - Q24 Retry cadence: fixed `30s`.
  - Q25 Manual retry after `failed-final`: allowed immediately.
  - Q26 Failure visibility: shown only on the specific command block.
  - Q27 Queue order: strict FIFO; feed appends new records at bottom.
  - Q28 Slash command dedupe: none.
  - Q29 Command payload handling: auto-normalize with warning.
  - Q30 Day-sealed archive mutability override: read-only for user; Jarvis may append/enrich with audit trail.
  - Q31 Notification ordering clarification: sort by timestamp descending; tie-break by `eventId` (newer first).
  - Q32 Notification density: adaptive to content/viewport.
  - Q33 Highlight clear policy override: notification highlight clears automatically on first new write intent.
  - Q34 Missing deep-link target behavior: silent fail.
  - Q35 KPI diff visual: numeric colored badge.
  - Q36 XP notification aggregation window: tied to `60s` poll snapshot cadence (hero cadence alignment).
  - Q37 XP source-context visibility: show all source facets in one line.
  - Q38 Remaining-to-expectedXP rendering: show numeric value + percent.
  - Q39 Notification retention: store `30 days`.
  - Q40 System banner escalation: critical only.
  - Q41 `captureMode` state placement: shell-level context.
  - Q42 `alfred_workquest_v1` compatibility migration: lazy migration on read.
  - Q43 API contract-guard schedule: nightly.
  - Q44 Route acceptance checklist format: JSON test matrix.
  - Q45 Visual regression scope before go-implement: full component screenshot set.
  - Q46 Feature flag strategy: per-flow flags (`brief/capture/notify/xp`).
  - Q47 Rollout strategy: dark launch + internal verification.
  - Q48 XP kill-switch policy: auto fallback on threshold breach.
  - Q49 Open micro-decision handling: apply default policy and continue.
  - Q50 Go-implement gate: require all 50 decisions closed.
- Round 18 summary:
  - Final interview lock is now complete (`50/50`) and execution-ready with no unresolved UX blockers.
  - Gate/carry behavior is strict and deterministic, with explicit skip consequences and server-authoritative state.
  - Capture surface is long-form writing first (markdown rendering, adaptive density, bottom-append timeline, persistent explicit mode switching).
  - Command processing remains backend-governed (stages, retries, FIFO), while error visibility stays local to the originating feed artifact.
  - Notification behavior is deterministic (ordering, retention, escalation) while preserving low-friction reading and route continuity.
  - Release governance is explicit: per-flow flags, dark launch, and hard go-implement criterion requiring full decision closure.
- Implementation impact:
  - Finalize gate state machine + carry chain with write-intent interception and one-line skip reason requirements.
  - Keep gate and command authorities backend-first, with UI mirror caching for responsiveness.
  - Preserve high-frequency draft safety (`2s` autosave) while preventing hidden outbox semantics on submit failure.
  - Implement capture shell model with persistent explicit mode selection (`mainstream` default), shortcut routing, and active-border color semantics.
  - Keep feed behavior deterministic (`append-bottom`, scroll-to-bottom on submit) and render markdown fully in capture and feed contexts.
  - Keep metrics globally aggregated with live updates and partial-current-hour support in 6h chart.
  - Maintain command reliability model (fixed `30s` retry, immediate manual retry on terminal failure, no dedupe, payload normalization warning path).
  - Keep archive user-immutable while allowing Jarvis enrichment with audit trace.
  - Apply notification policy stack: deterministic sort, adaptive density, 30-day retention, critical-only system banners, silent missing-target handling, and write-intent highlight clearing.
  - Adopt release controls: nightly contract guard checks, per-flow feature flags, dark-launch rollout, and JSON acceptance matrix as the implementation gate artifact.

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
  - Floating capture bar placement: `1` => always fixed bottom-center globally (desktop baseline matches provided design reference).
