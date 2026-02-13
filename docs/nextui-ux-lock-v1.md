# NextUI UX Lock v1: Perfect Capture

Date: 2026-02-12
Status: **Locked**
Repo: `/Users/_xvadur/singularity/nextui`

## 1. Route Behavior Contracts

### `/capture` (Central Hub)
- **Primary View:** Bottom-anchored `BottomCaptureBar`.
- **Secondary View:** `CaptureInboxPreview` (Last 3 entries) floating above the bar.
- **Background:** Clean, minimal space focused on the current capture context.

### `/` (Dashboard Root)
- **Top Section:** `MorningBriefCard` (Prompt, Topic, Difficulty, Energy, Promise).
- **Center Section:** `HeroStatsGrid` - 4-6 cards displaying:
  - **Player Level:** Large level indicator + progress bar.
  - **XP Velocity:** Today / Yesterday / Weekly XP counts.
  - **Writing Output:** Today vs Yesterday word counts.
  - **Task Load:** Number of active/open tasks.
- **Global Capture:** `BottomCaptureBar` persistently available.

---

## 2. Component Responsibilities

### `BottomCaptureBar`
... (same as before)

### `RightSidebar` (Writing Analytics)
- **Real-time Stats:** Character count of active input.
- **Daily Totals:** Today's Word Count, Today's Prompt Count.
- **Benchmark:** "The Lord of the Rings" progress meter (Word count vs target volume).
- **Economy:** PowerUnits earned from writing volume (8h rolling window).
- **Chart:** 12-hour bar chart (X: Time, Y: Prompts & Words double-bars).
- **Timeline:** Newest-first list with "Time • First 5 words" nodes and vertical connecting lines.

### `CaptureInboxPreview`
... (same as before)

### `ProcessingStatus`
- **Responsibility:** Real-time visibility into Jarvis reasoning/sync steps.
- **Display:** Small text/dot indicator below the input bar.

### `/tasks` (Tasks & Inbox)
- **Top Section:** `TasksInboxFrame` - Frame containing inbox categories, totals, and primary management actions.
- **Main Section:** `ChronologicalTaskFeed` - Vertical feed of all tasks sorted by `createdAt` DESC.
- **Item Style:** Compact feed nodes with expansion capabilities for full ticket details.

### `/chat` (Daily Command Journal)
- **Style:** Annotation-based stream (Option B). Long-form user text with Jarvis replies interleaved as blocks or annotations.
- **Lifecycle:** 
  - Starts fresh every day at midnight (`00:00`).
  - Previous day's content is archived to `jarvis-workspace/data/chat/history/`.
- **Integration:** Captures from the `BottomCaptureBar` (category: `log`, `capture`, `daily`) populate this feed in real-time.
- **AI Toggle:** Status indicator shows if Jarvis is "Armed" to reply to the next journal entry.

- **Category -> Storage Mapping:**
  - `capture`: `jarvis-workspace/data/system/capture/inbox.json`
  - `log`: `jarvis-workspace/data/system/capture/chatui-events.jsonl`
  - `daily`: `jarvis-workspace/data/system/game/daily-logs.jsonl` (Target)
  - `tasks`: `jarvis-workspace/data/system/capture/commands.json`
- **Draft Persistence:** Unfinished text persists in local state across route changes in the same session.

---

## 4. UI States

| State | Behavior |
| --- | --- |
| **Loading** | Liveness indicator shows "Synchronizing..." |
| **Empty** | `CaptureInboxPreview` is hidden; placeholder: "Write something..." |
| **Error** | Red border/shadow, shake animation, Toast notification, text preserved. |
| **Success** | Input cleared, status reset, item slide-up into preview. |

---

## 5. Non-Goals (Scope Out)
- No in-app Jarvis chat thread in this version (Capture only).
- No complex RAG/LlamaIndex search in this UI phase.
- No editing of existing inbox items via this capture bar.

## 6. Open Questions
- Specific color codes for each category shadow/glow.
- Exact vertical offset for the preview list on mobile screens.
