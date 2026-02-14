# XP Engine v2 Official Specification (HKEE)

## 1. Purpose
This document defines the official scoring system for writing gamification in Jarvis.
The objective is to turn high-volume writing into a durable game loop where:
- output stays rewarding over long horizons,
- farming/spam is mathematically unprofitable,
- rewards are auditable and deterministic,
- the system self-adapts with minimal manual tuning.

## 2. What We Learned
From the research set and the XP materials, the key conclusions are:
- Sessionized concave minting is the strongest anti-farming core (no split-event advantage).
- The economy must use soft diminishing returns and a hard daily cap.
- Quality must influence rewards through low-cost signals (entropy + duplicate checks).
- Difficulty should be computed from evidence, not manually edited.
- Multipliers must stay narrow (`<= 1.20`) to avoid volatility.
- Rollout must be staged (Shadow -> Compare -> Blend -> Full) with kill-switch thresholds.

## 3. Official Naming and Units
- Internal compute unit: `XU` (Exertion Unit).
- UI alias: `EEU` (same value as XU, display-only alias).
- Progress currencies:
  - `XU`: effort minting unit.
  - `XP`: progression currency.
  - `Coins`: spend currency.

## 4. Non-Negotiable Invariants
1. Determinism: same inputs/state => same outputs.
2. Boundedness: event/session/day clamps always apply.
3. Monotonicity: more valid effort cannot reduce reward.
4. Path independence: splitting the same work into many events must not increase total reward.
5. Smoothness: no reward cliffs around soft-cap boundaries.
6. Time integrity: day boundary is fixed at `03:00` local.

## 5. Day Lifecycle (03:00 Reset Contract)
1. Morning phase:
- Morning Brief opens day intent (`expectedDifficulty`, `expectedXP`, plan).
2. Runtime phase:
- User writes/captures/tasks throughout day.
- Scoring runs online per event (with 60s aggregation windows for notifications).
3. Evening phase:
- Evening Brief computes `actualDifficulty` (read-only), logs reflection.
4. Day close:
- At `03:00 local`, day rolls, baselines update, daily caps reset.

## 6. Scoring Pipeline (Event-Level)
The order is fixed and must not be changed.

### Step 1: Eligibility Gate
Writing minting is eligible only if:
- `words >= 40` OR `chars >= 200`.
Otherwise writing reward is `0` (optional routine handling is separate policy).

### Step 2: Sessionization
- Start a new session when idle gap exceeds `g_session = 25 min`.
- Per event effective minutes:
  - `m_i = min(words_i / WPM_ref, timeGap_i + m_pad)`
- Session effective minutes:
  - `M_s* = max(0, sum(m_i) - m_over)`

### Step 3: Writing Minting (Concave Session Function)
- Anchor: `60 deep-focus minutes = 100 XU`.
- Concave session function:
  - `F(M) = 100 * (1 - exp(-(M - m_over)/tau)) / (1 - exp(-(60 - m_over)/tau))`
- Marginal event writing XU:
  - `writingXU_j = q_s * (F(C_j) - F(C_{j-1}))`
  - where `C_j` is cumulative effective minutes in current session.

### Step 4: Quality Multiplier
`q_s` is multiplicative:
- duplicate exact check (`SHA-256`): `q_exact = 0.1` if exact duplicate in lookback window.
- near-duplicate check (`Simhash64`, Hamming `<= 3`): `q_near = 0.4`.
- entropy gate (`H_min = 2.8 bits/char`): `q_entropy = 0.5` when below threshold.
- `q_s = q_exact * q_near * q_entropy` (each factor defaults to `1.0` if not triggered).

### Step 5: Task Bonus
- Progress bonus:
  - if `deltaProgressPct < 2%` => `0`.
  - else `progBonus = k_delta * sqrt(min(deltaProgressPct, delta_cap))`
- Completion bonus:
  - `doneBonus = k_done` when task completed (bounded by daily caps).

### Step 6: Difficulty Modifier
- `m_diff = clamp(exp(beta * (difficultySignal - baselineDiff)/100), 0.9, 1.1)`
- Keeps effect bounded and resistant to subjective inflation.

### Step 7: Compose Event XU
- `deltaXU_raw = (writingXU + progBonus + doneBonus) * m_diff`
- Apply clamps:
  - event cap: `60 XU`
  - session cap: `1000 XU`
  - daily cap: `2500 XU`
- `deltaXU = max(0, clamped_value)`

### Step 8: Apply Daily Multiplier
Daily multiplier is process-based:
- `M = min(1.20, 1 + 0.10*K + 0.05*Q + 0.05*G)`
- Applied to total daily yield path (per locked policy).

### Step 9: Convert to XP and Coins
Use deterministic damped conversion with per-user dust accumulator:
- canonical curve:
  - `curve(x) = ln(1 + x) / ln(1001)`
