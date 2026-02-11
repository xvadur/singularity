# jarvis-workspace

Structured local storage for Jarvis/OpenClaw runtime context.

## Structure

- `data/system/capture/inbox.json`: captured notes/tasks from ChatUI and API.
- `data/system/capture/commands.json`: queued slash commands (e.g. `/log ...`) waiting for Jarvis automation.
- `data/chat/chatui-events.jsonl`: append-only journal for chat/capture events.

## Notes

- `alfred/server-fixed.js` writes here by default.
- Override location via `JARVIS_WORKSPACE=/absolute/path`.
