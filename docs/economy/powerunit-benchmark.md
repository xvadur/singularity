# PowerUnit Benchmark Report

## Overview

This document formalizes the PowerUnit scoring model derived from the Iteration 1 development history on the `main` branch. It serves as the reproducible baseline for the Habitica-inspired economy system.

**Baseline tag**: `iteration-1-benchmark-2026-02-12`
**Baseline commit**: `d98f6dc`
**Branch**: `main`
**Author**: XVADUR
**Sprint window**: 2026-02-11 00:29 to 2026-02-12 11:33 (~35 hours)

---

## PowerUnit Definition

PowerUnit (PU) is the display name for the internal EEU (Estimated Effort Unit) performance measurement system.

| Parameter | Value | Description |
|-----------|-------|-------------|
| Internal key | `eeu` | Storage and API field name |
| Display name | PowerUnit (PU) | User-facing label |
| Anchor | 100 PU = 60 min | Deep focus equivalence |
| Daily cap | 2500 PU | Hard ceiling per day |
| Soft start | 1200 PU | Diminishing returns threshold |
| Day reset | 03:00 local | Wall-clock daily boundary |
| Retention | 45 days | Ledger history window |

---

## Scoring Model

### Base Claim Formula

```
rawDelta = plannedEEU * (deltaProgress / 100)
```

Where:
- `plannedEEU`: User-specified effort anchor (1-1000 slider)
- `deltaProgress`: Incremental progress change (only positive deltas rewarded)

### Anti-Spam: Repeat Factor

```
repeatFactor = 1 / (1 + 0.15 * claimsToday)
```

Diminishing returns per repeated claims on the same ticket within a day.

### Anti-Inflation: Soft Slowdown

```
if dailyBefore > SOFT_START:
  softFactor = max(0.30, 1 - ((dailyBefore - 1200) / (2500 - 1200)) * 0.70)
else:
  softFactor = 1.0
```

Smooth transition from 100% to 30% reward rate between 1200-2500 PU.

### Final PU Award

```
deltaPU = clamp(round(rawDelta * repeatFactor * softFactor), 0, capRemaining)
```

### XP and Coins Conversion (Logarithmic Curve)

```
curve = log(1 + deltaPU) / log(1001)
deltaXP = round(5 + 95 * curve)       // Range: 5-100 XP
deltaCoins = round(1 + 19 * curve)    // Range: 1-20 coins
focusMinutes = round(deltaPU * 0.6)   // Focus time equivalent
```

### Audit Flags

| Flag | Trigger | Purpose |
|------|---------|---------|
| `high_slider` | plannedEEU >= 900 | Monitor high-value claims |
| `cap_reached` | Daily 2500 PU hit | Hard limit enforcement |
| `rapid_claims` | 5+ claims same ticket/day | Spam detection |
| `manual_review` | high_slider + 3+ claims | Combined risk |

---

## Git History Scoring

### Commit Analysis

| Hash | Date | Type | Message | Lines +/- | Category | PU Estimate |
|------|------|------|---------|-----------|----------|-------------|
| `12e8149` | 2026-02-11 00:29 | feat | Initial import: Jarvis Dashboard | root | bootstrap | 80 |
| `5642b39` | 2026-02-11 02:58 | chore | monorepo: alfred + chatui | root | architecture | 200 |
| `1183636` | 2026-02-11 05:21 | feat | wire jarvis chat bridge and workquest foundations | +1474/-88 | implementation | 350 |
| `c59b5c7` | 2026-02-11 05:25 | chore | surface boss xp panel by default | +7/-7 | config | 15 |
| `c1c61a7` | 2026-02-11 05:30 | chore | simplify repo to alfred chatui legacy layout | +40/-54 | architecture | 60 |
| `fd8b073` | 2026-02-11 05:32 | chore | track single legacy chatui source folder | +4513/-2 | preservation | 40 |
| `7832331` | 2026-02-12 00:40 | feat | add jarvis toggle flow and workspace capture pipeline | +761/-58 | implementation | 300 |
| `aec9bdf` | 2026-02-12 00:40 | feat | enhance dashboard readability and ticket capture UX | +599/-266 | implementation | 250 |
| `ed11072` | 2026-02-12 01:05 | docs | add Discovery Research Plan and Progress framework | +252 | documentation | 120 |
| `0a1c121` | 2026-02-12 01:13 | docs | populate Discovery.md with Jarvis Dashboard plan | +40/-33 | documentation | 80 |
| `b786fe6` | 2026-02-12 11:33 | feat | finalize iteration1 code and docs baseline | +1721/-62 | implementation | 500 |
| `d98f6dc` | 2026-02-12 11:33 | chore | snapshot iteration1 runtime workspace data | +254/-7 | data | 30 |

### PU Estimation Methodology

Estimates are based on:
- **Lines changed**: Primary weight (implementation effort)
- **Commit type**: feat/docs/chore weighting (feat=1.0, docs=0.8, chore=0.5)
- **Category complexity**: architecture/implementation > config/data
- **Context from commit content**: Reviewed actual changes for effort assessment

---

## Iteration 1 Summary

| Metric | Value |
|--------|-------|
| Total commits | 12 |
| Feature commits | 6 (50%) |
| Documentation commits | 2 (17%) |
| Chore commits | 4 (33%) |
| Total lines added | ~9,661 |
| Total lines removed | ~577 |
| Sprint duration | ~35 hours |
| Estimated total PU | 2,025 |
| Key deliverables | EEU economy engine, 14 interview rounds, API contracts, Habitica extraction |

### Commit Type Distribution

```
feat  ██████████████████████████  50% (6)
chore █████████████████           33% (4)
docs  █████████                   17% (2)
```

---

## Reproducibility

To reproduce this benchmark:

```bash
git checkout iteration-1-benchmark-2026-02-12
npm run build
# Verify economy ledger at:
# jarvis-workspace/data/system/game/economy-ledger.json
# Verify API contracts via:
# GET /api/status -> economy snapshot
# POST /api/capture -> economy effect
```

The scoring model constants are defined in `alfred/server-fixed.js` lines 46-56 and the claim logic in `applyTicketEconomyClaim()` at lines 295-421.