- compatibility-safe conversion:
  - `deltaXP_float = 5 + 95 * curve(deltaXU_after_multiplier)`
  - `deltaCoins_float = 1 + 19 * curve(deltaXU_after_multiplier)`
- Store fractional remainder in `xpDust` and `coinDust`.
- Flush dust on every event (rounding-safe, no splitting exploit).

### Step 10: Penalties and Refunds
Apply after base+multiplier conversion, on XP:
- Morning Brief skip: `-10 XP`.
- Carry-over unresolved state: `-10 damage`.
- Skip in carry flow: `-30 damage`.
- Carry refund: `+10` after same-day completion of required carry gates.
- Use non-stacking safeguards to avoid double punishment explosions.

### Step 11: Notification Emission
- Aggregate in 60s windows.
- Emit XP notification only when net gain in window is `>= +5 XP`.

## 7. actualDifficulty (1..100)
`actualDifficulty` is computed at evening/day-close from objective + subjective + friction evidence:

- Objective block `O`:
  - `0.28*V_time + 0.22*V_cx + 0.12*V_sw + 0.12*V_unp + 0.14*V_pr + 0.12*V_co`
- Subjective block `S`:
  - `0.25*D_sleep + 0.35*D_energy + 0.25*D_stress + 0.15*D_health`
- Friction block `C`:
  - `0.5*F_delay + 0.5*F_proc`, gated by engagement evidence.
- Engagement gate:
  - friction contribution enabled only if `workMinutes > 15`.
- Final:
  - `actualDifficulty = round(100 * (b + (1-b) * (0.55*O + 0.30*S + 0.15*C)))`
  - `b = 0.05 + 0.15*E_eng`

Missing-data policy:
- Use neutral defaults for missing subjective fields.
- Lower confidence factor when Morning/Evening evidence is incomplete.

## 8. Default Parameter Set (Locked)
| Parameter | Default |
| --- | --- |
| `g_session` | `25 min` |
| `WPM_ref` | personalized rolling median, clamped `18..35` |
| `tau` | `60` |
| `m_over` | `5 min` |
| `m_pad` | `1.5 min` |
| `w_min` | `40` |
| `ch_min` | `200` |
| `H_min` | `2.8 bits/char` |
| `delta_min` | `2%` |
| `delta_cap` | `30%` |
| `k_delta` | `5` |
| `k_done` | fixed constant (initially `12 XU`) |
| event cap | `60 XU` |
| session cap | `1000 XU` |
| daily cap | `2500 XU` |
| multiplier max | `1.20` |
| day boundary | `03:00 local` |

## 9. Required Event and Audit Schema
Each scored event must log at minimum:
- `eventId`
- `ts`
- `category`
- `words`
- `chars`
- `sha256`
- `simhash64`
- `entropy`
- `progressDeltaPct`
- `taskCompleted`
- `deltaXU`
- `deltaXP`
- `deltaCoins`
- `multiplierSnapshot`
- `penaltiesApplied`
- `baselineSnapshot`
- `engineVersion`

Audit requirement:
- replaying ordered events must reproduce the same outputs exactly.

## 10. Anti-Gaming Controls (v2 Required Set)
1. Session marginal minting (no split advantage).
2. Eligibility gate (`40 words` or `200 chars`).
3. Exact duplicate discount (`0.1x`).
4. Near duplicate discount (`0.4x`).
5. Entropy gate (`H < 2.8 => 0.5x`).
6. Progress floor (`<2% => no progress bonus`).
7. Concave progress bonus (`sqrt` form).
8. Per-event/session/day caps.
9. Dust wallet for rounding safety.
10. Adversarial monitoring (`G_adv`, inflation, retention).

## 11. Rollout and Kill-Switch
### Rollout
1. Shadow mode: `14 days` (compute new engine, no user impact).
2. Compare mode: `7 days` (side-by-side deltas).
3. Blend ramp: `28 days` (`lambda: 0.25 -> 1.00`).
4. Full activation after thresholds pass.

### Kill-Switch Thresholds
Trigger immediate fallback to legacy path when:
- XP inflation `> +5%`,
- adversarial advantage `G_adv > 1.15`,
- retention proxy drop `> 0.5pp`.

## 12. User-Facing Explainability Contract
Each major reward update should be explainable in plain language:
- volume driver (`minutes / words`),
- quality driver (`entropy / novelty / duplicate`),
- consistency driver (`K/Q/G`),
- penalties/refunds applied,
- why marginal gains changed in long sessions.

## 13. Implementation Notes
- Keep existing contracts backward-compatible during migration.
- Version scoring outputs (`engineVersion`) for safe UI interpretation.
- Preserve local compatibility behavior (including existing local storage key handling).
- Treat this document as the canonical source for XP Engine v2 implementation.

