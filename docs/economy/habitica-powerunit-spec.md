# Habitica-to-PowerUnit Economy Specification

## Overview

This document maps Habitica game mechanics to the Jarvis PowerUnit domain, defining how each mechanic is adopted, adapted, or deferred. It builds on the findings in `Research.md` (Tracks A-E) and the architecture decisions locked in `Discovery.md` (14 interview rounds).

**Source reference**: `references/habitica/website/common/script/ops/scoreTask.js`
**Target system**: PowerUnit economy in `alfred/server-fixed.js`

---

## Task Type Mapping

### Habitica -> Jarvis PowerUnit

| Habitica Type | Jarvis Equivalent | Implementation Status | Details |
|---------------|-------------------|----------------------|---------|
| **Habit** (up/down) | Prompt run scoring | Implemented (client) | `alfred_workquest_v1` tracks cognitive score, vocab score, XP per prompt. Client-side in App.tsx. |
| **Daily** (recurring) | Recurring commitment | Deferred (MVP+1) | Future: daily check-in tasks with missed-day penalty. Currently no server-side daily tracking. |
| **Todo** (one-off) | Ticket with EEU claim | Implemented (server) | `meta.ticket` on `/api/capture` triggers `applyTicketEconomyClaim()`. Delta-only progress claims. |
| **Reward** (currency spend) | Shop purchase | Implemented (server) | `meta.shopPurchase` on `/api/capture` triggers `applyShopPurchase()`. 3-tier catalog. |

---

## Score Loop Comparison

### Habitica Score Flow

```
scoreTask(user, task, direction)
  -> task.value drift (0.9747^value decay toward mean)
  -> XP award (task.value * modifier)
  -> Gold award (task.value * modifier * streak bonus)
  -> HP penalty (negative habits/missed dailies)
  -> MP award (INT stat based)
  -> Quest progress (if active quest)
  -> Temp payload (_tmp: drop, crit, streakBonus)
```

### Jarvis PowerUnit Score Flow

```
applyTicketEconomyClaim(ledger, ticketMeta)
  -> deltaProgress calculation (incremental only)
  -> rawDelta = plannedEEU * (deltaProgress / 100)
  -> repeatFactor (diminishing per claims today)
  -> softFactor (diminishing above 1200 PU daily)
  -> deltaPU = rawDelta * repeatFactor * softFactor
  -> deltaXP = log curve from deltaPU (5-100 range)
  -> deltaCoins = log curve from deltaPU (1-20 range)
  -> flags = audit trail (cap_reached, high_slider, rapid_claims)
  -> ledger update (byDay, byTicket, totals)
  -> economy event append (JSONL audit log)
```

### Key Differences

| Aspect | Habitica | Jarvis PU |
|--------|----------|-----------|
| Task value drift | Dynamic (approaches mean over time) | Static (planned at creation) |
| Anti-spam | Value drift naturally dampens | Explicit repeat factor + cap system |
| Negative consequences | HP damage for missed dailies | Deferred (no penalty model yet) |
| Quest progress | Party-shared accumulation | Per-ticket tracking in byTicket |
| Currency model | Gold + Gems (premium) | Coins only (single currency) |
| Scoring frequency | Per-action (immediate) | Per-claim (explicit user action) |

---

## Streak Mechanics

### Habitica Streak

```javascript
// From scoreTask.js
streakBonus = task.streak / 100
goldModifier = goldModifier * (1 + streakBonus)
```

Streak increments on daily completion, resets on miss. Gold bonus grows linearly.

### Jarvis PowerUnit Streak

**Client-side** (App.tsx, `alfred_workquest_v1`):
```
streakMultiplier = 1 + min(0.4, (streakDays - 1) * 0.05)
```

Streak increments when prompt submitted on consecutive days. Max bonus: +40% at 9+ day streak.

**Server-side**: `streakDays` exposed via `/api/status` player object. Currently informational only; not yet wired into PU claim calculations.

### Future Integration

Merge streak multiplier into server-side `applyTicketEconomyClaim()`:
```
deltaPU = rawDelta * repeatFactor * softFactor * streakMultiplier
```

This is deferred to avoid changing the claim formula in MVP.

---

## Anti-Spam and Anti-Inflation

### Habitica

- **Task value drift**: `value = value + (delta * 0.9747^|value|)` — high-value tasks drift back toward mean
- **Crit system**: Random crits based on STR stat add bonus reward
- **No daily cap**: Unlimited scoring (balanced by value drift)

### Jarvis PowerUnit

