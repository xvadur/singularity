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

## Technical Direction
- App structure: Extend existing chatui/ workspace (not a new project). Add react-router-dom for multi-page SPA, recharts for data viz, lucide-react for icons. Decompose into types/, lib/, context/, hooks/, components/ (layout, dashboard, capture, quests, tasks, workquest, jarvis, shared), styles/. Main entry (main.tsx) wraps App with BrowserRouter (basename="/chat") and three nested context providers (Status > Game > Capture).
- Data model direction: No changes to data models. StatusResponse type from /api/status is the primary read model. GameState (quests, runs, streak, achievements, settings) persists in localStorage. Capture submissions go to alfred API. All types extracted from App.tsx into types/ directory.
- Event and queue flow: User captures -> POST /api/capture -> alfred writes to inbox.json + chatui-events.jsonl -> cache invalidated -> next GET /api/status returns updated data -> StatusContext auto-refresh picks it up. Slash commands parsed client-side, enqueued server-side. Jarvis cron processes pending inbox every 3 hours (configurable).
- Runtime/deployment model: Dev: `npm run dev:all` runs alfred (port 3031) + Vite dev server (port 5173, proxies /api to 3031). Prod: `npm run build` compiles chatui to dist/, `npm run start` runs alfred (port 3030) serving dist/ at /chat/*. Cloudflare Tunnel routes public traffic to 127.0.0.1:3030.

## Risks and Constraints
- Product risks: Decomposing a working monolith could introduce regressions if prop passing or context wiring is incorrect. Mitigate with incremental extraction (one component at a time) and build verification after each.
- Technical risks: (1) Vite base: '/chat/' must exactly match React Router basename="/chat" — mismatch causes blank pages or 404s. (2) localStorage key alfred_workquest_v1 holds full GameState — GameContext must read/write identical format or existing user progress is lost. (3) CSS class names must not change during organizational split or styling breaks silently.
- Operational risks: The submit function (App.tsx lines 539-714, ~175 lines) is the most complex piece — it handles capture submission, XP calculation, quest progression, achievement unlocking, streak updates, and Jarvis triggering. Splitting it across contexts would create coupling bugs. Keep as one cohesive function in CaptureContext.
- Mitigations: Build after every phase. Keep vanilla HTML dashboard accessible at /dashboard as fallback during migration. No CSS renaming — only file organization. Test all routes end-to-end before redirecting root /.

## Open Questions
- Q1: Should the sidebar be always visible or collapsible? (Recommendation: collapsible with toggle, default open on desktop, collapsed on mobile)
- Q2: Should the Jarvis chat support multiple threads/sessions or just one general conversation? (Current API supports threadId parameter)
- Q3: Should WorkQuest game state eventually be server-persisted (alfreds API) instead of localStorage-only? (Not in scope now, but affects future architecture)

## Interview Notes
- This section is filled during structured interview rounds with user.
- Use dated entries.

## Decision Log
- `2026-02-12`: Extend chatui/ instead of creating new project -> reuses all existing code (1390 lines of business logic, 766 lines of CSS, working API integration), avoids duplication, maintains monorepo build pipeline -> zero migration cost for existing features
- `2026-02-12`: Use React Context + hooks instead of Redux/Zustand -> current state complexity (3 domains: status, game, capture) fits Context pattern well, avoids adding state management dependency, consistent with existing hooks-based architecture -> simpler mental model
- `2026-02-12`: Keep recharts (used in legacy) instead of alternatives -> already proven in the codebase, lightweight, React-native, sufficient for XP bars and vitality charts -> consistency with legacy precedent
