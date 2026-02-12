/**
 * PowerUnit Economy Scoring Formula Tests
 *
 * Validates the three core scoring formulas from server-fixed.js:
 * - repeatFactor: diminishing returns per claim
 * - softFactor: anti-inflation soft slowdown
 * - XP/coins curves: logarithmic conversion
 *
 * Run: node alfred/economy-scoring.test.js
 */

// --- Constants (must match server-fixed.js lines 46-48) ---
const ECONOMY_DAILY_CAP = 2500;
const ECONOMY_SOFT_START = 1200;

// --- Formula implementations (extracted from server-fixed.js lines 349-387) ---

function repeatFactor(claimsToday) {
  return 1 / (1 + 0.15 * claimsToday);
}

function softFactor(dailyBefore) {
  if (dailyBefore > ECONOMY_SOFT_START) {
    return Math.max(0.30, 1 - ((dailyBefore - ECONOMY_SOFT_START) / (ECONOMY_DAILY_CAP - ECONOMY_SOFT_START)) * 0.70);
  }
  return 1.0;
}

function computeDeltaPU(plannedEEU, deltaProgress, claimsToday, dailyBefore) {
  const rawDelta = Math.round(plannedEEU * deltaProgress / 100);
  const rf = repeatFactor(claimsToday);
  const sf = softFactor(dailyBefore);
  let delta = Math.round(rawDelta * rf * sf);
  const capRemaining = Math.max(0, ECONOMY_DAILY_CAP - dailyBefore);
  if (delta > capRemaining) delta = capRemaining;
  if (delta < 0) delta = 0;
  return delta;
}

function computeXP(deltaPU) {
  const curve = Math.log(1 + deltaPU) / Math.log(1001);
  return Math.round(5 + 95 * curve);
}

function computeCoins(deltaPU) {
  const curve = Math.log(1 + deltaPU) / Math.log(1001);
  return Math.round(1 + 19 * curve);
}

function computeFocusMinutes(deltaPU) {
  return Math.round(deltaPU * 0.6);
}

// --- Test runner ---
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function assertClose(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) <= tolerance) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message} — expected ${expected} (±${tolerance}), got ${actual}`);
  }
}

// --- Tests ---

console.log('=== repeatFactor tests ===');

assert(repeatFactor(0) === 1.0, 'First claim: factor should be 1.0');
assertClose(repeatFactor(1), 1 / 1.15, 0.001, 'Second claim: ~0.87');
assertClose(repeatFactor(2), 1 / 1.30, 0.001, 'Third claim: ~0.77');
assertClose(repeatFactor(5), 1 / 1.75, 0.001, 'Sixth claim: ~0.57');
assertClose(repeatFactor(10), 1 / 2.50, 0.001, 'Eleventh claim: ~0.40');
assert(repeatFactor(100) > 0, 'High claims: still positive');
assert(repeatFactor(100) < 0.1, 'High claims: very small');

console.log('=== softFactor tests ===');

assert(softFactor(0) === 1.0, 'Zero daily: no slowdown');
assert(softFactor(600) === 1.0, 'Below soft start: no slowdown');
assert(softFactor(1200) === 1.0, 'At soft start: no slowdown');
assertClose(softFactor(1850), 0.65, 0.01, 'Midpoint: ~0.65');
assertClose(softFactor(2500), 0.30, 0.01, 'At cap: minimum 0.30');
assertClose(softFactor(3000), 0.30, 0.01, 'Above cap: clamped to 0.30');

console.log('=== computeDeltaPU tests ===');

// Basic claim: 100 PU planned, 50% progress, first claim, fresh day
assert(computeDeltaPU(100, 50, 0, 0) === 50, 'Basic: 100*50/100 = 50 PU');

// Anchor point: 100 PU = 60 min deep focus at 100% progress
assert(computeDeltaPU(100, 100, 0, 0) === 100, 'Anchor: 100 PU at 100%');

// Zero progress
assert(computeDeltaPU(100, 0, 0, 0) === 0, 'Zero progress: 0 PU');

// Max slider
assert(computeDeltaPU(1000, 100, 0, 0) === 1000, 'Max slider: 1000 PU');

// Diminishing returns
const first = computeDeltaPU(100, 100, 0, 0);
const second = computeDeltaPU(100, 100, 1, 0);
assert(second < first, 'Second claim less than first');

// Soft slowdown
const fresh = computeDeltaPU(200, 100, 0, 0);
const tired = computeDeltaPU(200, 100, 0, 1800);
assert(tired < fresh, 'Claim after 1800 PU less than fresh');

// Cap enforcement
const nearCap = computeDeltaPU(1000, 100, 0, 2400);
assert(nearCap <= 100, 'Near cap: clamped to remaining');
assert(nearCap > 0, 'Near cap: still positive');

// At cap
assert(computeDeltaPU(1000, 100, 0, 2500) === 0, 'At cap: zero PU');

// Above cap
assert(computeDeltaPU(1000, 100, 0, 3000) === 0, 'Above cap: zero PU');

console.log('=== XP curve tests ===');

assert(computeXP(0) === 5, 'Zero PU: minimum 5 XP');
assert(computeXP(1000) === 100, 'Max PU (1000): 100 XP');
assert(computeXP(100) > 5, '100 PU: more than minimum');
assert(computeXP(100) < 100, '100 PU: less than maximum');
assert(computeXP(500) > computeXP(100), 'XP increases with PU');

// Logarithmic: gains slow down at higher values
const xpGain_0_100 = computeXP(100) - computeXP(0);
const xpGain_900_1000 = computeXP(1000) - computeXP(900);
assert(xpGain_0_100 > xpGain_900_1000, 'XP curve is logarithmic (diminishing)');

console.log('=== Coins curve tests ===');

assert(computeCoins(0) === 1, 'Zero PU: minimum 1 coin');
assert(computeCoins(1000) === 20, 'Max PU (1000): 20 coins');
assert(computeCoins(100) > 1, '100 PU: more than minimum');
assert(computeCoins(100) < 20, '100 PU: less than maximum');
assert(computeCoins(500) > computeCoins(100), 'Coins increase with PU');

console.log('=== Focus minutes tests ===');

assert(computeFocusMinutes(100) === 60, 'Anchor: 100 PU = 60 min');
assert(computeFocusMinutes(0) === 0, 'Zero PU: 0 min');
assert(computeFocusMinutes(200) === 120, '200 PU: 120 min');
assert(computeFocusMinutes(50) === 30, '50 PU: 30 min');

console.log('=== Edge cases ===');

// Very small planned EEU
assert(computeDeltaPU(1, 100, 0, 0) === 1, 'Min slider: 1 PU');
assert(computeDeltaPU(1, 1, 0, 0) === 0, 'Min slider + 1%: rounds to 0');

// Combined anti-spam + anti-inflation
const combined = computeDeltaPU(500, 100, 5, 1800);
assert(combined > 0, 'Combined dampening: still positive');
assert(combined < 500, 'Combined dampening: less than raw planned');
assert(combined < 300, 'Combined dampening: significantly reduced (~193 expected)');

// --- Summary ---
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