- **Repeat factor**: `1 / (1 + 0.15 * claims)` — explicit diminishing per claim
- **Soft slowdown**: 30% minimum rate above 1200 PU daily
- **Hard cap**: 2500 PU daily ceiling
- **Audit flags**: Automated detection of abuse patterns
- **No crits on economy claims**: Crits exist only on client-side prompt scoring

### Comparison

Habitica relies on organic dampening (value drift); Jarvis PU uses explicit guardrails (factor + cap). The Jarvis approach is more predictable and auditable for a single-user system.

---

## Critical Hits

### Habitica

```javascript
// From crit.js
critChance = 0.03 * (1 + STR / 100)
critBonus = 1.5 + (4 * STR / (STR + 200))
```

Applied to all task scoring. Random, stat-based.

### Jarvis PowerUnit

**Client-side only** (App.tsx):
```
critChance = (cognitiveScore >= 70 || wordCount >= 80) ? 0.12 : 0.04
critMultiplier = 1.6
```

Applied to prompt run XP, not to economy claims. Based on content quality, not random stats.

**Server-side**: No critical hit mechanism on PU claims. Deferred to maintain deterministic scoring.

---

## Quest System

### Habitica

- Boss quests: Party accumulates damage from task scoring
- Collection quests: Party collects items dropped from task scoring
- Shared progress contract with different completion triggers
- Quest rewards fan out to all party members

### Jarvis PowerUnit

- Quests tracked in `alfred_workquest_v1` game state (client-side)
- Quest progress via ticket `byTicket` tracking (server-side)
- Single-user: no party mechanics needed
- Future: unified quest interface with pluggable progress strategy

---

## PowerUnit + XP + Coins Interaction

```
                    +-----------+
                    |  Ticket   |
                    | (planned  |
                    |  EEU +    |
                    |  progress)|
                    +-----+-----+
                          |
                   applyTicketEconomyClaim()
                          |
                    +-----v-----+
                    | deltaPU   |
                    | (capped,  |
                    |  dampened) |
                    +-----+-----+
                          |
              +-----------+-----------+
              |                       |
        +-----v-----+          +-----v-----+
        |  deltaXP  |          | deltaCoins|
        | (5-100)   |          | (1-20)    |
        | log curve |          | log curve |
        +-----+-----+          +-----+-----+
              |                       |
        +-----v-----+          +-----v-----+
        |  Level    |          |   Shop    |
        | Progression|         | Purchases |
        | (100+L*25)|          | (3 tiers) |
        +-----------+          +-----------+
```

### Two XP Sources (Current)

1. **Server PU claims**: deltaXP from economy engine (5-100 per claim)
2. **Client WorkQuest**: prompt run XP from cognitive scoring (variable)

Both feed into `totalXP` but are tracked separately. Future: merge into single server-authoritative source.

---

## Shop Economy

### Habitica

- Equipment shop (stat-boosting gear)
- Seasonal items (cosmetic)
- Gems shop (premium currency)
- Gold-based purchasing

### Jarvis PowerUnit

| Tier | Name | Price | Purpose |
|------|------|-------|---------|
| micro | Micro Reward | 40 coins | Small incentive |
| standard | Standard Reward | 120 coins | Medium reward |
| major | Major Reward | 300 coins | Significant reward |

Fixed catalog. No stat effects (cosmetic/incentive only in MVP). Single currency (coins).

---

## Deferred Mechanics

| Mechanic | Habitica Feature | Reason for Deferral | Target Phase |
|----------|-----------------|---------------------|-------------|
| HP/Damage | Missed daily penalty | Negative consequences need careful tuning | MVP+1 |
| MP/Skills | Ability system (STR, INT, etc.) | Over-complex for single user | Indefinite |
| Social/Party | Group quests, challenges | Single-user system | N/A |
| Equipment | Stat-boosting gear | No stat system to boost | MVP+2 |
| Gems | Premium currency | Single-user, no monetization | N/A |
| Pets/Mounts | Collection rewards | Cosmetic, low priority | MVP+2 |
| Server-side streak | Streak in PU claims | Formula stability in MVP | MVP+1 |
| Missed-daily penalty | Cron-driven HP damage | Needs daily task model first | MVP+1 |
| Unified XP source | Merge client into server | Migration complexity | Next.js phase |

---

## Implementation Priority

### MVP (Current Slice)

1. PowerUnit alias on existing EEU fields (display rename)
2. Benchmark formalization (scoring model documentation)
3. This spec document (mechanic mapping reference)

### MVP+1

1. Server-side streak multiplier in PU claims
2. Daily task type with missed-day penalty (HP equivalent)
3. Enhanced quest progress tracking

### Next.js Phase

1. Unified XP source (server-authoritative)
2. Route-handler parity for economy endpoints
3. Full Habitica-style task card UI
