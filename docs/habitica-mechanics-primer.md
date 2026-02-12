# Habitica Mechanics Primer (for Jarvis Discovery)

## Why this exists
This primer gives a shared baseline before Discovery decisions. It explains how Habitica works in mechanics terms, not UI terms.

## Core task types
- `habit`: repeatable positive/negative actions (`up` and/or `down`).
- `daily`: recurring commitments with schedule logic and missed-day penalties.
- `todo`: one-off items with completion scoring and checklist amplification.
- `reward`: user-spend action that consumes currency and does not grant XP.

## Score loop
1. User scores a task (`up` or `down`).
2. Task value changes dynamically (anti-spam pressure via value drift).
3. Score result updates character resources (EXP, gold, HP, MP).
4. Temporary effect payload is produced (crit, streak bonus, quest progress, drops).

Reference: `/Users/_xvadur/singularity/references/habitica/website/common/script/ops/scoreTask.js`

## Streak behavior
- Dailies build streak on successful completion.
- Streak modifies reward output (notably gold bonus in baseline Habitica logic).
- Reversals/unchecked behavior can reduce streak and related rewards.

Reference: `/Users/_xvadur/singularity/references/habitica/website/common/script/ops/scoreTask.js`

## Level progression
- EXP is accumulated and converted to levels by deterministic thresholds.
- Level-up restores HP and can trigger additional progression effects.

Reference: `/Users/_xvadur/singularity/references/habitica/website/common/script/fns/updateStats.js`

## Cron / reset logic
- Cron evaluates missed schedule windows using timezone + custom day-start.
- Missed dailies can trigger penalties and state reset operations.
- Todo/daily values are advanced during cron for incentive pressure.

References:
- `/Users/_xvadur/singularity/references/habitica/website/common/script/cron.js`
- `/Users/_xvadur/singularity/references/habitica/website/server/libs/cron.js`

## Anti-spam dynamics in Habitica
- Dynamic task value drift creates diminishing returns for repetitive scoring.
- Cron and schedule logic prevent "infinite free farming" from stale tasks.

## Jarvis adaptation guidance
- Keep mechanics, not architecture.
- Preserve Jarvis contracts (`/api/status`, `/api/capture`, queue semantics).
- Use deterministic engine modules with explicit event logs for auditability.
