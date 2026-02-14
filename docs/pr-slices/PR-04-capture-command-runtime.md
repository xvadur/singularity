# PR-04 Execution Slice

## Summary
Deliver capture/feed behavior and command lifecycle authority rules.

## Scope
Implement full markdown rendering in compose and feed.\nEnforce feed append-bottom + scroll-to-bottom on successful submit.\nImplement command lifecycle stages and retry policy (30s, cap, terminal failure with manual retry).

## Out of Scope
- New API endpoints.
- Any changes under `legacy/`.
- Breaking changes to `alfred_workquest_v1`.

## Dependencies
Depends on PR-01 and PR-02.

## Verification
Command scheduler/retry tests.\nCapture submit failure handling tests (no local outbox).\nBuild gate: npm run build.

## Definition of Done
- Scope merged without API contract regressions.
- `npm run build` passes.
- Changes are additive-safe and aligned to `docs/final-master-spec-2026-02-14.md`.
