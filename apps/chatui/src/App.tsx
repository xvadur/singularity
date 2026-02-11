import { useCallback, useEffect, useMemo, useState } from 'react';

type InboxItem = {
  id: string;
  type: string;
  content: string;
  capturedAt?: string;
  priority?: string;
  tags?: string[];
  meta?: Record<string, unknown>;
};

type EventItem = {
  id?: string | null;
  ts?: string | null;
  domain?: string | null;
  type?: string | null;
  source?: string | null;
  text?: string | null;
};

type StatusResponse = {
  timestamp?: string;
  overview?: {
    vitalityScore?: number | null;
    vitalityBand?: string | null;
    totalXP?: number;
    streakDays?: number;
    openTasks?: number;
    inboxPending?: number | null;
  };
  inbox?: {
    pending?: number | null;
    totalCaptured?: number | null;
    list?: InboxItem[];
  };
  events?: {
    date?: string;
    recent?: EventItem[];
    count?: number;
  };
  systems?: Record<string, boolean>;
};

type CaptureType = 'task' | 'idea' | 'insight' | 'link' | 'note';
type CapturePriority = 'low' | 'medium' | 'high' | 'critical';
type PromptCategory = 'action' | 'planning' | 'research';
type PanelMode = 'monitor' | 'workquest';

type Quest = {
  id: string;
  name: string;
  status: 'active' | 'done';
  totalSteps: number;
  completedSteps: number;
  xpReward: number;
  createdAt: string;
};

type PromptRun = {
  id: string;
  ts: string;
  category: PromptCategory;
  questId: string | null;
  content: string;
  words: number;
  vocabScore: number;
  cognitiveScore: number;
  rpe: number;
  focusPurity: number;
  baseXp: number;
  streakMultiplier: number;
  criticalHit: boolean;
  criticalBonus: number;
  completionBonus: number;
  xpAwarded: number;
  focusPoints: number;
};

type AchievementId =
  | 'first_prompt'
  | 'action_runner'
  | 'deep_thinker'
  | 'streak_7'
  | 'quest_finisher'
  | 'xp_1000'
  | 'loot_hunter';

type GameState = {
  enabled: boolean;
  dailyFocusGoal: number;
  quests: Quest[];
  runs: PromptRun[];
  streakDays: number;
  lastPromptDate: string | null;
  totalCriticalHits: number;
  achievements: AchievementId[];
};

const GAME_STATE_KEY = 'alfred_workquest_v1';

const ACHIEVEMENT_LABELS: Record<AchievementId, string> = {
  first_prompt: 'First Prompt',
  action_runner: 'Action Runner',
  deep_thinker: 'Deep Thinker',
  streak_7: '7-Day Streak',
  quest_finisher: 'Quest Finisher',
  xp_1000: '1k XP',
  loot_hunter: 'Loot Hunter'
};

const CATEGORY_HINTS: Record<PromptCategory, string> = {
  action: 'Concrete execution. Highest XP base.',
  planning: 'Planning/reflection. Lower XP, good for alignment.',
  research: 'Research and study. Medium-high XP.'
};

