# PowerUnit Implementation Validation

## Build Verification

To verify the build passes:

```bash
npm run build
# Expected: vite builds chatui with zero errors
# ✓ 31 modules transformed, built in <1s
```

Last verified: 2026-02-12, vite v5.4.21, zero errors.

---

## API Contract Diff

### GET /api/status

**New additive field** in `economy` response:

```javascript
economy.powerUnit: {
  todayPU: number,      // alias for todayEEU
  totalPU: number,      // alias for totals.eeu
  dailyCap: 2500,       // constant
  softStart: 1200,      // constant
  displayName: "PowerUnit",
  version: 1
}
```

All existing `economy.*` fields unchanged: `todayEEU`, `todayXP`, `todayCoins`, `totalXP`, `coinBalance`, `capRemaining`, `recentFlags`.

### POST /api/capture

**New additive fields** in response:

```javascript
economyEffect.deltaPU: number    // alias for deltaEEU (always set on ticket claims)
economy.powerUnit: { ... }       // same as /api/status
```

All existing `economyEffect.*` fields unchanged: `deltaEEU`, `deltaXP`, `deltaCoins`, `blocked`, `flags`, `focusMinutesEquivalent`, `progressDelta`.

### Economy Events (JSONL)

**New additive field** in `ticket.claim` payload:

```javascript
payload.deltaPU: number    // alias for deltaEEU
```

---

## Fallback Behavior

### Frontend → Old Server (forward compatibility)

If the server does not provide `economy.powerUnit` (e.g., running an older version):
- Monitor panel falls back: `economyView?.powerUnit?.todayPU ?? economyView?.todayEEU ?? 0`
- Economy effect box uses `deltaPU` directly (required field, always 0 via default)
- `EconomySnapshot.powerUnit` is optional (`PowerUnitInfo?`), so missing field causes no error

### New Server → Old Frontend (backward compatibility)

If the frontend does not expect `economy.powerUnit`:
- New fields are ignored by existing deserialization (JavaScript ignores unknown keys)
- `alfred_economy_cache_v1` may cache new fields but old code doesn't read them
- No runtime errors; old UI continues showing `todayEEU` values as before

---

## Backward Compatibility Checklist

| Item | Status | Detail |
|------|--------|--------|
| `alfred_workquest_v1` | UNCHANGED | No read/write changes to this localStorage key |
| `alfred_economy_cache_v1` | COMPATIBLE | New optional `powerUnit` field ignored by old code |
| `alfred_agent_mode_v1` | UNCHANGED | Not touched |
| `alfred_jarvis_toggle_v1` | UNCHANGED | Not touched |
| `alfred_chatui_message_log_v1` | UNCHANGED | Not touched |
| `legacy/` directory | NOT TOUCHED | Zero files in diff |
| Economy ledger format | UNCHANGED | Internal key remains `eeu`; PU computed at read time |
| Existing API consumers | COMPATIBLE | New fields are additive; old fields preserved |

---

## Implemented Items

All items implemented on branch `codex/powerunit-benchmark-slice`:

| Item | Commit | Details |
|------|--------|---------|
| PowerUnit benchmark document | `2fb6cb1` (docs) | `docs/economy/powerunit-benchmark.md` |
| PowerUnit benchmark JSON | `ce0448d` (chore) | `jarvis-workspace/data/system/game/powerunit-benchmark.json` |
| Habitica-PowerUnit economy spec | `2fb6cb1` (docs) | `docs/economy/habitica-powerunit-spec.md` |
| PowerUnit constants in backend | `8d5c256` (feat) | `POWERUNIT_DISPLAY_NAME`, `POWERUNIT_VERSION` in server-fixed.js |
| PowerUnit alias in `getEconomySnapshot()` | `8d5c256` (feat) | `economy.powerUnit` object with todayPU, totalPU, etc. |
| PowerUnit alias in `applyTicketEconomyClaim()` | `8d5c256` (feat) | `effect.deltaPU` alias for `deltaEEU` |
| PowerUnit alias in economy events | `8d5c256` (feat) | `payload.deltaPU` in JSONL entries |
| `PowerUnitInfo` type in frontend | `cd56f81` (feat) | Type definition in App.tsx |
| `EconomySnapshot.powerUnit` field | `cd56f81` (feat) | Optional, with fallback to todayEEU |
| `EconomyEffect.deltaPU` field | `fa84ff0` (fix) | Required (tightened from optional) |
| Monitor panel: "PowerUnit Economy" | `cd56f81` (feat) | Header + todayPU display |
| Economy effect box: PU label | `cd56f81` (feat) | Shows deltaPU value |
| Benchmark data corrections | `dbf0b64` (fix) | Line counts fixed for accuracy |
| Habitica spec improvements | `1cb3205` (docs) | Exact line references + deferral clarity |

## Deferred Items

| Item | Reason | Target Phase |
|------|--------|-------------|
| Server-side streak multiplier in PU claims | Formula stability in MVP | MVP+1 |
| Daily task type with missed-day penalty | Needs daily task model first | MVP+1 |
| HP/damage model | Negative consequences need careful tuning | MVP+1 |
| MP/skills system | Over-complex for single user | Indefinite |
| Client-side WorkQuest XP merge into server PU | Migration complexity | Next.js phase |
| Full Habitica-style task card UI | UX design in progress (Figma) | Next.js phase |
| Equipment/gear shop | No stat system to boost | MVP+2 |
| Enhanced quest progress tracking | Current byTicket sufficient for MVP | MVP+1 |

---

## File Changes Summary

| File | Change Type | Key Changes |
|------|------------|-------------|
| `docs/economy/powerunit-benchmark.md` | NEW | Scoring model, git history analysis, PU definition |
| `docs/economy/habitica-powerunit-spec.md` | NEW | Habitica mechanics mapped to Jarvis PU domain |
| `docs/economy/powerunit-validation.md` | NEW | This file — contract diff, compat checklist |
| `jarvis-workspace/data/system/game/powerunit-benchmark.json` | NEW | Machine-readable benchmark data |
| `alfred/server-fixed.js` | MODIFIED | +13 lines: PU constants, snapshot object, deltaPU alias |
| `chatui/src/App.tsx` | MODIFIED | +16/-5 lines: PowerUnitInfo type, PU display, tightened types |
| `Progress.md` | MODIFIED | Task start/completion log entries |
