# PR-06 Execution Slice

## Summary
Integrate XP Engine v2 runtime/store with deterministic replay and kill-switch fallback.

## Scope
Add xp-engine core/runtime/store modules under alfred.\nImplement idempotency ledger and status/capture projection hooks.\nWire kill-switch fallback to legacy path on threshold breach.

## Out of Scope
- New API endpoints.
- Any changes under `legacy/`.
- Breaking changes to `alfred_workquest_v1`.

## Dependencies
Depends on PR-01; can run parallel with PR-03/PR-04/PR-05 if contract-safe.

## Verification
XP replay determinism and idempotency tests.\nContract tests for additive xp fields in /api/status and /api/capture.\nBuild gate: npm run build.

## Definition of Done
- Scope merged without API contract regressions.
- `npm run build` passes.
- Changes are additive-safe and aligned to `docs/final-master-spec-2026-02-14.md`.