function fmt(ts?: string | null) {
  if (!ts) return 'N/A';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function clsForPriority(priority?: string) {
  switch ((priority || '').toLowerCase()) {
    case 'critical':
      return 'priority priority-critical';
    case 'high':
      return 'priority priority-high';
    case 'medium':
      return 'priority priority-medium';
    case 'low':
      return 'priority priority-low';
    default:
      return 'priority';
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function dateKey(input: string | Date) {
  const d = input instanceof Date ? input : new Date(input);
  return d.toISOString().slice(0, 10);
}

function dayDiff(from: string, to: string) {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function calcVocabScore(text: string) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return 0;
  const unique = new Set(words).size;
  return clamp(Math.round((unique / words.length) * 100), 0, 100);
}

function calcCognitiveScore(text: string, category: PromptCategory) {
  const words = countWords(text);
  const longWordCount = text
    .split(/\s+/)
    .filter(Boolean)
    .filter(w => w.length >= 8).length;
  const questionCount = (text.match(/\?/g) || []).length;
  const connectorCount = (text.match(/\b(why|because|therefore|however|compare|evaluate|assume|analyze|criteria|tradeoff)\b/gi) || []).length;

  let score = 25;
  score += clamp(words * 0.5, 0, 28);
  score += clamp(longWordCount * 1.3, 0, 18);
  score += clamp(questionCount * 4, 0, 12);
  score += clamp(connectorCount * 3.5, 0, 20);

  if (category === 'research') score += 8;
  if (category === 'action') score += 4;

  return clamp(Math.round(score), 0, 100);
}

function baseXpFor(category: PromptCategory, words: number) {
  const base = category === 'action' ? 10 : category === 'research' ? 8 : 5;
  const lengthBonus = words >= 120 ? 6 : words >= 60 ? 4 : words >= 25 ? 2 : 0;
  return base + lengthBonus;
}

function xpRequiredForLevel(level: number) {
  return 100 + level * 25;
}

function levelFromXp(totalXp: number) {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  while (remaining >= xpRequiredForLevel(level)) {
    remaining -= xpRequiredForLevel(level);
    level += 1;
  }
  const toNext = xpRequiredForLevel(level);
  const pct = toNext ? Math.round((remaining / toNext) * 100) : 0;
  return { level, currentInLevel: remaining, toNext, pct };
}

function defaultGameState(): GameState {
  return {
    enabled: true,
    dailyFocusGoal: 200,
    quests: [],
    runs: [],
    streakDays: 0,
    lastPromptDate: null,
    totalCriticalHits: 0,
    achievements: []
  };
}

function loadGameState(): GameState {
  try {
    const raw = localStorage.getItem(GAME_STATE_KEY);
    if (!raw) return defaultGameState();
    const parsed = JSON.parse(raw) as Partial<GameState>;

    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
      dailyFocusGoal: clamp(Number(parsed.dailyFocusGoal || 200), 50, 600),
      quests: Array.isArray(parsed.quests) ? parsed.quests : [],
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      streakDays: Math.max(0, Number(parsed.streakDays || 0)),
      lastPromptDate: typeof parsed.lastPromptDate === 'string' ? parsed.lastPromptDate : null,
      totalCriticalHits: Math.max(0, Number(parsed.totalCriticalHits || 0)),
      achievements: Array.isArray(parsed.achievements)
        ? parsed.achievements.filter(Boolean).slice(0, 32) as AchievementId[]
        : []
    };
  } catch {
    return defaultGameState();
  }
}

function addAchievement(existing: AchievementId[], id: AchievementId) {
  if (existing.includes(id)) return existing;
  return [...existing, id];
}

function computeSeries(runs: PromptRun[], days: number) {
  const out: Array<{ day: string; xp: number }> = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    const xp = runs
      .filter(run => dateKey(run.ts) === key)
      .reduce((sum, run) => sum + run.xpAwarded, 0);
    out.push({ day: key.slice(5), xp });
  }

  return out;
}

function nextStreak(lastPromptDate: string | null, streakDays: number, todayKey: string) {
  if (!lastPromptDate) return 1;
  const gap = dayDiff(lastPromptDate, todayKey);
  if (gap <= 0) return Math.max(1, streakDays || 1);
  if (gap === 1) return Math.max(1, streakDays + 1);
  return Math.max(1, Math.floor(Math.max(1, streakDays) / 2));
}

export default function App() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [type, setType] = useState<CaptureType>('note');
  const [priority, setPriority] = useState<CapturePriority>('medium');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('alfred_capture_token') || '';
    } catch {
      return '';
    }
  });

  const [panelMode, setPanelMode] = useState<PanelMode>('workquest');
  const [category, setCategory] = useState<PromptCategory>('action');
  const [selectedQuestId, setSelectedQuestId] = useState<string>('');
  const [rpe, setRpe] = useState(5);
  const [focusPurity, setFocusPurity] = useState(70);
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<'all' | PromptCategory>('all');
  const [historyQuestFilter, setHistoryQuestFilter] = useState<'all' | string>('all');
  const [newQuestName, setNewQuestName] = useState('');
  const [newQuestSteps, setNewQuestSteps] = useState(6);
  const [newQuestReward, setNewQuestReward] = useState(100);

  const [gameState, setGameState] = useState<GameState>(() => loadGameState());

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as StatusResponse;
      setStatus(data);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    try {
      localStorage.setItem('alfred_capture_token', token);
    } catch {
      // ignore
    }
  }, [token]);

  useEffect(() => {
    try {
      localStorage.setItem(GAME_STATE_KEY, JSON.stringify(gameState));
    } catch {
      // ignore
    }
  }, [gameState]);

  const parsedTags = useMemo(() => {
    return tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .slice(0, 12);
  }, [tags]);

  const totalWorkQuestXp = useMemo(() => {
    return gameState.runs.reduce((sum, run) => sum + run.xpAwarded, 0);
  }, [gameState.runs]);

  const levelInfo = useMemo(() => levelFromXp(totalWorkQuestXp), [totalWorkQuestXp]);

  const today = useMemo(() => dateKey(new Date()), []);

  const todayFocus = useMemo(() => {
    return gameState.runs
      .filter(run => dateKey(run.ts) === today)
      .reduce((sum, run) => sum + run.focusPoints, 0);
  }, [gameState.runs, today]);

  const todayXp = useMemo(() => {
    return gameState.runs
      .filter(run => dateKey(run.ts) === today)
      .reduce((sum, run) => sum + run.xpAwarded, 0);
  }, [gameState.runs, today]);

  const focusPct = clamp(Math.round((todayFocus / Math.max(1, gameState.dailyFocusGoal)) * 100), 0, 200);

  const activeQuests = useMemo(() => gameState.quests.filter(quest => quest.status === 'active'), [gameState.quests]);

  const historyRuns = useMemo(() => {
    return gameState.runs
      .filter(run => (historyCategoryFilter === 'all' ? true : run.category === historyCategoryFilter))
      .filter(run => (historyQuestFilter === 'all' ? true : run.questId === historyQuestFilter))
      .slice(0, 20);
  }, [gameState.runs, historyCategoryFilter, historyQuestFilter]);

  const xpSeries = useMemo(() => computeSeries(gameState.runs, 7), [gameState.runs]);

  const maxBarXp = useMemo(() => {
    return Math.max(20, ...xpSeries.map(point => point.xp));
  }, [xpSeries]);

  const adaptiveAdvice = useMemo(() => {
    const sample = gameState.runs.slice(0, 10);
    if (!sample.length) return 'Not enough data yet. Keep shipping prompts and the system will calibrate goals.';

    const avgRpe = sample.reduce((sum, run) => sum + run.rpe, 0) / sample.length;
    if (avgRpe <= 3) {
      return 'You are under-loaded (RPE <= 3). Consider increasing daily focus goal by ~15%.';
    }
    if (avgRpe >= 8) {
      return 'You are overloaded (RPE >= 8). Reduce daily focus goal by ~15% to avoid burnout.';
    }

    return 'Workload is balanced. Keep daily goal stable and optimize prompt quality.';
  }, [gameState.runs]);

  const recommendation = useMemo(() => {
    const run = gameState.runs[0];
    if (!run) return 'Tip: specify scope, source, and constraints in each prompt.';

    if (run.cognitiveScore < 45) {
      return 'Last prompt looked shallow. Add evaluation criteria and explicit tradeoffs.';
    }
    if (run.vocabScore < 40) {
      return 'Linguistic richness is low. Use concrete terms and context anchors.';
    }
    if (run.focusPurity < 55) {
      return 'Focus purity dropped. Batch notifications and keep one-tab execution during deep work.';
    }

    return 'Prompt quality is solid. Next step: chain this into a concrete Action quest step.';
  }, [gameState.runs]);

  const badges = useMemo(() => gameState.achievements.map(id => ACHIEVEMENT_LABELS[id]), [gameState.achievements]);

  const submit = useCallback(async () => {
    const text = content.trim();
    if (!text) return;

    setErr(null);

    let nextState: GameState | null = null;
    let runMeta: PromptRun | null = null;

    if (gameState.enabled) {
      const now = new Date();
      const nowIso = now.toISOString();
      const todayKey = dateKey(now);
      const words = countWords(text);
      const vocabScore = calcVocabScore(text);
      const cognitiveScore = calcCognitiveScore(text, category);
      const baseXp = baseXpFor(category, words);
      const streak = nextStreak(gameState.lastPromptDate, gameState.streakDays, todayKey);
      const streakMultiplier = 1 + Math.min(0.4, Math.max(0, streak - 1) * 0.05);
      const rpeMultiplier = 0.8 + rpe * 0.06;
      const focusMultiplier = 0.75 + focusPurity / 200;
      const cognitiveBonus = Math.round(cognitiveScore / 18);
      const linguisticBonus = Math.round(vocabScore / 20);
      const criticalChance = cognitiveScore >= 70 || words >= 80 ? 0.12 : 0.04;
      const criticalHit = Math.random() < criticalChance;
      const criticalBonus = criticalHit ? 16 : 0;

      let quests = gameState.quests;
      let completionBonus = 0;

      if (selectedQuestId) {
        quests = gameState.quests.map(quest => {
          if (quest.id !== selectedQuestId || quest.status !== 'active' || category !== 'action') return quest;

          const completedSteps = clamp(quest.completedSteps + 1, 0, quest.totalSteps);
          const finished = completedSteps >= quest.totalSteps;
          if (finished) completionBonus += quest.xpReward;

          return {
            ...quest,
            completedSteps,
            status: finished ? 'done' : 'active'
          };
        });
      }

      const xpAwarded = Math.max(
        1,
        Math.round((baseXp + cognitiveBonus + linguisticBonus) * rpeMultiplier * focusMultiplier * streakMultiplier) + criticalBonus + completionBonus
      );
      const focusPoints = Math.min(90, Math.round(xpAwarded * 0.45 + rpe * 2));

      runMeta = {
        id: `run-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        ts: nowIso,
        category,
        questId: selectedQuestId || null,
        content: text,
        words,
        vocabScore,
        cognitiveScore,
        rpe,
        focusPurity,
        baseXp,
        streakMultiplier,
        criticalHit,
        criticalBonus,
        completionBonus,
        xpAwarded,
        focusPoints
      };

      const runs = [runMeta, ...gameState.runs].slice(0, 600);
      const totalXpAfter = runs.reduce((sum, run) => sum + run.xpAwarded, 0);
      let achievements = [...gameState.achievements];

      if (runs.length >= 1) achievements = addAchievement(achievements, 'first_prompt');
      if (runMeta.category === 'action') achievements = addAchievement(achievements, 'action_runner');
      if (runMeta.cognitiveScore >= 75) achievements = addAchievement(achievements, 'deep_thinker');
      if (streak >= 7) achievements = addAchievement(achievements, 'streak_7');
      if (quests.some(quest => quest.status === 'done')) achievements = addAchievement(achievements, 'quest_finisher');
      if (totalXpAfter >= 1000) achievements = addAchievement(achievements, 'xp_1000');
      const criticalHits = gameState.totalCriticalHits + (criticalHit ? 1 : 0);
      if (criticalHits >= 5) achievements = addAchievement(achievements, 'loot_hunter');

      nextState = {
        ...gameState,
        quests,
        runs,
        streakDays: streak,
        lastPromptDate: todayKey,
        totalCriticalHits: criticalHits,
        achievements
      };
    }

    try {
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (token.trim()) headers.authorization = `Bearer ${token.trim()}`;

      const res = await fetch('/api/capture', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type,
          priority,
          tags: parsedTags,
          content: text,
          meta: runMeta
            ? {
                category: runMeta.category,
                questId: runMeta.questId,
                rpe: runMeta.rpe,
                focusPurity: runMeta.focusPurity,
                cognitiveScore: runMeta.cognitiveScore,
                vocabScore: runMeta.vocabScore,
                xpAwarded: runMeta.xpAwarded,
                criticalHit: runMeta.criticalHit
              }
            : undefined
        })
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || `capture ${res.status}`);
      }

      if (nextState) {
        setGameState(nextState);
      }

      setContent('');
      await refresh();
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }, [category, content, focusPurity, gameState, parsedTags, priority, refresh, rpe, selectedQuestId, token, type]);

  const createQuest = useCallback(() => {
    const name = newQuestName.trim();
    if (!name) return;

    const quest: Quest = {
      id: `quest-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      name,
      status: 'active',
      totalSteps: clamp(Math.round(newQuestSteps), 1, 30),
      completedSteps: 0,
      xpReward: clamp(Math.round(newQuestReward), 20, 1000),
      createdAt: new Date().toISOString()
    };

    setGameState(prev => ({
      ...prev,
      quests: [quest, ...prev.quests].slice(0, 100)
    }));
    setSelectedQuestId(quest.id);
    setNewQuestName('');
  }, [newQuestName, newQuestReward, newQuestSteps]);

  const setGoal = useCallback((value: number) => {
    setGameState(prev => ({
      ...prev,
      dailyFocusGoal: clamp(Math.round(value), 50, 600)
    }));
  }, []);

  return (
    <div className="page">
      <header className="header">
        <div className="title">
          <div className="h1">Alfred Console</div>
          <div className="sub">
            <a href="/" className="link">
              Dashboard
            </a>
            <span className="muted"> / </span>
            <a href="/legacy" className="link" target="_blank" rel="noreferrer">
              Legacy UI
            </a>
            <span className="muted"> / </span>
            <button className="link-btn" onClick={refresh} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>

        <div className="header-right">
          <div className="segment">
            <button
              className={`segment-btn ${panelMode === 'monitor' ? 'segment-btn-active' : ''}`}
              onClick={() => setPanelMode('monitor')}
            >
              Monitor
            </button>
            <button
              className={`segment-btn ${panelMode === 'workquest' ? 'segment-btn-active' : ''}`}
              onClick={() => setPanelMode('workquest')}
            >
              Boss XP
            </button>
          </div>

          <div className="pills">
            <div className="pill">
              System XP <span className="mono">{status?.overview?.totalXP ?? '…'}</span>
            </div>
            <div className="pill">
              WQ XP <span className="mono">{totalWorkQuestXp}</span>
            </div>
            <div className="pill">
              Streak <span className="mono">{gameState.streakDays || status?.overview?.streakDays || 0}</span>
            </div>
            <div className="pill">
              Focus <span className="mono">{todayFocus}/{gameState.dailyFocusGoal}</span>
            </div>
          </div>
        </div>
      </header>

      {err ? <div className="error">Error: {err}</div> : null}

      <main className="grid">
        <section className="card span-8">
          <div className="card-title">Capture</div>
          <div className="card-sub">Prompt capture + gamified metadata for WorkQuest scoring.</div>

          <div className="form-row form-row-3">
            <label className="label">
              Type
              <select className="select" value={type} onChange={e => setType(e.target.value as CaptureType)}>
                <option value="note">note</option>
                <option value="task">task</option>
                <option value="idea">idea</option>
                <option value="insight">insight</option>
                <option value="link">link</option>
              </select>
            </label>

            <label className="label">
              Priority
              <select
                className="select"
                value={priority}
                onChange={e => setPriority(e.target.value as CapturePriority)}
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </select>
            </label>

            <label className="label">
              Tags (comma)
              <input className="input" value={tags} onChange={e => setTags(e.target.value)} placeholder="workquest, boss" />
            </label>
          </div>

          <div className="form-row form-row-4">
            <label className="label">
              Prompt Category
              <select className="select" value={category} onChange={e => setCategory(e.target.value as PromptCategory)}>
                <option value="action">Action</option>
                <option value="planning">Planning / Reflection</option>
                <option value="research">Research / Study</option>
              </select>
              <span className="tiny muted">{CATEGORY_HINTS[category]}</span>
            </label>

            <label className="label">
              Quest Link
              <select className="select" value={selectedQuestId} onChange={e => setSelectedQuestId(e.target.value)}>
                <option value="">No quest</option>
                {activeQuests.map(quest => (
                  <option key={quest.id} value={quest.id}>
                    {quest.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="label">
              RPE ({rpe})
              <input
                type="range"
                min={1}
                max={10}
                value={rpe}
                onChange={e => setRpe(clamp(Number(e.target.value), 1, 10))}
              />
              <span className="tiny muted">Higher effort = higher XP multiplier.</span>
            </label>

            <label className="label">
              Focus Purity ({focusPurity}%)
              <input
                type="range"
                min={20}
                max={100}
                value={focusPurity}
                onChange={e => setFocusPurity(clamp(Number(e.target.value), 20, 100))}
              />
              <span className="tiny muted">Lower context switching gives bonus XP.</span>
            </label>
          </div>

          <label className="label">
            Token (optional)
            <input
              className="input"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="CAPTURE_TOKEN (if enabled on server)"
              autoComplete="off"
            />
          </label>

          <label className="label">
            Content
            <textarea
              className="textarea"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write what you want Alfred/Jarvis to capture..."
              rows={5}
            />
          </label>

          <div className="actions">
            <button className="btn" onClick={submit} disabled={!content.trim()}>
              Send to Inbox
            </button>
            <div className="muted tiny">
              Last update: <span className="mono">{fmt(status?.timestamp || null)}</span>
            </div>
          </div>
        </section>

        <section className="card span-4 right-panel">
          {panelMode === 'monitor' ? (
            <>
              <div className="card-title">Monitor Panel</div>
              <div className="card-sub">System-level overview and recommendation.</div>

              <div className="stack-10">
                <div className="metric-row">
                  <span className="muted">Vitality</span>
                  <strong className="mono">
                    {status?.overview?.vitalityScore ?? '…'}
                    {status?.overview?.vitalityBand ? ` (${status.overview.vitalityBand})` : ''}
                  </strong>
                </div>
                <div className="metric-row">
                  <span className="muted">Open Tasks</span>
                  <strong className="mono">{status?.overview?.openTasks ?? '…'}</strong>
                </div>
                <div className="metric-row">
                  <span className="muted">Inbox Pending</span>
                  <strong className="mono">{status?.inbox?.pending ?? '…'}</strong>
                </div>
                <div className="metric-row">
                  <span className="muted">Events Today</span>
                  <strong className="mono">{status?.events?.count ?? '…'}</strong>
                </div>
                <div className="note-box">
                  <div className="tiny muted">Cognitive recommendation</div>
                  <div>{recommendation}</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="card-title">Boss XP Dashboard</div>
              <div className="card-sub">WorkQuest progress driven by prompt quality and effort.</div>

              <label className="switch-row">
                <span>Gamification Enabled</span>
                <input
                  type="checkbox"
                  checked={gameState.enabled}
                  onChange={e =>
                    setGameState(prev => ({
                      ...prev,
                      enabled: e.target.checked
                    }))
                  }
                />
              </label>

              <div className="level-box">
                <div className="level-head">
                  <span>Level {levelInfo.level}</span>
                  <span className="mono">{totalWorkQuestXp} XP</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${levelInfo.pct}%` }} />
                </div>
                <div className="tiny muted mono">
                  {levelInfo.currentInLevel}/{levelInfo.toNext} XP to next level
                </div>
              </div>

              <div className="focus-wrap">
                <div className="focus-ring" style={{ ['--p' as string]: `${Math.min(focusPct, 100)}%` }}>
                  <div className="focus-ring-inner">
                    <strong>{Math.min(focusPct, 999)}%</strong>
                    <span className="tiny muted">focus</span>
                  </div>
                </div>
                <div className="focus-meta">
                  <div className="metric-row">
                    <span className="muted">Today FP</span>
                    <strong className="mono">{todayFocus}</strong>
                  </div>
                  <div className="metric-row">
                    <span className="muted">Today XP</span>
                    <strong className="mono">{todayXp}</strong>
                  </div>
                  <div className="metric-row">
                    <span className="muted">Streak</span>
                    <strong className="mono">{gameState.streakDays} days</strong>
                  </div>
                </div>
              </div>

              <label className="label">
                Daily Focus Goal ({gameState.dailyFocusGoal})
                <input
                  type="range"
                  min={50}
                  max={600}
                  value={gameState.dailyFocusGoal}
                  onChange={e => setGoal(Number(e.target.value))}
                />
              </label>
            </>
          )}
        </section>

        <section className="card span-8">
          <div className="card-title">Inbox (pending)</div>
          <div className="card-sub">
            {status?.inbox?.pending ?? '…'} pending, {status?.inbox?.totalCaptured ?? '…'} total captured
          </div>

          <div className="list">
            {(status?.inbox?.list || []).map(item => (
              <div key={item.id} className={`item ${clsForPriority(item.priority)}`}>
                <div className="item-top">
                  <div className="mono">{item.type}</div>
                  <div className="muted tiny">{fmt(item.capturedAt || null)}</div>
                </div>
                <div className="item-content">{item.content}</div>
                {item.tags?.length ? <div className="tags">{item.tags.map(tag => `#${tag}`).join(' ')}</div> : null}
              </div>
            ))}
            {status?.inbox?.list?.length === 0 ? <div className="muted tiny">No pending items.</div> : null}
          </div>
        </section>

        <section className="card span-4">
          <div className="card-title">Boss Quest Progress</div>
          <div className="card-sub">Active quests with completion bars and completion XP bonus.</div>

          <div className="list compact">
            {activeQuests.map(quest => {
              const pct = clamp(Math.round((quest.completedSteps / Math.max(1, quest.totalSteps)) * 100), 0, 100);
              return (
                <div key={quest.id} className="item quest-item">
                  <div className="item-top">
                    <strong>{quest.name}</strong>
                    <span className="mono tiny">+{quest.xpReward} XP</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="tiny muted mono">
                    {quest.completedSteps}/{quest.totalSteps} steps
                  </div>
                </div>
              );
            })}
            {!activeQuests.length ? <div className="muted tiny">No active quests yet.</div> : null}
          </div>

          <div className="divider" />

          <div className="card-title">Create Boss Quest</div>
          <div className="form-row form-row-1">
            <label className="label">
              Quest Name
              <input
                className="input"
                value={newQuestName}
                onChange={e => setNewQuestName(e.target.value)}
                placeholder="Boss: Q1 AI rollout"
              />
            </label>
            <label className="label">
              Steps ({newQuestSteps})
              <input
                type="range"
                min={1}
                max={30}
                value={newQuestSteps}
                onChange={e => setNewQuestSteps(clamp(Number(e.target.value), 1, 30))}
              />
            </label>
            <label className="label">
              Completion Reward ({newQuestReward} XP)
              <input
                type="range"
                min={20}
                max={1000}
                step={10}
                value={newQuestReward}
                onChange={e => setNewQuestReward(clamp(Number(e.target.value), 20, 1000))}
              />
            </label>
            <button className="btn" onClick={createQuest} disabled={!newQuestName.trim()}>
              Add Quest
            </button>
          </div>
        </section>

        <section className="card span-12">
          <div className="card-title">Boss XP History</div>
          <div className="card-sub">Prompt runs filtered by quest/category with XP and effort context.</div>

          <div className="filters">
            <label className="label">
              Category Filter
              <select
                className="select"
                value={historyCategoryFilter}
                onChange={e => setHistoryCategoryFilter(e.target.value as 'all' | PromptCategory)}
              >
                <option value="all">all</option>
                <option value="action">action</option>
                <option value="planning">planning</option>
                <option value="research">research</option>
              </select>
            </label>
            <label className="label">
              Quest Filter
              <select
                className="select"
                value={historyQuestFilter}
                onChange={e => setHistoryQuestFilter(e.target.value as 'all' | string)}
              >
                <option value="all">all</option>
                {gameState.quests.map(quest => (
                  <option key={quest.id} value={quest.id}>
                    {quest.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="xp-bars">
            {xpSeries.map(point => {
              const height = Math.max(8, Math.round((point.xp / Math.max(1, maxBarXp)) * 88));
              return (
                <div className="xp-col" key={point.day}>
                  <div className="xp-bar" style={{ height }} />
                  <div className="tiny muted mono">{point.day}</div>
                  <div className="tiny mono">{point.xp}</div>
                </div>
              );
            })}
          </div>

          <div className="list">
            {historyRuns.map(run => {
              const questName = run.questId
                ? gameState.quests.find(quest => quest.id === run.questId)?.name || 'Unknown quest'
                : 'No quest';

              return (
                <div key={run.id} className="item">
                  <div className="item-top">
                    <div className="mono tiny">{fmt(run.ts)}</div>
                    <div className="badge">{run.category}</div>
                  </div>
                  <div className="item-content">{run.content}</div>
                  <div className="tags">
                    Quest: <strong>{questName}</strong> · XP: <strong>{run.xpAwarded}</strong> · RPE: <strong>{run.rpe}</strong> · Cognitive: <strong>{run.cognitiveScore}</strong> · Focus: <strong>{run.focusPurity}%</strong>
                    {run.criticalHit ? ' · CRITICAL BONUS' : ''}
                  </div>
                </div>
              );
            })}
            {!historyRuns.length ? <div className="muted tiny">No prompt history yet.</div> : null}
          </div>
        </section>

        <section className="card span-12">
          <div className="card-title">Adaptive Guidance + Loot/Badges</div>
          <div className="split-2">
            <div>
              <div className="card-sub">Adaptive difficulty recommendations based on recent RPE and prompt quality.</div>
              <div className="note-box">{adaptiveAdvice}</div>
              <div className="note-box">{recommendation}</div>
            </div>
            <div>
              <div className="card-sub">Random critical bonuses and unlocked progression badges.</div>
              <div className="metric-row">
                <span className="muted">Critical hits</span>
                <strong className="mono">{gameState.totalCriticalHits}</strong>
              </div>
              <div className="badge-wrap">
                {badges.map(name => (
                  <span key={name} className="badge">
                    {name}
                  </span>
                ))}
                {!badges.length ? <span className="muted tiny">No badges unlocked yet.</span> : null}
              </div>
            </div>
          </div>
        </section>

        <section className="card span-12">
          <div className="card-title">Recent Events</div>
          <div className="card-sub">
            {status?.events?.date ?? '…'} ({status?.events?.count ?? '…'})
          </div>
          <div className="list events">
            {(status?.events?.recent || []).slice().reverse().map((event, idx) => (
              <div key={`${event.ts ?? 'ts'}-${idx}`} className="event">
                <div className="event-meta">
                  <span className="mono">{fmt(event.ts || null)}</span>
                  <span className="badge">{event.domain || 'event'}</span>
                  {event.type ? <span className="badge">{event.type}</span> : null}
                  {event.source ? <span className="badge muted">{event.source}</span> : null}
                </div>
                <div className="event-text">{event.text || '(no text)'}</div>
              </div>
            ))}
            {status?.events?.recent?.length === 0 ? <div className="muted tiny">No events.</div> : null}
          </div>
        </section>
      </main>
    </div>
  );
}
