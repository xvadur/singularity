#!/usr/bin/env node

const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { execSync, spawnSync } = require('child_process');

const app = express();
const PORT = Number.parseInt(process.env.PORT || '3030', 10);
// Bind to IPv4 loopback so Cloudflare Tunnel can reliably reach it.
// (Using "localhost" can resolve to ::1 and break if the server isn't listening on IPv6.)
const HOST = process.env.HOST || '127.0.0.1';

const REPO_ROOT = path.join(__dirname, '..');
const DEFAULT_MONOREPO_WORKSPACE = path.join(REPO_ROOT, 'jarvis-workspace');
const LEGACY_WORKSPACE = path.join(process.env.HOME || '', '.openclaw', 'workspace');
const WORKSPACE = process.env.JARVIS_WORKSPACE
  ? path.resolve(process.env.JARVIS_WORKSPACE)
  : (fs.existsSync(DEFAULT_MONOREPO_WORKSPACE) ? DEFAULT_MONOREPO_WORKSPACE : LEGACY_WORKSPACE);
const DATA_DIR = path.join(WORKSPACE, 'data');
const CAPTURE_DIR = path.join(DATA_DIR, 'system', 'capture');
const CAPTURE_INBOX_PATH = path.join(CAPTURE_DIR, 'inbox.json');
const COMMAND_QUEUE_PATH = path.join(CAPTURE_DIR, 'commands.json');
const CHAT_JOURNAL_PATH = path.join(DATA_DIR, 'chat', 'chatui-events.jsonl');
const GAME_DIR = path.join(DATA_DIR, 'system', 'game');
const ECONOMY_LEDGER_PATH = path.join(GAME_DIR, 'economy-ledger.json');
const ECONOMY_EVENTS_PATH = path.join(GAME_DIR, 'economy-events.jsonl');
const CHAT_DIST_DIR = path.join(__dirname, '..', 'chatui', 'dist');
const LEGACY_UI_URL = process.env.LEGACY_UI_URL || 'http://127.0.0.1:5175';
const CAPTURE_TOKEN = process.env.CAPTURE_TOKEN || '';
const OPENCLAW_BIN = process.env.OPENCLAW_BIN || '';
const OPENCLAW_MJS = process.env.OPENCLAW_MJS || path.join(process.env.HOME || '', 'OPENCLAW', 'openclaw.mjs');
const OPENCLAW_DEFAULT_SESSION_KEY = process.env.OPENCLAW_SESSION_KEY || 'agent:main:main';
const OPENCLAW_TIMEOUT_MS = Number.parseInt(process.env.OPENCLAW_GATEWAY_TIMEOUT_MS || '90000', 10);
const JARVIS_INBOX_CRON_ENABLED = process.env.JARVIS_INBOX_CRON_ENABLED !== '0';
const JARVIS_INBOX_CRON_MS = clamp(
  Number.parseInt(process.env.JARVIS_INBOX_CRON_MS || String(3 * 60 * 60 * 1000), 10),
  60_000,
  24 * 60 * 60 * 1000
);
const JARVIS_INBOX_SESSION_KEY = process.env.JARVIS_INBOX_SESSION_KEY || OPENCLAW_DEFAULT_SESSION_KEY;
const JARVIS_INBOX_PROMPT = process.env.JARVIS_INBOX_PROMPT
  || 'Open capture inbox and pending command queue. Execute what is actionable, then summarize completed and pending actions.';
const ECONOMY_DAILY_CAP = 2500;
const ECONOMY_SOFT_START = 1200;
const ECONOMY_DAY_RESET_HOUR = 3;
const ECONOMY_MAX_DAYS = 45;
const ECONOMY_MAX_FLAGS = 120;
const ECONOMY_MAX_PURCHASES = 80;
const SHOP_TIERS = Object.freeze({
  micro: Object.freeze({ id: 'micro', name: 'Micro Reward', price: 40 }),
  standard: Object.freeze({ id: 'standard', name: 'Standard Reward', price: 120 }),
  major: Object.freeze({ id: 'major', name: 'Major Reward', price: 300 })
});
const LEGACY_TARGET = (() => {
  try {
    return new URL(LEGACY_UI_URL);
  } catch {
    return new URL('http://127.0.0.1:5175');
  }
})();

// Cache configuration
const CACHE_TTL_MS = 30000;
let cache = {
  data: null,
  timestamp: 0,
  isRefreshing: false
};

// Read JSON file safely
function readJSON(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.warn(`Failed to read ${filePath}:`, e.message);
  }
  return null;
}

