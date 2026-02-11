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

const WORKSPACE = path.join(process.env.HOME, '.openclaw', 'workspace');
const DATA_DIR = path.join(WORKSPACE, 'data');
const CAPTURE_INBOX_PATH = path.join(DATA_DIR, 'system', 'capture', 'inbox.json');
const CHAT_DIST_DIR = path.join(__dirname, '..', 'chatui', 'dist');
const LEGACY_UI_URL = process.env.LEGACY_UI_URL || 'http://127.0.0.1:5175';
const CAPTURE_TOKEN = process.env.CAPTURE_TOKEN || '';
const OPENCLAW_BIN = process.env.OPENCLAW_BIN || '';
const OPENCLAW_MJS = process.env.OPENCLAW_MJS || path.join(process.env.HOME || '', 'OPENCLAW', 'openclaw.mjs');
const OPENCLAW_DEFAULT_SESSION_KEY = process.env.OPENCLAW_SESSION_KEY || 'agent:main:main';
const OPENCLAW_TIMEOUT_MS = Number.parseInt(process.env.OPENCLAW_GATEWAY_TIMEOUT_MS || '90000', 10);
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

function incrementCaptureStats(doc, newItem) {
  if (!doc || typeof doc !== 'object') return;
  if (!doc.captureStats || typeof doc.captureStats !== 'object') doc.captureStats = {};
  if (!doc.captureStats.bySource || typeof doc.captureStats.bySource !== 'object') doc.captureStats.bySource = {};
  if (!doc.captureStats.byType || typeof doc.captureStats.byType !== 'object') doc.captureStats.byType = {};

  const total = Number(doc.captureStats.totalCaptured || 0);
  const processed = Number(doc.captureStats.processed || 0);

  // If pending isn't present (or is bogus), default to current unprocessed items count.
  const inferredPending = Array.isArray(doc.inbox) ? doc.inbox.filter(i => !i?.processed).length : 0;
  const pending = (doc.captureStats.pending == null) ? inferredPending : Number(doc.captureStats.pending || 0);

  doc.captureStats.totalCaptured = total + 1;
  doc.captureStats.processed = processed;
  doc.captureStats.pending = pending + 1;

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
    // Read player data
    const player = readJSON(path.join(DATA_DIR, 'xp', 'player.json'));
    const quests = readJSON(path.join(DATA_DIR, 'xp', 'quests.json'));
    const tasks = readJSON(path.join(DATA_DIR, 'system', 'tasks', 'active.json'));
    const captureInbox = readJSON(path.join(DATA_DIR, 'system', 'capture', 'inbox.json'));

    // Get daily log files
    const memoryDir = path.join(WORKSPACE, 'memory');
    const today = new Date().toISOString().split('T')[0];
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
      inboxPending: captureInbox?.captureStats?.pending ?? (captureInbox?.inbox?.filter(i => !i.processed).length ?? null)
    };

    const eventsRecent = readEventsTailForDate(today, 50);

    const openclawSessions =
      safeGatewayCall('sessions.list', {}, 6000) ||
      safeExecJson('openclaw sessions list --json', 4000);
    const openclawCrons =
      safeGatewayCall('cron.list', {}, 6000) ||
      safeExecJson('openclaw cron list --json', 4000);

    return {
      timestamp: new Date().toISOString(),
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

    const type = (typeof body.type === 'string' && body.type.trim()) ? body.type.trim() : 'note';
    const priority = (typeof body.priority === 'string' && body.priority.trim()) ? body.priority.trim() : 'medium';
    const tags = Array.isArray(body.tags)
      ? body.tags.map(String).map(t => t.trim()).filter(Boolean).slice(0, 24)
      : [];
    const meta = (body.meta && typeof body.meta === 'object' && !Array.isArray(body.meta))
      ? body.meta
      : null;

    const nowIso = new Date().toISOString();
    const id = `capture-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

    const newItem = {
      id,
      type,
      content,
      source: 'manual',
      capturedAt: nowIso,
      processed: false,
      priority,
      tags,
      meta
    };

    let doc = readJSON(CAPTURE_INBOX_PATH);
    if (!doc || typeof doc !== 'object') {
      doc = { inbox: [], autoRules: [], captureStats: {}, settings: {} };
    }
    if (!Array.isArray(doc.inbox)) doc.inbox = [];

    // Keep newest on top.
    doc.inbox.unshift(newItem);
    incrementCaptureStats(doc, newItem);
    writeJsonAtomic(CAPTURE_INBOX_PATH, doc);

    // Invalidate cache so the dashboard updates immediately.
    cache.timestamp = 0;

    return res.json({ ok: true, item: newItem });
  } catch (error) {
    console.error('Capture Error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message,
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
});

// Pre-warm cache on startup
console.log('Pre-warming cache...');
getStatusData().then(() => {
  console.log('Cache pre-warmed successfully');
}).catch(err => {
  console.error('Failed to pre-warm cache:', err.message);
});
