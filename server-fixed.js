#!/usr/bin/env node

const express = require('express');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const PORT = 3030;
// Bind to IPv4 loopback so Cloudflare Tunnel can reliably reach it.
// (Using "localhost" can resolve to ::1 and break if the server isn't listening on IPv6.)
const HOST = '127.0.0.1';

const WORKSPACE = path.join(process.env.HOME, '.openclaw', 'workspace');
const DATA_DIR = path.join(WORKSPACE, 'data');

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

    const openclawSessions = safeExecJson('openclaw sessions list --json', 4000);
    const openclawCrons = safeExecJson('openclaw cron list --json', 4000);
    
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
          tags: i.tags || []
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
        sessions: openclawSessions || null,
        crons: openclawCrons || null
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

app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

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