function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const tmpPath = path.join(dir, `.${base}.tmp.${process.pid}.${Date.now()}`);
  fs.writeFileSync(tmpPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function ensureDirSync(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function appendJsonl(filePath, row) {
  const dir = path.dirname(filePath);
  ensureDirSync(dir);
  fs.appendFileSync(filePath, `${JSON.stringify(row)}\n`, 'utf8');
}

function defaultCaptureInboxDoc() {
  return { inbox: [], autoRules: [], captureStats: {}, settings: {} };
}

function defaultCommandQueueDoc() {
  return {
    queue: [],
    stats: {
      totalQueued: 0,
      pending: 0,
      byCommand: {},
      lastQueuedAt: null
    }
  };
}

function localDateKey(date) {
  const d = (date instanceof Date) ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function economyDayKey(now) {
  const d = (now instanceof Date) ? now : new Date(now);
  const shifted = new Date(d.getTime() - ECONOMY_DAY_RESET_HOUR * 60 * 60 * 1000);
  return localDateKey(shifted);
}

function defaultEconomyLedgerDoc() {
  return {
    version: 1,
    totals: { eeu: 0, xp: 0, coins: 0 },
    coinBalance: 0,
    byDay: {},
    recentFlags: [],
    recentPurchases: [],
    lastDailyRollKey: null,
    updatedAt: null
  };
}

function normalizeEconomyLedger(doc) {
  const base = defaultEconomyLedgerDoc();
  if (!doc || typeof doc !== 'object') return base;

  const totals = (doc.totals && typeof doc.totals === 'object') ? doc.totals : {};
  const normalized = {
    version: Number(doc.version || 1),
    totals: {
      eeu: Math.max(0, Number(totals.eeu || 0)),
      xp: Math.max(0, Number(totals.xp || 0)),
      coins: Math.max(0, Number(totals.coins || 0))
    },
    coinBalance: Math.max(0, Number(doc.coinBalance || 0)),
    byDay: (doc.byDay && typeof doc.byDay === 'object') ? doc.byDay : {},
    recentFlags: Array.isArray(doc.recentFlags) ? doc.recentFlags : [],
    recentPurchases: Array.isArray(doc.recentPurchases) ? doc.recentPurchases : [],
    lastDailyRollKey: (typeof doc.lastDailyRollKey === 'string' && doc.lastDailyRollKey) ? doc.lastDailyRollKey : null,
    updatedAt: (typeof doc.updatedAt === 'string' && doc.updatedAt) ? doc.updatedAt : null
  };

  return normalized;
}

function readEconomyLedger() {
  return normalizeEconomyLedger(readJSON(ECONOMY_LEDGER_PATH));
}

function writeEconomyLedger(ledger, nowIso) {
  const next = normalizeEconomyLedger(ledger);
  next.updatedAt = nowIso || new Date().toISOString();
  writeJsonAtomic(ECONOMY_LEDGER_PATH, next);
  return next;
}

function getEconomyDayDoc(ledger, dayKey) {
  if (!ledger.byDay || typeof ledger.byDay !== 'object') ledger.byDay = {};
  const existing = ledger.byDay[dayKey];
  if (existing && typeof existing === 'object') {
    existing.eeu = Math.max(0, Number(existing.eeu || 0));
    existing.xp = Math.max(0, Number(existing.xp || 0));
    existing.coins = Number(existing.coins || 0);
    if (!existing.byTicket || typeof existing.byTicket !== 'object') existing.byTicket = {};
    if (!Array.isArray(existing.flags)) existing.flags = [];
    return existing;
  }

  const created = {
    eeu: 0,
    xp: 0,
    coins: 0,
    byTicket: {},
    flags: [],
    lastUpdatedAt: null
  };
  ledger.byDay[dayKey] = created;
  return created;
}

function trimEconomyLedger(ledger) {
  const keys = Object.keys(ledger.byDay || {}).sort();
  while (keys.length > ECONOMY_MAX_DAYS) {
    const oldKey = keys.shift();
    if (!oldKey) break;
    delete ledger.byDay[oldKey];
  }
  if (Array.isArray(ledger.recentFlags) && ledger.recentFlags.length > ECONOMY_MAX_FLAGS) {
    ledger.recentFlags = ledger.recentFlags.slice(-ECONOMY_MAX_FLAGS);
  }
  if (Array.isArray(ledger.recentPurchases) && ledger.recentPurchases.length > ECONOMY_MAX_PURCHASES) {
    ledger.recentPurchases = ledger.recentPurchases.slice(-ECONOMY_MAX_PURCHASES);
  }
}

function pushEconomyFlag(ledger, dayDoc, flag, nowIso, detail) {
  const row = {
    id: `flag-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    flag,
    ts: nowIso,
    detail: detail || null
  };
  dayDoc.flags.push(row);
  ledger.recentFlags.push(row);
  return row;
}

function defaultEconomyEffect() {
  return {
    deltaEEU: 0,
    deltaXP: 0,
    deltaCoins: 0,
    blocked: false,
    flags: [],
    focusMinutesEquivalent: 0,
    progressDelta: 0
  };
}

function parseTicketMeta(meta) {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  const ticket = (meta.ticket && typeof meta.ticket === 'object' && !Array.isArray(meta.ticket)) ? meta.ticket : null;
  if (!ticket) return null;

  const ticketId = sanitizeThreadId(ticket.ticketId || ticket.id || '');
  const plannedEEURaw = Number(ticket.plannedEEU);
  const progressRaw = Number(ticket.progressPct);
  if (!ticketId || !Number.isFinite(plannedEEURaw) || !Number.isFinite(progressRaw)) return null;

  const taskType = String(ticket.taskType || 'todo').toLowerCase().slice(0, 32);
  const note = (typeof ticket.note === 'string' && ticket.note.trim()) ? ticket.note.trim().slice(0, 300) : null;

  return {
    ticketId,
    plannedEEU: clamp(Math.round(plannedEEURaw), 1, 1000),
    progressPct: clamp(Math.round(progressRaw), 0, 100),
    taskType: taskType || 'todo',
    note
  };
}

function parseShopPurchaseMeta(meta) {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  const raw = (meta.shopPurchase && typeof meta.shopPurchase === 'object' && !Array.isArray(meta.shopPurchase))
    ? meta.shopPurchase
    : null;
  if (!raw) return null;
  const tier = String(raw.tier || '').trim().toLowerCase();
  if (!tier || !SHOP_TIERS[tier]) return null;
  return { tier };
}

function getEconomySnapshot(ledger, now) {
  const resolved = normalizeEconomyLedger(ledger);
  const dayKey = economyDayKey(now || new Date());
  const today = getEconomyDayDoc(resolved, dayKey);
  return {
    todayEEU: Math.max(0, Number(today.eeu || 0)),
    todayXP: Math.max(0, Number(today.xp || 0)),
    todayCoins: Number(today.coins || 0),
    totalXP: Math.max(0, Number(resolved.totals.xp || 0)),
    coinBalance: Math.max(0, Number(resolved.coinBalance || 0)),
    capRemaining: Math.max(0, ECONOMY_DAILY_CAP - Math.max(0, Number(today.eeu || 0))),
    recentFlags: (resolved.recentFlags || []).slice(-6).reverse().map(flag => ({
      flag: flag?.flag || 'manual_review',
      ts: flag?.ts || null,
      detail: flag?.detail || null
    }))
  };
}

function applyTicketEconomyClaim(ledger, ticketMeta, now) {
  const effect = defaultEconomyEffect();
  if (!ticketMeta) return effect;

  const nowDate = (now instanceof Date) ? now : new Date(now || Date.now());
  const nowIso = nowDate.toISOString();
  const dayKey = economyDayKey(nowDate);
  const dayDoc = getEconomyDayDoc(ledger, dayKey);
  const byTicket = (dayDoc.byTicket && typeof dayDoc.byTicket === 'object') ? dayDoc.byTicket : {};
  dayDoc.byTicket = byTicket;

  const current = (byTicket[ticketMeta.ticketId] && typeof byTicket[ticketMeta.ticketId] === 'object')
    ? byTicket[ticketMeta.ticketId]
    : {
      lastProgressPct: 0,
      claims: 0,
      awardedEEU: 0,
      taskType: ticketMeta.taskType,
      plannedEEU: ticketMeta.plannedEEU,
      lastClaimAt: null
    };

  const prevProgress = clamp(Number(current.lastProgressPct || 0), 0, 100);
  const nextProgress = clamp(Number(ticketMeta.progressPct || 0), 0, 100);
  const deltaProgress = Math.max(0, nextProgress - prevProgress);
  effect.progressDelta = deltaProgress;

  const dailyBefore = Math.max(0, Number(dayDoc.eeu || 0));
  const sameTaskClaimsToday = Math.max(0, Number(current.claims || 0));
  const flags = [];

  if (ticketMeta.plannedEEU >= 900) {
    flags.push('high_slider');
    pushEconomyFlag(ledger, dayDoc, 'high_slider', nowIso, `${ticketMeta.ticketId}:${ticketMeta.plannedEEU}`);
  }

  if (dailyBefore >= ECONOMY_DAILY_CAP) {
    effect.blocked = true;
    flags.push('cap_reached');
    pushEconomyFlag(ledger, dayDoc, 'cap_reached', nowIso, ticketMeta.ticketId);
    effect.flags = flags;
    return effect;
  }

  const rawDelta = Math.round(ticketMeta.plannedEEU * deltaProgress / 100);
  const repeatFactor = 1 / (1 + 0.15 * sameTaskClaimsToday);
  let softFactor = 1;
  if (dailyBefore > ECONOMY_SOFT_START) {
    softFactor = Math.max(0.30, 1 - ((dailyBefore - ECONOMY_SOFT_START) / (ECONOMY_DAILY_CAP - ECONOMY_SOFT_START)) * 0.70);
  }

  let deltaEEU = Math.round(rawDelta * repeatFactor * softFactor);
  const capRemaining = Math.max(0, ECONOMY_DAILY_CAP - dailyBefore);
  if (deltaEEU > capRemaining) {
    deltaEEU = capRemaining;
    flags.push('cap_reached');
    pushEconomyFlag(ledger, dayDoc, 'cap_reached', nowIso, `${ticketMeta.ticketId}:clamped`);
  }

  if (sameTaskClaimsToday >= 5) {
    flags.push('rapid_claims');
    pushEconomyFlag(ledger, dayDoc, 'rapid_claims', nowIso, ticketMeta.ticketId);
  }

  if (ticketMeta.plannedEEU >= 900 && sameTaskClaimsToday >= 3) {
    flags.push('manual_review');
    pushEconomyFlag(ledger, dayDoc, 'manual_review', nowIso, ticketMeta.ticketId);
  }

  if (deltaEEU <= 0) {
    current.lastProgressPct = Math.max(prevProgress, nextProgress);
    current.plannedEEU = ticketMeta.plannedEEU;
    current.taskType = ticketMeta.taskType;
    current.lastClaimAt = nowIso;
    byTicket[ticketMeta.ticketId] = current;
    effect.flags = flags;
    return effect;
  }

  const curve = Math.log(1 + deltaEEU) / Math.log(1001);
  const deltaXP = Math.round(5 + 95 * curve);
  const deltaCoins = Math.round(1 + 19 * curve);
  const focusMinutesEquivalent = Math.round(deltaEEU * 0.6);

  dayDoc.eeu = dailyBefore + deltaEEU;
  dayDoc.xp = Math.max(0, Number(dayDoc.xp || 0)) + deltaXP;
  dayDoc.coins = Number(dayDoc.coins || 0) + deltaCoins;
  dayDoc.lastUpdatedAt = nowIso;

  ledger.totals.eeu = Math.max(0, Number(ledger.totals.eeu || 0)) + deltaEEU;
  ledger.totals.xp = Math.max(0, Number(ledger.totals.xp || 0)) + deltaXP;
  ledger.totals.coins = Math.max(0, Number(ledger.totals.coins || 0)) + deltaCoins;
  ledger.coinBalance = Math.max(0, Number(ledger.coinBalance || 0)) + deltaCoins;

  current.lastProgressPct = Math.max(prevProgress, nextProgress);
  current.claims = sameTaskClaimsToday + 1;
  current.awardedEEU = Math.max(0, Number(current.awardedEEU || 0)) + deltaEEU;
  current.plannedEEU = ticketMeta.plannedEEU;
  current.taskType = ticketMeta.taskType;
  current.lastClaimAt = nowIso;
  byTicket[ticketMeta.ticketId] = current;

  effect.deltaEEU = deltaEEU;
  effect.deltaXP = deltaXP;
  effect.deltaCoins = deltaCoins;
  effect.focusMinutesEquivalent = focusMinutesEquivalent;
  effect.flags = flags;

  appendJsonl(ECONOMY_EVENTS_PATH, {
    id: `econ-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    ts: nowIso,
    type: 'ticket.claim',
    payload: {
      ticketId: ticketMeta.ticketId,
      taskType: ticketMeta.taskType,
      plannedEEU: ticketMeta.plannedEEU,
      progressPct: nextProgress,
      deltaProgress,
      deltaEEU,
      deltaXP,
      deltaCoins,
      flags
    }
  });

  return effect;
}

function applyShopPurchase(ledger, purchaseMeta, now) {
  if (!purchaseMeta) return null;

  const tier = SHOP_TIERS[purchaseMeta.tier];
  if (!tier) return null;

  const nowDate = (now instanceof Date) ? now : new Date(now || Date.now());
  const nowIso = nowDate.toISOString();
  const dayKey = economyDayKey(nowDate);
  const dayDoc = getEconomyDayDoc(ledger, dayKey);
  const currentBalance = Math.max(0, Number(ledger.coinBalance || 0));
  const canBuy = currentBalance >= tier.price;

  if (!canBuy) {
    pushEconomyFlag(ledger, dayDoc, 'manual_review', nowIso, `shop:${tier.id}:insufficient`);
    appendJsonl(ECONOMY_EVENTS_PATH, {
      id: `econ-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
      ts: nowIso,
      type: 'shop.purchase_blocked',
      payload: {
        tier: tier.id,
        price: tier.price,
        coinBalance: currentBalance
      }
    });
    return {
      ok: false,
      tier: tier.id,
      name: tier.name,
      price: tier.price,
      coinBalance: currentBalance,
      reason: 'insufficient_coins'
    };
  }

  ledger.coinBalance = currentBalance - tier.price;
  dayDoc.coins = Number(dayDoc.coins || 0) - tier.price;
  ledger.recentPurchases.push({
    id: `shop-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    ts: nowIso,
    tier: tier.id,
    name: tier.name,
    price: tier.price
  });

  appendJsonl(ECONOMY_EVENTS_PATH, {
    id: `econ-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    ts: nowIso,
    type: 'shop.purchase',
    payload: {
      tier: tier.id,
      name: tier.name,
      price: tier.price,
      coinBalanceAfter: ledger.coinBalance
    }
  });

  return {
    ok: true,
    tier: tier.id,
    name: tier.name,
    price: tier.price,
    coinBalance: ledger.coinBalance
  };
}

function performEconomyDailyRollIfNeeded(now) {
  const nowDate = (now instanceof Date) ? now : new Date(now || Date.now());
  const rollKey = economyDayKey(nowDate);
  const ledger = readEconomyLedger();
  if (ledger.lastDailyRollKey === rollKey) {
    return ledger;
  }

  const previousKey = ledger.lastDailyRollKey;
  ledger.lastDailyRollKey = rollKey;
  trimEconomyLedger(ledger);
  const updated = writeEconomyLedger(ledger, nowDate.toISOString());

  appendJsonl(ECONOMY_EVENTS_PATH, {
    id: `econ-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    ts: nowDate.toISOString(),
    type: 'daily.roll',
    payload: {
      rollKey,
      previousKey
    }
  });

  cache.timestamp = 0;
  return updated;
}

function parseSlashCommand(rawInput) {
  const input = String(rawInput || '').trim();
  if (!input.startsWith('/')) return null;

  const match = input.match(/^\/([a-z0-9_-]+)(?:\s+([\s\S]*))?$/i);
  if (!match) return null;

  return {
    name: String(match[1]).toLowerCase(),
    args: String(match[2] || '').trim(),
    raw: input
  };
}

function enqueueJarvisCommand(command) {
  let doc = readJSON(COMMAND_QUEUE_PATH);
  if (!doc || typeof doc !== 'object') doc = defaultCommandQueueDoc();
  if (!Array.isArray(doc.queue)) doc.queue = [];
  if (!doc.stats || typeof doc.stats !== 'object') doc.stats = {};
  if (!doc.stats.byCommand || typeof doc.stats.byCommand !== 'object') doc.stats.byCommand = {};

  doc.queue.unshift(command);
  doc.queue = doc.queue.slice(0, 1000);

  const cmdName = String(command?.command || 'unknown');
  doc.stats.totalQueued = Number(doc.stats.totalQueued || 0) + 1;
  doc.stats.byCommand[cmdName] = Number(doc.stats.byCommand[cmdName] || 0) + 1;
  doc.stats.pending = doc.queue.filter(item => item?.status !== 'processed').length;
  doc.stats.lastQueuedAt = command?.createdAt || new Date().toISOString();

  writeJsonAtomic(COMMAND_QUEUE_PATH, doc);
}

function bootstrapWorkspaceFiles() {
  ensureDirSync(CAPTURE_DIR);
  ensureDirSync(path.dirname(CHAT_JOURNAL_PATH));
  ensureDirSync(GAME_DIR);

  if (!fs.existsSync(CAPTURE_INBOX_PATH)) {
    writeJsonAtomic(CAPTURE_INBOX_PATH, defaultCaptureInboxDoc());
  }

  if (!fs.existsSync(COMMAND_QUEUE_PATH)) {
    writeJsonAtomic(COMMAND_QUEUE_PATH, defaultCommandQueueDoc());
  }

  if (!fs.existsSync(ECONOMY_LEDGER_PATH)) {
    const initial = defaultEconomyLedgerDoc();
    initial.lastDailyRollKey = economyDayKey(new Date());
    writeJsonAtomic(ECONOMY_LEDGER_PATH, initial);
  }

  if (!fs.existsSync(ECONOMY_EVENTS_PATH)) {
    fs.writeFileSync(ECONOMY_EVENTS_PATH, '', 'utf8');
  }
}

function getPendingJarvisWork() {
  const inboxDoc = readJSON(CAPTURE_INBOX_PATH) || defaultCaptureInboxDoc();
  const commandDoc = readJSON(COMMAND_QUEUE_PATH) || defaultCommandQueueDoc();

  const inboxList = Array.isArray(inboxDoc.inbox) ? inboxDoc.inbox : [];
  const cmdList = Array.isArray(commandDoc.queue) ? commandDoc.queue : [];

  const inboxPending = inboxDoc?.captureStats?.pending != null
    ? Number(inboxDoc.captureStats.pending || 0)
    : inboxList.filter(item => !item?.processed).length;
  const commandsPending = commandDoc?.stats?.pending != null
    ? Number(commandDoc.stats.pending || 0)
    : cmdList.filter(item => item?.status !== 'processed').length;

  return {
    inboxPending: Number.isNaN(inboxPending) ? 0 : Math.max(0, inboxPending),
    commandsPending: Number.isNaN(commandsPending) ? 0 : Math.max(0, commandsPending)
  };
}

function triggerJarvisInboxProcessing(reason, force) {
  const counts = getPendingJarvisWork();
  if (!force && counts.inboxPending <= 0 && counts.commandsPending <= 0) {
    return {
      ok: true,
      skipped: true,
      reason: 'no-pending-work',
      counts
    };
  }

  const nowIso = new Date().toISOString();
  const message = [
    JARVIS_INBOX_PROMPT,
    `Reason: ${reason || 'manual'}.`,
    `Inbox pending: ${counts.inboxPending}.`,
    `Commands pending: ${counts.commandsPending}.`,
    'After processing, write a concise summary.'
  ].join(' ');

  const send = openclawGatewayCall(
    'chat.send',
    {
      sessionKey: JARVIS_INBOX_SESSION_KEY,
      message,
      idempotencyKey: `jarvis-inbox-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
    },
    OPENCLAW_TIMEOUT_MS
  );
  const runId = send?.runId || null;

  if (runId) {
    safeGatewayCall('agent.wait', { runId }, Math.min(OPENCLAW_TIMEOUT_MS, 60_000));
  }

  return {
    ok: true,
    skipped: false,
    runId,
    sessionKey: JARVIS_INBOX_SESSION_KEY,
    triggeredAt: nowIso,
    counts
  };
}

function incrementCaptureStats(doc, newItem) {
  if (!doc || typeof doc !== 'object') return;
  if (!doc.captureStats || typeof doc.captureStats !== 'object') doc.captureStats = {};
  if (!doc.captureStats.bySource || typeof doc.captureStats.bySource !== 'object') doc.captureStats.bySource = {};
  if (!doc.captureStats.byType || typeof doc.captureStats.byType !== 'object') doc.captureStats.byType = {};

  const total = Number(doc.captureStats.totalCaptured || 0);
  const processed = Number(doc.captureStats.processed || 0);

  // If pending isn't present, mirror current unprocessed items count (which already
  // includes the just-added item) instead of incrementing twice.
  const inferredPending = Array.isArray(doc.inbox) ? doc.inbox.filter(i => !i?.processed).length : 0;
  const hasPending = doc.captureStats.pending != null && !Number.isNaN(Number(doc.captureStats.pending));
  const pending = hasPending ? Number(doc.captureStats.pending || 0) + 1 : inferredPending;

  doc.captureStats.totalCaptured = total + 1;
  doc.captureStats.processed = processed;
  doc.captureStats.pending = pending;

  const src = String(newItem?.source || 'manual');
  doc.captureStats.bySource[src] = Number(doc.captureStats.bySource[src] || 0) + 1;

  const type = String(newItem?.type || 'note');
  doc.captureStats.byType[type] = Number(doc.captureStats.byType[type] || 0) + 1;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function safeReadText(filePath, maxBytes) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const data = fs.readFileSync(filePath);
    const slice = (typeof maxBytes === 'number' && maxBytes > 0) ? data.subarray(0, maxBytes) : data;
    return slice.toString('utf8');
  } catch (e) {
    console.warn(`Failed to read text ${filePath}:`, e.message);
    return null;
  }
}

function listJsonFilesSortedByName(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return [];
    const files = fs.readdirSync(dirPath)
      .filter(f => f.endsWith('.json'))
      .sort();
    return files.map(f => path.join(dirPath, f));
  } catch (e) {
    console.warn(`Failed to list ${dirPath}:`, e.message);
    return [];
  }
}

function getLatestDailySnapshotPath() {
  const dailyDir = path.join(DATA_DIR, 'snapshots', 'daily');
  const files = listJsonFilesSortedByName(dailyDir);
  if (!files.length) return null;
  return files[files.length - 1];
}

function normalizeEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;

  // v2 schema (unification events jsonl)
  if (raw.ts || raw.domain || raw.type) {
    return {
      id: raw.id || null,
      ts: raw.ts || null,
      domain: raw.domain || null,
      type: raw.type || null,
      source: raw.source || null,
      text: raw.text || null,
      payload: raw.payload || null,
      tags: raw.tags || null
    };
  }

  // legacy schema (cli events)
  if (raw.timestamp || raw.category || raw.tags) {
    return {
      id: raw.id || null,
      ts: raw.timestamp || null,
      domain: raw.category || null,
      type: (Array.isArray(raw.tags) && raw.tags.length) ? raw.tags[0] : null,
      source: raw.source || null,
      text: raw.text || null,
      payload: raw.metadata || null,
      tags: raw.tags || null
    };
  }

  return {
    id: raw.id || null,
    ts: raw.ts || raw.timestamp || null,
    domain: raw.domain || raw.category || null,
    type: raw.type || null,
    source: raw.source || null,
    text: raw.text || null,
    payload: raw.payload || raw.metadata || null,
    tags: raw.tags || null
  };
}

function readEventsTailForDate(dateStr, maxLines) {
  const filePath = path.join(DATA_DIR, 'events', `${dateStr}.jsonl`);
  const text = safeReadText(filePath, 256 * 1024); // enough for small daily logs
  if (!text) return [];
  const lines = text.trim().split('\n').filter(Boolean);
  const tail = (typeof maxLines === 'number' && maxLines > 0) ? lines.slice(-maxLines) : lines;
  const events = [];
  for (const line of tail) {
    try {
      const raw = JSON.parse(line);
      const evt = normalizeEvent(raw);
      if (evt) events.push(evt);
    } catch (e) {
      // ignore malformed line
    }
  }
  return events;
}

function safeExecJson(cmd, timeoutMs) {
  try {
    const output = execSync(cmd, { encoding: 'utf8', timeout: timeoutMs || 4000, stdio: ['ignore', 'pipe', 'ignore'] });
    return JSON.parse(output);
  } catch (e) {
    return null;
  }
}

const OPENCLAW_COMMAND = (() => {
  if (OPENCLAW_BIN) {
    return { cmd: OPENCLAW_BIN, baseArgs: [] };
  }
  if (fs.existsSync(OPENCLAW_MJS)) {
    return { cmd: process.execPath || 'node', baseArgs: [OPENCLAW_MJS] };
  }
  return { cmd: 'openclaw', baseArgs: [] };
})();

function openclawGatewayCall(method, params, timeoutMs) {
  const safeTimeout = Math.max(1000, Number(timeoutMs || 10000));
  const args = [
    ...OPENCLAW_COMMAND.baseArgs,
    'gateway',
    'call',
    method,
    '--json',
    '--timeout',
    String(safeTimeout),
    '--params',
    JSON.stringify(params || {})
  ];

  const result = spawnSync(OPENCLAW_COMMAND.cmd, args, {
    encoding: 'utf8',
    timeout: safeTimeout + 2000,
    maxBuffer: 8 * 1024 * 1024
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = String(result.stderr || '').trim();
    const stdout = String(result.stdout || '').trim();
    throw new Error(stderr || stdout || `openclaw gateway call failed (${result.status})`);
  }

  const stdout = String(result.stdout || '').trim();
  if (!stdout) return null;
  return JSON.parse(stdout);
}

function safeGatewayCall(method, params, timeoutMs) {
  try {
    return openclawGatewayCall(method, params, timeoutMs);
  } catch (error) {
    console.warn(`Gateway call failed for ${method}:`, error.message);
    return null;
  }
}

function sanitizeThreadId(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function resolveJarvisSessionKey(inputSessionKey, threadId) {
  const explicit = String(inputSessionKey || '').trim();
  if (explicit && /^[a-zA-Z0-9:_-]{1,180}$/.test(explicit)) {
    return explicit;
  }

  const cleanedThread = sanitizeThreadId(threadId);
  if (cleanedThread) {
    return `agent:main:webchat:${cleanedThread}`;
  }

  return OPENCLAW_DEFAULT_SESSION_KEY;
}

function extractTextFromContent(content) {
  if (!Array.isArray(content)) return '';
  return content
    .filter(part => part && typeof part === 'object' && part.type === 'text' && typeof part.text === 'string')
    .map(part => part.text.trim())
    .filter(Boolean)
    .join('\n');
}

function extractLatestAssistantText(messages, startIndex) {
  if (!Array.isArray(messages) || !messages.length) return '';

  const safeStart = Math.max(0, Number(startIndex || 0));
  for (let i = messages.length - 1; i >= safeStart; i -= 1) {
    const msg = messages[i];
    if (msg?.role !== 'assistant') continue;
    const text = extractTextFromContent(msg.content);
    if (text) return text;
  }

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg?.role !== 'assistant') continue;
    const text = extractTextFromContent(msg.content);
    if (text) return text;
  }

  return '';
}

// Fetch fresh data from workspace files
async function fetchStatusData() {
  try {
    const now = new Date();
    performEconomyDailyRollIfNeeded(now);
    const economyLedger = readEconomyLedger();
    const economySnapshot = getEconomySnapshot(economyLedger, now);

    // Read player data
    const player = readJSON(path.join(DATA_DIR, 'xp', 'player.json'));
    const quests = readJSON(path.join(DATA_DIR, 'xp', 'quests.json'));
    const tasks = readJSON(path.join(DATA_DIR, 'system', 'tasks', 'active.json'));
    const captureInbox = readJSON(path.join(DATA_DIR, 'system', 'capture', 'inbox.json'));
    const commandQueue = readJSON(COMMAND_QUEUE_PATH);
    // Get daily log files
    const memoryDir = path.join(WORKSPACE, 'memory');
    const today = now.toISOString().split('T')[0];
    const todayLogPath = path.join(memoryDir, `${today}.md`);
    const todayLogExists = fs.existsSync(todayLogPath);

    // Snapshots (preferred for vitality summary)
    const latestDailySnapshotPath = getLatestDailySnapshotPath();
    const latestDailySnapshot = latestDailySnapshotPath ? readJSON(latestDailySnapshotPath) : null;
    const week = (() => {
      // Prefer the week snapshot key if present, else fallback to config.
      const weeklyDir = path.join(DATA_DIR, 'snapshots', 'weekly');
      const files = listJsonFilesSortedByName(weeklyDir);
      if (!files.length) return null;
      return readJSON(files[files.length - 1]);
    })();
    const vitality = week?.vitality || null;

    // Life layer
    const lifeMasterLog = readJSON(path.join(DATA_DIR, 'life', 'master-log.json'));
    const sleepStats = readJSON(path.join(DATA_DIR, 'life', 'sleep', 'stats.json'));
    const exerciseStats = readJSON(path.join(DATA_DIR, 'life', 'exercise', 'stats.json'));
    const nutritionStats = readJSON(path.join(DATA_DIR, 'life', 'nutrition', 'stats.json'));

    // Read recent sessions from tracker files
    const trackerFiles = [
      path.join(DATA_DIR, 'UNIFICATION_SWARM_TRACKER.json'),
      path.join(DATA_DIR, 'audit-reports', 'FINAL_AUDIT_2026-02-10.md')
    ];

    // Active quests
    const activeQuests = quests?.quests?.filter(q =>
      q.status === 'in_progress' || q.status === 'pending'
    ) || [];

    // Active tasks
    const activeTasks = tasks?.tasks?.filter(t =>
      t.status !== 'completed'
    ) || [];

    // Calculate stats
    const totalXP = player?.player?.totalXP || 0;
    const level = player?.player?.level || 1;
    const streak = player?.player?.streakDays || 0;

    // Milestones and overview data
    const milestonesFromQuests = activeQuests.map(q => ({
      id: q?.id,
      type: 'quest',
      name: q?.name,
      deadline: q?.deadline,
      status: q?.status,
      progress: q?.progress,
      xpReward: q?.xpReward
    }));
    const milestonesFromTasks = activeTasks.map(t => ({
      id: t?.id,
      type: 'task',
      name: t?.title,
      dueDate: t?.dueDate,
      status: t?.status,
      xpReward: 0
    }));
    const achievementsUnlocked = (player?.player?.achievements?.unlocked) || (player?.achievements?.unlocked) || [];
    const milestonesFromAchievements = achievementsUnlocked.map(a => ({
      id: a?.id,
      type: 'milestone',
      name: a?.name,
      date: a?.date,
      description: a?.description,
      xpBonus: a?.xpBonus
    }));
    const allMilestones = [...milestonesFromQuests, ...milestonesFromTasks, ...milestonesFromAchievements];
    const milestonesLimited = allMilestones.slice(0, 8);
    const overview = {
      totalXP: totalXP,
      xpToNext: player?.player?.xpToNext || 0,
      streakDays: streak,
      openTasks: activeTasks.length,
      milestones: milestonesLimited,
      vitalityScore: vitality?.score ?? null,
      vitalityBand: vitality?.band ?? null,
      inboxPending: captureInbox?.captureStats?.pending ?? (captureInbox?.inbox?.filter(i => !i.processed).length ?? null),
      pendingCommands: commandQueue?.stats?.pending ?? (commandQueue?.queue?.filter(i => i?.status !== 'processed').length ?? null)
    };

    const eventsRecent = readEventsTailForDate(today, 50);

    const openclawSessions =
      safeGatewayCall('sessions.list', {}, 6000) ||
      safeExecJson('openclaw sessions list --json', 4000);
    const openclawCrons =
      safeGatewayCall('cron.list', {}, 6000) ||
      safeExecJson('openclaw cron list --json', 4000);

    return {
      timestamp: now.toISOString(),
      player: {
        name: player?.player?.name || 'Adam',
        handle: player?.player?.handle || 'XVADUR',
        level: level,
        title: player?.player?.title || 'Closer',
        totalXP: totalXP,
        xpToNext: player?.player?.xpToNext || 0,
        streak: streak
      },
      stats: player?.stats || {},
      quests: {
        active: activeQuests.length,
        list: activeQuests.map(q => ({
          id: q.id,
          name: q.name,
          priority: q.priority,
          progress: q.progress,
          deadline: q.deadline,
          status: q.status
        }))
      },
      tasks: {
        total: activeTasks.length,
        critical: activeTasks.filter(t => t.priority === 'critical').length,
        high: activeTasks.filter(t => t.priority === 'high').length,
        list: activeTasks.slice(0, 5).map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          dueDate: t.dueDate,
          status: t.status
        }))
      },
      inbox: {
        pending: captureInbox?.captureStats?.pending ?? null,
        totalCaptured: captureInbox?.captureStats?.totalCaptured ?? null,
        list: (captureInbox?.inbox || []).filter(i => !i.processed).slice(0, 6).map(i => ({
          id: i.id,
          type: i.type,
          content: i.content,
          capturedAt: i.capturedAt,
          priority: i.priority,
          tags: i.tags || [],
          meta: (i.meta && typeof i.meta === 'object') ? i.meta : null
        }))
      },
      commands: {
        pending: commandQueue?.stats?.pending ?? null,
        totalQueued: commandQueue?.stats?.totalQueued ?? null,
        list: (commandQueue?.queue || []).filter(i => i?.status !== 'processed').slice(0, 6).map(i => ({
          id: i?.id || null,
          command: i?.command || null,
          args: i?.args || '',
          source: i?.source || null,
          createdAt: i?.createdAt || null,
          status: i?.status || 'pending'
        }))
      },
      vitality: vitality ? {
        score: vitality.score,
        band: vitality.band,
        drivers: vitality.drivers,
        driver_breakdown: vitality.driver_breakdown,
        trend: vitality.trend
      } : null,
      life: {
        masterLogEntries: Array.isArray(lifeMasterLog?.entries) ? lifeMasterLog.entries.length : null,
        lastEntry: Array.isArray(lifeMasterLog?.entries) ? (lifeMasterLog.entries[lifeMasterLog.entries.length - 1] || null) : null,
        sleep: sleepStats || null,
        exercise: exerciseStats || null,
        nutrition: nutritionStats || null
      },
      events: {
        date: today,
        count: eventsRecent.length,
        recent: eventsRecent
      },
      openclaw: {
        sessions: Array.isArray(openclawSessions?.sessions) ? openclawSessions.sessions.map(s => ({
          id: s.id,
          name: s.name,
          status: s.status || 'unknown',
          runtime: s.runtime || '0s',
          tokens: s.tokens || '0',
          task: s.task || ''
        })) : [],
        crons: Array.isArray(openclawCrons?.crons) ? openclawCrons.crons : []
      },
      snapshots: {
        latestDailyPath: latestDailySnapshotPath,
        latestDaily: latestDailySnapshot || null,
        latestWeekly: week || null
      },
      systems: {
        notion: fs.existsSync(path.join(process.env.HOME, '.config', 'notion', 'api_key')),
        google: fs.existsSync(path.join(process.env.HOME, '.config', 'google', 'refresh_token')),
        cloudflare: fs.existsSync(path.join(process.env.HOME, '.config', 'cloudflare', 'api_token')),
        backup: fs.existsSync(path.join(DATA_DIR, 'xp', 'player.json'))
      },
      workspace: {
        root: WORKSPACE,
        todayLog: { path: todayLogPath, exists: todayLogExists }
      },
      economy: economySnapshot,
      overview
    };
  } catch (error) {
    console.error('Error fetching status data:', error);
    throw error;
  }
}

// Get cached or fresh data
async function getStatusData() {
  const now = Date.now();
  const cacheAge = now - cache.timestamp;

  if (cache.data && cacheAge < CACHE_TTL_MS) {
    console.log(`Cache hit: ${Math.round(cacheAge / 1000)}s old`);
    return cache.data;
  }

  if (cache.isRefreshing) {
    console.log('Cache miss but refresh in progress, returning stale data');
    return cache.data;
  }

  console.log('Cache miss, fetching fresh data...');
  cache.isRefreshing = true;

  try {
    const freshData = await fetchStatusData();
    cache.data = freshData;
    cache.timestamp = now;
    console.log('Cache updated successfully');
    return freshData;
  } catch (error) {
    console.error('Failed to refresh cache:', error);
    if (cache.data) {
      console.log('Returning stale cache due to error');
      return cache.data;
    }
    throw error;
  } finally {
    cache.isRefreshing = false;
  }
}

bootstrapWorkspaceFiles();
performEconomyDailyRollIfNeeded(new Date());

app.use(express.json({ limit: '1mb' }));

// API endpoint
app.get('/api/status', async (req, res) => {
  try {
    const data = await getStatusData();
    res.json(data);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/capture', (req, res) => {
  try {
    if (CAPTURE_TOKEN) {
      const auth = String(req.get('authorization') || '');
      const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : '';
      const token = bearer || String(req.get('x-alfred-token') || '');
      if (!token || token !== CAPTURE_TOKEN) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
      }
    }

    const body = (req && req.body && typeof req.body === 'object') ? req.body : {};

    const content = (typeof body.content === 'string') ? body.content.trim() : '';
    if (!content) {
      return res.status(400).json({ ok: false, error: 'content is required' });
    }

    const source = (typeof body.source === 'string' && body.source.trim())
      ? body.source.trim().slice(0, 64)
      : 'manual';
    const threadId = (typeof body.threadId === 'string' && body.threadId.trim())
      ? body.threadId.trim().slice(0, 120)
      : null;
    const type = (typeof body.type === 'string' && body.type.trim()) ? body.type.trim() : 'note';
    const priority = (typeof body.priority === 'string' && body.priority.trim()) ? body.priority.trim() : 'medium';
    const tags = Array.isArray(body.tags)
      ? body.tags.map(String).map(t => t.trim()).filter(Boolean).slice(0, 24)
      : [];
    const incomingMeta = (body.meta && typeof body.meta === 'object' && !Array.isArray(body.meta))
      ? body.meta
      : null;
    const ticketMeta = parseTicketMeta(incomingMeta);
    const shopPurchaseMeta = parseShopPurchaseMeta(incomingMeta);
    const slashCommand = parseSlashCommand(content);
    const typeResolved = slashCommand?.name === 'log' ? 'log' : type;
    const meta = (() => {
      const value = incomingMeta ? { ...incomingMeta } : {};
      if (ticketMeta) {
        value.ticket = ticketMeta;
      }
      if (shopPurchaseMeta) {
        value.shopPurchase = shopPurchaseMeta;
      }
      if (slashCommand) {
        value.slashCommand = {
          name: slashCommand.name,
          args: slashCommand.args,
          raw: slashCommand.raw
        };
      }
      return Object.keys(value).length ? value : null;
    })();

    const nowDate = new Date();
    const nowIso = nowDate.toISOString();
    const id = `capture-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    const sessionKey = resolveJarvisSessionKey(body.sessionKey, threadId);

    const newItem = {
      id,
      type: typeResolved,
      content,
      source,
      capturedAt: nowIso,
      processed: false,
      priority,
      tags,
      meta
    };

    let doc = readJSON(CAPTURE_INBOX_PATH);
    if (!doc || typeof doc !== 'object') {
      doc = defaultCaptureInboxDoc();
    }
    if (!Array.isArray(doc.inbox)) doc.inbox = [];

    // Keep newest on top.
    doc.inbox.unshift(newItem);
    incrementCaptureStats(doc, newItem);
    writeJsonAtomic(CAPTURE_INBOX_PATH, doc);

    let queuedCommand = null;
    if (slashCommand) {
      queuedCommand = {
        id: `cmd-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
        command: slashCommand.name,
        args: slashCommand.args,
        raw: slashCommand.raw,
        source,
        threadId,
        sessionKey,
        status: 'pending',
        createdAt: nowIso
      };
      enqueueJarvisCommand(queuedCommand);
    }

    appendJsonl(CHAT_JOURNAL_PATH, {
      id: `evt-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
      ts: nowIso,
      domain: 'chatui',
      type: slashCommand ? `slash.${slashCommand.name}` : 'capture',
      source,
      text: content,
      tags,
      payload: {
        captureId: id,
        type: typeResolved,
        priority,
        threadId,
        sessionKey,
        commandId: queuedCommand?.id || null
      }
    });

    let economyEffect = defaultEconomyEffect();
    let shopPurchase = null;
    let economy = getEconomySnapshot(readEconomyLedger(), nowDate);
    if (ticketMeta || shopPurchaseMeta) {
      try {
        performEconomyDailyRollIfNeeded(nowDate);
        const ledger = readEconomyLedger();
        if (ticketMeta) {
          economyEffect = applyTicketEconomyClaim(ledger, ticketMeta, nowDate);
        }
        if (shopPurchaseMeta) {
          shopPurchase = applyShopPurchase(ledger, shopPurchaseMeta, nowDate);
        }
        trimEconomyLedger(ledger);
        const persisted = writeEconomyLedger(ledger, nowIso);
        economy = getEconomySnapshot(persisted, nowDate);
      } catch (economyError) {
        console.warn('Economy update failed:', economyError.message);
        economyEffect.flags = ['manual_review'];
      }
    }

    // Invalidate cache so the dashboard updates immediately.
    cache.timestamp = 0;

    return res.json({ ok: true, item: newItem, queuedCommand, economyEffect, shopPurchase, economy });
  } catch (error) {
    console.error('Capture Error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/jarvis/commands', (req, res) => {
  try {
    const query = (req && req.query && typeof req.query === 'object') ? req.query : {};
    const limit = clamp(Number(query.limit || 100), 1, 500);
    const statusFilter = (typeof query.status === 'string' && query.status.trim())
      ? query.status.trim().toLowerCase()
      : '';

    const doc = readJSON(COMMAND_QUEUE_PATH) || defaultCommandQueueDoc();
    const queue = Array.isArray(doc.queue) ? doc.queue : [];

    const list = queue
      .filter(item => (statusFilter ? String(item?.status || '').toLowerCase() === statusFilter : true))
      .slice(0, limit);

    return res.json({
      ok: true,
      pending: doc?.stats?.pending ?? queue.filter(item => item?.status !== 'processed').length,
      totalQueued: doc?.stats?.totalQueued ?? queue.length,
      commands: list
    });
  } catch (error) {
    console.error('Jarvis command queue error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'jarvis command queue failed',
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/jarvis/inbox/process', (req, res) => {
  try {
    const body = (req && req.body && typeof req.body === 'object') ? req.body : {};
    const force = Boolean(body.force);
    const reason = (typeof body.reason === 'string' && body.reason.trim())
      ? body.reason.trim().slice(0, 180)
      : 'manual-trigger';

    const result = triggerJarvisInboxProcessing(reason, force);
    return res.json(result);
  } catch (error) {
    console.error('Jarvis inbox process error:', error);
    return res.status(502).json({
      ok: false,
      error: error.message || 'jarvis inbox processing failed',
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/jarvis/chat', (req, res) => {
  try {
    const body = (req && req.body && typeof req.body === 'object') ? req.body : {};
    const message = (typeof body.message === 'string') ? body.message.trim() : '';
    if (!message) {
      return res.status(400).json({ ok: false, error: 'message is required' });
    }

    const sessionKey = resolveJarvisSessionKey(body.sessionKey, body.threadId);
    const idempotencyKey = (typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim())
      ? body.idempotencyKey.trim()
      : crypto.randomUUID();
    const timeoutMs = clamp(Number(body.timeoutMs || OPENCLAW_TIMEOUT_MS), 10_000, 180_000);

    const before = safeGatewayCall('chat.history', { sessionKey }, 10_000);
    const beforeMessages = Array.isArray(before?.messages) ? before.messages : [];
    const beforeCount = beforeMessages.length;

    const sendResult = openclawGatewayCall(
      'chat.send',
      { sessionKey, message, idempotencyKey },
      Math.min(timeoutMs, OPENCLAW_TIMEOUT_MS)
    );
    const runId = sendResult?.runId || null;

    if (runId) {
      openclawGatewayCall(
        'agent.wait',
        { runId },
        Math.min(timeoutMs, OPENCLAW_TIMEOUT_MS)
      );
    }

    const after = openclawGatewayCall('chat.history', { sessionKey }, 15_000);
    const afterMessages = Array.isArray(after?.messages) ? after.messages : [];
    const replyText = extractLatestAssistantText(afterMessages, beforeCount);

    return res.json({
      ok: true,
      sessionKey,
      runId,
      beforeCount,
      afterCount: afterMessages.length,
      replyText: replyText || 'No assistant text response returned.'
    });
  } catch (error) {
    console.error('Jarvis chat error:', error);
    return res.status(502).json({
      ok: false,
      error: error.message || 'jarvis gateway failed',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/jarvis/history', (req, res) => {
  try {
    const query = (req && req.query && typeof req.query === 'object') ? req.query : {};
    const sessionKey = resolveJarvisSessionKey(query.sessionKey, query.threadId);
    const limit = clamp(Number(query.limit || 120), 10, 500);

    const history = openclawGatewayCall('chat.history', { sessionKey }, 15_000);
    const rows = Array.isArray(history?.messages) ? history.messages : [];

    const messages = rows
      .map((msg, idx) => ({
        id: msg?.id || `${sessionKey}-${idx}`,
        role: msg?.role || 'unknown',
        text: extractTextFromContent(msg?.content),
        timestamp: msg?.timestamp || null
      }))
      .filter(msg => msg.role && msg.text)
      .slice(-limit);

    return res.json({
      ok: true,
      sessionKey,
      count: messages.length,
      messages
    });
  } catch (error) {
    console.error('Jarvis history error:', error);
    return res.status(502).json({
      ok: false,
      error: error.message || 'jarvis history failed',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Chat UI (built by chatui workspace)
app.use('/chat', express.static(CHAT_DIST_DIR));

const chatIndexPath = path.join(CHAT_DIST_DIR, 'index.html');
app.get('/chat', (req, res) => {
  if (fs.existsSync(chatIndexPath)) return res.sendFile(chatIndexPath);
  return res.status(503).send('Chat UI is not built yet. Run: npm run build');
});
app.get('/chat/*', (req, res) => {
  if (fs.existsSync(chatIndexPath)) return res.sendFile(chatIndexPath);
  return res.status(503).send('Chat UI is not built yet. Run: npm run build');
});

app.get('/legacy/status', (req, res) => {
  res.status(200).send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Legacy UI</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 24px; background: #0f1220; color: #e9eefc; }
      .card { max-width: 760px; margin: 0 auto; border: 1px solid rgba(255,255,255,.16); border-radius: 14px; padding: 18px; background: rgba(255,255,255,.04); }
      a, button { color: #e9eefc; text-decoration: none; border: 1px solid rgba(255,255,255,.2); border-radius: 10px; padding: 8px 10px; background: rgba(255,255,255,.06); display: inline-block; margin-right: 8px; }
      .muted { opacity: .75; font-size: .95rem; }
      code { background: rgba(255,255,255,.08); padding: 2px 6px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h2>Legacy UI Status</h2>
      <p class="muted">Legacy server is expected on <code>${LEGACY_UI_URL}</code>. If that dev server is down, browser shows "refused to connect".</p>
      <p>
        <a href="${LEGACY_UI_URL}" target="_blank" rel="noreferrer">Open Legacy Port</a>
        <a href="/chat/">Open New Console</a>
        <a href="/">Back to Dashboard</a>
      </p>
    </div>
  </body>
</html>`);
});

// Legacy UI proxy so it also works through alfred.xvadur.com (no localhost redirect on client).
app.use('/legacy', (req, res) => {
  const upstreamPath = req.originalUrl.replace(/^\/legacy/, '') || '/';
  const targetHost = LEGACY_TARGET.hostname;
  const targetPort = LEGACY_TARGET.port || (LEGACY_TARGET.protocol === 'https:' ? 443 : 80);

  const proxyReq = http.request({
    hostname: targetHost,
    port: targetPort,
    method: req.method,
    path: upstreamPath,
    headers: {
      ...req.headers,
      host: `${targetHost}:${targetPort}`
    }
  }, (proxyRes) => {
    const statusCode = proxyRes.statusCode || 502;
    const contentType = String(proxyRes.headers['content-type'] || '');
    const isHtml = contentType.includes('text/html');
    const isJsLike =
      contentType.includes('javascript') ||
      contentType.includes('typescript') ||
      contentType.includes('ecmascript');

    res.status(statusCode);
    for (const [key, value] of Object.entries(proxyRes.headers)) {
      // Avoid cross-host redirects to localhost in client browser.
      if (key.toLowerCase() === 'location' && typeof value === 'string') {
        try {
          const u = new URL(value, `${LEGACY_TARGET.protocol}//${targetHost}:${targetPort}`);
          const isLegacyHost = u.hostname === targetHost && `${u.port || (u.protocol === 'https:' ? '443' : '80')}` === `${targetPort}`;
          if (isLegacyHost) {
            res.setHeader('location', `/legacy${u.pathname}${u.search}`);
            continue;
          }
        } catch {
          // fall through
        }
      }
      if (value != null) res.setHeader(key, value);
    }

    if (!isHtml && !isJsLike) {
      proxyRes.pipe(res);
      return;
    }

    // Rewrite root-absolute URLs so legacy Vite assets resolve under /legacy/*
    // when proxied through Alfred server.
    let body = '';
    proxyRes.setEncoding('utf8');
    proxyRes.on('data', (chunk) => {
      body += chunk;
    });
    proxyRes.on('end', () => {
      const rewritten = body
        .replace(/(src|href)=["']\/(?!\/)/g, '$1="/legacy/')
        .replace(/import\s+["']\/(?!\/)/g, 'import "/legacy/')
        .replace(/from\s+["']\/(?!\/)/g, 'from "/legacy/')
        .replace(/import\s*\(\s*["']\/(?!\/)/g, 'import("/legacy/');
      res.send(rewritten);
    });
  });

  proxyReq.on('error', () => {
    res.status(502).send('Legacy UI is offline. Check /legacy/status');
  });

  req.pipe(proxyReq);
});

// Default route - serve dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Task Monitor Server running on http://${HOST}:${PORT}`);
  console.log(`Workspace: ${WORKSPACE}`);
  console.log(`Data dir: ${DATA_DIR}`);
  if (JARVIS_INBOX_CRON_ENABLED) {
    console.log(`Jarvis inbox cron: every ${Math.round(JARVIS_INBOX_CRON_MS / 60000)} minutes`);
  } else {
    console.log('Jarvis inbox cron: disabled');
  }
});

if (JARVIS_INBOX_CRON_ENABLED) {
  const timer = setInterval(() => {
    try {
      performEconomyDailyRollIfNeeded(new Date());
      const result = triggerJarvisInboxProcessing('cron-3h', false);
      if (result.skipped) {
        console.log('Jarvis inbox cron: skipped (no pending work)');
      } else {
        console.log(`Jarvis inbox cron: triggered${result.runId ? ` runId=${result.runId}` : ''}`);
      }
    } catch (error) {
      console.warn('Jarvis inbox cron failed:', error.message);
    }
  }, JARVIS_INBOX_CRON_MS);

  if (typeof timer.unref === 'function') timer.unref();
}

const economyRollTimer = setInterval(() => {
  try {
    performEconomyDailyRollIfNeeded(new Date());
  } catch (error) {
    console.warn('Economy daily roll check failed:', error.message);
  }
}, 5 * 60 * 1000);

if (typeof economyRollTimer.unref === 'function') economyRollTimer.unref();

// Pre-warm cache on startup
console.log('Pre-warming cache...');
getStatusData().then(() => {
  console.log('Cache pre-warmed successfully');
}).catch(err => {
  console.error('Failed to pre-warm cache:', err.message);
});
