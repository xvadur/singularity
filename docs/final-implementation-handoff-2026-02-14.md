# Final Implementation Handoff (UX Polish + Pencil Execution)

Date: 2026-02-14  
Owner: xvadur + Codex  
Mode for next conversation: execution-focused, no new discovery unless blocker appears

## 1) Purpose
Run the final implementation iteration with focus on:
- UX polish in Pencil (visual hierarchy, spacing rhythm, states, feedback),
- stable interaction behavior already locked in Discovery,
- XP Engine v2 surface integration and explainability.

This handoff is for execution. Behavioral contracts are already mostly locked.

## 2) Canonical Inputs
- `/Users/_xvadur/singularity/Discovery.md`
- `/Users/_xvadur/singularity/Research.md`
- `/Users/_xvadur/singularity/Plan.md`
- `/Users/_xvadur/singularity/Progress.md`
- `/Users/_xvadur/singularity/docs/xp-engine-v2-official.md`
- `/Users/_xvadur/singularity/docs/xpčka/XP-Engine-v2-Official.md`
- `/Users/_xvadur/singularity/docs/pencil-antigravity-merge-handoff.md`
- `/Users/_xvadur/singularity/docs/discovery-interview-opening-handoff-2026-02-13.md`

## 3) Locked Contracts To Preserve
### Runtime and UX contracts
- Floating capture bar is global on `Dashboard`, `Capture`, `Tasks`.
- Capture default route mode is `daily`; category mode changes destination and visual state.
- Evening brief gate appears on write intent after `20:00`; outside-click dismiss is temporary.
- Carry-over order is strict: `Evening` then `Morning`.
- Brief cards are dashboard-only (no timeline pinned brief cards).
- Notification center: last 7 events, no show-all, typed colors, click routes to target and highlights concrete record.
- Notification timestamp format: relative under 24h, absolute otherwise.
- Notification highlight persists until explicit clear.

### XP contracts (v2 baseline)
- Internal unit `XU`, UI alias `EEU`.
- Sessionized concave minting + quality gates (entropy/duplicate).
- Daily hard cap `2500`, soft behavior retained.
- Multiplier max `1.20`.
- XP notifications trigger at aggregated `>= +5 XP`.
- Kill-switch fallback to legacy path on threshold breach.

## 4) Final Iteration Scope (In)
1. Pencil visual polish pass:
- typography hierarchy, spacing system, color consistency, token discipline.
2. Interaction polish:
- hover/focus/active/disabled states,
- empty/loading/error/success states,
- modal/popup behavior consistency.
3. Timeline/feed readability:
- long-content scanability, anchors, record highlighting clarity.
4. Notification center polish:
- event row density, timestamp readability, route affordance clarity.
5. XP surface polish:
- delta explainability blocks, concise scoring feedback, anti-clutter display rules.
6. Implementation mapping package:
- exact component/state mapping for runtime implementation.

## 5) Out of Scope (for this iteration)
- New product surface invention outside locked routes.
- Reopening core economy formulas unless critical contradiction appears.
- Backend endpoint expansion without explicit approval.

## 6) Execution Plan For New Conversation
### Phase A: Pencil State Audit
- Verify active file and frames.
- Inventory all target states per surface (`default`, `focused`, `error`, `loading`, `empty`, `success`).

### Phase B: Visual and Interaction Polish
- Apply spacing and hierarchy normalization.
- Apply state visuals for inputs, pills, notifications, timeline rows, popups.
- Validate anchor/highlight behavior visually in feed destinations.

### Phase C: Runtime Mapping
- Produce implementation map:
  - UI element -> component target,
  - interaction -> state transition,
  - state source -> data contract field.

### Phase D: Acceptance and Handoff
- Produce final route-by-route acceptance checklist.
- List unresolved micro-decisions (if any) with defaults.
- Prepare implementation-ready checklist for coding pass.

## 7) Acceptance Checklist (Must Pass)
1. Visual consistency across `Dashboard`, `Capture`, `Tasks`.
2. Floating capture bar behavior consistent across all primary tabs.
3. Notification click flow clearly indicates jump + persistent highlight target.
4. Brief gate UX remains strict but non-confusing (dismiss/reopen logic intact).
5. Feed remains readable under high-volume day logs.
6. XP feedback is clear without overwhelming screen noise.
7. Mobile and desktop layouts are both usable (at least baseline responsive behavior).

## 8) Risks To Watch
- Over-polish causing regression in readability.
- Visual changes that unintentionally imply behavioral changes.
- Token/style drift between Pencil and runtime implementation.
- Too many simultaneous micro-animations reducing usability.

## 9) Deliverables Expected From Next Conversation
1. Final Pencil polish decisions (explicit list).
2. Route-by-route UI state matrix.
3. Implementation mapping checklist (component/state/data).
4. Final "go implement" package with no open UX blockers.

## 10) Paste-Ready Kickoff Prompt (new conversation)
Use this exact block:

```text
Run final implementation iteration using:
- /Users/_xvadur/singularity/docs/final-implementation-handoff-2026-02-14.md
- /Users/_xvadur/singularity/docs/xp-engine-v2-official.md
- /Users/_xvadur/singularity/Discovery.md
- /Users/_xvadur/singularity/Plan.md
- /Users/_xvadur/singularity/Progress.md

Goal:
- finalize UX polish in Pencil and produce implementation-ready mapping for runtime code.

Rules:
- do not reopen core discovery decisions unless a hard contradiction is found.
- focus on visual hierarchy, spacing, states, readability, and interaction clarity.
- preserve locked contracts for capture bar, brief gates, notifications, and XP thresholds.
- output an explicit route-by-route acceptance checklist and implementation checklist.
```

