# PR-02 Execution Slice

## Summary
Extract runtime shell/components from App.tsx without changing business behavior.

## Scope
Create component boundaries under chatui/src/components for layout/capture/briefs/notifications/commands/dashboard/tasks.\nKeep CSS class names unchanged while moving code organization.\nWire shell-level captureMode context placement.

## Out of Scope
- New API endpoints.
- Any changes under `legacy/`.
- Breaking changes to `alfred_workquest_v1`.

## Dependencies
Depends on PR-01 for stable contract scaffolding.

## Verification
Build gate: npm run build.\nRoute and render smoke checks on /chat.\nNo behavior drift in existing captures.

## Definition of Done
- Scope merged without API contract regressions.
- `npm run build` passes.
- Changes are additive-safe and aligned to `docs/final-master-spec-2026-02-14.md`.
