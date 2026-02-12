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

type EconomyFlag = 'cap_reached' | 'high_slider' | 'rapid_claims' | 'manual_review';

type TicketEconomyMeta = {
  ticketId: string;
  plannedEEU: number;
  progressPct: number;
  taskType: 'habit' | 'daily' | 'todo' | 'reward';
  note?: string;
};

type EconomyEffect = {
  deltaEEU: number;
  deltaPU?: number;
  deltaXP: number;
  deltaCoins: number;
  blocked: boolean;
  flags: EconomyFlag[];
  focusMinutesEquivalent: number;
  progressDelta: number;
};

type PowerUnitInfo = {
  todayPU: number;
  totalPU: number;
  dailyCap: number;
  softStart: number;
  displayName: string;
  version: number;
};

type EconomySnapshot = {
  todayEEU: number;
  todayXP: number;
  todayCoins: number;
  totalXP: number;
  coinBalance: number;
  capRemaining: number;
  recentFlags: Array<{ flag: EconomyFlag; ts: string | null; detail: string | null }>;
  powerUnit?: PowerUnitInfo;
};

type EconomyLedgerEntry = {
  ts: string;
  type: 'ticket.claim' | 'shop.purchase' | 'shop.purchase_blocked' | 'daily.roll';
  payload: Record<string, unknown>;
};

type ShopTier = 'micro' | 'standard' | 'major';

type CaptureResponse = {
  ok: boolean;
  economyEffect?: EconomyEffect;
  shopPurchase?: {
    ok: boolean;
    tier: ShopTier;
    name: string;
    price: number;
    coinBalance: number;
    reason?: string;
  } | null;
  economy?: EconomySnapshot;
};

type UiMessageRole = 'user' | 'assistant' | 'system';

type UiMessage = {
  id: string;
  role: UiMessageRole;
  text: string;
  ts: string;
};

type StatusResponse = {
  timestamp?: string;
  player?: {
    name: string;
    handle: string;
    level: number;
    title: string;
    totalXP: number;
    xpToNext: number;
    streak: number;
  };
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
  quests?: {
    active: number;
    list: BackendQuest[];
  };
  tasks?: {
    open: number;
    list: BackendTask[];
  };
  life?: {
    sleep: { hours: number; quality: string; lastUpdate: string };
    nutrition: { calories: number; quality: string; lastUpdate: string };
    exercise: { activity: string; duration: number; lastUpdate: string };
  };
  events?: {
    date?: string;
    recent?: EventItem[];
    count?: number;
  };
  openclaw?: {
    sessions: OpenClawSession[];
  };
  systems?: Record<string, boolean>;
  economy?: EconomySnapshot;
};

type BackendQuest = {
  id: string;
  name: string;
  description: string;
  priority: string;
  status: string;
  progress: number;
  deadline: string;
  xpReward: number;
};

type BackendTask = {
  id: string;
  title: string;
  priority: string;
  status: string;
  age: string;
};

type OpenClawSession = {
  id: string;
  name: string;
  status: string;
  runtime: string;
  tokens: string;
  task: string;
};

type CaptureType = 'task' | 'idea' | 'insight' | 'link' | 'note' | 'bug' | 'feature' | 'improvement' | 'reminder';
type TicketCategory = 'work' | 'personal' | 'openclaw' | 'health' | 'finance' | 'learning' | 'other';
type CapturePriority = 'low' | 'medium' | 'high' | 'critical';
type PromptCategory = 'action' | 'planning' | 'research';
type PanelMode = 'monitor' | 'workquest';
type AgentMode = 'general-assistant';
type SlashCommand = {
  name: string;
  args: string;
  raw: string;
};

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
const AGENT_MODE_KEY = 'alfred_agent_mode_v1';
const JARVIS_TOGGLE_KEY = 'alfred_jarvis_toggle_v1';
const ECONOMY_CACHE_KEY = 'alfred_economy_cache_v1';
const CHAT_MESSAGE_LOG_KEY = 'alfred_chatui_message_log_v1';

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

const SHOP_OPTIONS: Array<{ id: ShopTier; label: string; price: number }> = [
  { id: 'micro', label: 'Micro Reward', price: 40 },
  { id: 'standard', label: 'Standard Reward', price: 120 },
  { id: 'major', label: 'Major Reward', price: 300 }
];

const DEFAULT_ECONOMY_EFFECT: EconomyEffect = {
  deltaEEU: 0,
  deltaXP: 0,
  deltaCoins: 0,
  blocked: false,
  flags: [],
  focusMinutesEquivalent: 0,
  progressDelta: 0
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

function loadUiMessageLog(): UiMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_MESSAGE_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UiMessage[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(row => ({
        id: String(row?.id || ''),
        role: (row?.role === 'user' || row?.role === 'assistant' || row?.role === 'system') ? row.role : 'system',
        text: String(row?.text || ''),
        ts: String(row?.ts || '')
      }))
      .filter(row => row.id && row.text)
      .slice(0, 80);
  } catch {
    return [];
  }
}

function normalizeEconomySnapshot(raw: Partial<EconomySnapshot> | null | undefined): EconomySnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const recentFlags = Array.isArray(raw.recentFlags) ? raw.recentFlags : [];
  return {
    todayEEU: Math.max(0, Number(raw.todayEEU || 0)),
    todayXP: Math.max(0, Number(raw.todayXP || 0)),
    todayCoins: Number(raw.todayCoins || 0),
    totalXP: Math.max(0, Number(raw.totalXP || 0)),
    coinBalance: Math.max(0, Number(raw.coinBalance || 0)),
    capRemaining: Math.max(0, Number(raw.capRemaining || 0)),
    recentFlags: recentFlags
      .map(flag => ({
        flag: String(flag?.flag || 'manual_review') as EconomyFlag,
        ts: flag?.ts ? String(flag.ts) : null,
        detail: flag?.detail ? String(flag.detail) : null
      }))
      .slice(0, 8)
  };
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

function parseSlashCommandInput(input: string): SlashCommand | null {
  const text = input.trim();
  if (!text.startsWith('/')) return null;

  const match = text.match(/^\/([a-z0-9_-]+)(?:\s+([\s\S]*))?$/i);
  if (!match) return null;

  return {
    name: String(match[1]).toLowerCase(),
    args: String(match[2] || '').trim(),
    raw: text
  };
}

export default function App() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [type, setType] = useState<CaptureType>('note');
  const [ticketCategory, setTicketCategory] = useState<TicketCategory>('work');
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
  const [agentMode, setAgentMode] = useState<AgentMode>(() => {
    try {
      const saved = localStorage.getItem(AGENT_MODE_KEY);
      return saved === 'general-assistant' ? 'general-assistant' : 'general-assistant';
    } catch {
      return 'general-assistant';
    }
  });
  const [jarvisArmed, setJarvisArmed] = useState(() => {
    try {
      return localStorage.getItem(JARVIS_TOGGLE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [jarvisTriggering, setJarvisTriggering] = useState(false);
  const [jarvisLastReply, setJarvisLastReply] = useState<string | null>(null);

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
  const [ticketId, setTicketId] = useState('');
  const [ticketTaskType, setTicketTaskType] = useState<TicketEconomyMeta['taskType']>('todo');
  const [plannedEEU, setPlannedEEU] = useState(120);
  const [progressPct, setProgressPct] = useState(0);
  const [shopPurchasing, setShopPurchasing] = useState<ShopTier | null>(null);
  const [lastEconomyEffect, setLastEconomyEffect] = useState<EconomyEffect | null>(null);
  const [lastShopMessage, setLastShopMessage] = useState<string | null>(null);
  const [messageLog, setMessageLog] = useState<UiMessage[]>(() => loadUiMessageLog());
  const [economyCache, setEconomyCache] = useState<EconomySnapshot | null>(() => {
    try {
      const raw = localStorage.getItem(ECONOMY_CACHE_KEY);
      if (!raw) return null;
      return normalizeEconomySnapshot(JSON.parse(raw));
    } catch {
      return null;
    }
  });

  const [gameState, setGameState] = useState<GameState>(() => loadGameState());

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as StatusResponse;
      setStatus(data);
      const snapshot = normalizeEconomySnapshot(data.economy);
      if (snapshot) {
        setEconomyCache(snapshot);
      }
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
      localStorage.setItem(AGENT_MODE_KEY, agentMode);
    } catch {
      // ignore
    }
  }, [agentMode]);

  useEffect(() => {
    try {
      localStorage.setItem(JARVIS_TOGGLE_KEY, jarvisArmed ? '1' : '0');
    } catch {
      // ignore
    }
  }, [jarvisArmed]);

  useEffect(() => {
    try {
      localStorage.setItem(GAME_STATE_KEY, JSON.stringify(gameState));
    } catch {
      // ignore
    }
  }, [gameState]);

  useEffect(() => {
    if (!economyCache) return;
    try {
      localStorage.setItem(ECONOMY_CACHE_KEY, JSON.stringify(economyCache));
    } catch {
      // ignore
    }
  }, [economyCache]);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_MESSAGE_LOG_KEY, JSON.stringify(messageLog.slice(0, 80)));
    } catch {
      // ignore
    }
  }, [messageLog]);

  const parsedTags = useMemo(() => {
    return tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .slice(0, 12);
  }, [tags]);
  const currentSlashCommand = useMemo(() => parseSlashCommandInput(content), [content]);

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
  const economyView = useMemo(
    () => normalizeEconomySnapshot(status?.economy || economyCache),
    [status?.economy, economyCache]
  );

  const pushUiMessage = useCallback((role: UiMessageRole, text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setMessageLog(prev => ([
      {
        id: `msg-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        role,
        text: clean.slice(0, 4000),
        ts: new Date().toISOString()
      },
      ...prev
    ].slice(0, 80)));
  }, []);

  const clearUiMessageLog = useCallback(() => {
    setMessageLog([]);
    try {
      localStorage.removeItem(CHAT_MESSAGE_LOG_KEY);
    } catch {
      // ignore
    }
  }, []);

  const submit = useCallback(async () => {
    const text = content.trim();
    if (!text) return;
    const slashCommand = parseSlashCommandInput(text);
    const normalizedTicketId = ticketId.trim();
    const shouldAttachTicket = Boolean(!slashCommand && type === 'task' && normalizedTicketId);
    const shouldTriggerJarvis = jarvisArmed;

    setErr(null);
    setJarvisLastReply(null);
    setLastShopMessage(null);

    let nextState: GameState | null = null;
    let runMeta: PromptRun | null = null;

    if (gameState.enabled && !slashCommand) {
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
      const payloadMeta: Record<string, unknown> = {};
      if (runMeta) {
        payloadMeta.category = runMeta.category;
        payloadMeta.questId = runMeta.questId;
        payloadMeta.rpe = runMeta.rpe;
        payloadMeta.focusPurity = runMeta.focusPurity;
        payloadMeta.cognitiveScore = runMeta.cognitiveScore;
        payloadMeta.vocabScore = runMeta.vocabScore;
        payloadMeta.xpAwarded = runMeta.xpAwarded;
        payloadMeta.criticalHit = runMeta.criticalHit;
      }
      if (slashCommand) {
        payloadMeta.slashCommand = {
          name: slashCommand.name,
          args: slashCommand.args
        };
      }
      if (shouldAttachTicket) {
        payloadMeta.ticket = {
          ticketId: normalizedTicketId,
          plannedEEU: clamp(Math.round(plannedEEU), 1, 1000),
          progressPct: clamp(Math.round(progressPct), 0, 100),
          taskType: ticketTaskType
        } as TicketEconomyMeta;
      }

      const res = await fetch('/api/capture', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type,
          priority,
          category: ticketCategory,
          tags: parsedTags,
          content: text,
          source: 'chatui',
          meta: Object.keys(payloadMeta).length ? payloadMeta : undefined
        })
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || `capture ${res.status}`);
      }

      const captureData = (await res.json()) as CaptureResponse;
      pushUiMessage('user', text);
      const effect = captureData.economyEffect || DEFAULT_ECONOMY_EFFECT;
      setLastEconomyEffect({
        ...DEFAULT_ECONOMY_EFFECT,
        ...effect
      });
      const snapshot = normalizeEconomySnapshot(captureData.economy);
      if (snapshot) {
        setEconomyCache(snapshot);
        setStatus(prev => (prev ? { ...prev, economy: snapshot } : prev));
      }

      if (nextState) {
        setGameState(nextState);
      }

      if (shouldTriggerJarvis) {
        setJarvisTriggering(true);
        try {
          const jarvisRes = await fetch('/api/jarvis/chat', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              threadId: agentMode,
              message: text
            })
          });

          if (!jarvisRes.ok) {
            const msg = await jarvisRes.text().catch(() => '');
            throw new Error(msg || `jarvis ${jarvisRes.status}`);
          }

          const jarvisData = await jarvisRes.json() as { replyText?: string };
          const replyText = jarvisData?.replyText || 'Jarvis accepted the message.';
          setJarvisLastReply(replyText);
          pushUiMessage('assistant', replyText);
        } catch (jarvisError: any) {
          const failText = `Captured, but Jarvis failed: ${jarvisError?.message || String(jarvisError)}`;
          setErr(failText);
          pushUiMessage('system', failText);
        } finally {
          setJarvisTriggering(false);
          setJarvisArmed(false);
        }
      }

      setContent('');
      await refresh();
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }, [agentMode, category, content, focusPurity, gameState, jarvisArmed, parsedTags, plannedEEU, priority, progressPct, pushUiMessage, refresh, rpe, selectedQuestId, ticketId, ticketTaskType, token, type]);

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

  const purchaseShopTier = useCallback(async (tier: ShopTier) => {
    setErr(null);
    setShopPurchasing(tier);
    try {
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (token.trim()) headers.authorization = `Bearer ${token.trim()}`;

      const res = await fetch('/api/capture', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'reward',
          priority: 'low',
          category: ticketCategory,
          tags: ['shop', tier],
          content: `Shop purchase request: ${tier}`,
          source: 'chatui',
          meta: {
            shopPurchase: { tier }
          }
        })
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || `capture ${res.status}`);
      }

      const captureData = (await res.json()) as CaptureResponse;
      const effect = captureData.economyEffect || DEFAULT_ECONOMY_EFFECT;
      setLastEconomyEffect({
        ...DEFAULT_ECONOMY_EFFECT,
        ...effect
      });
      const snapshot = normalizeEconomySnapshot(captureData.economy);
      if (snapshot) {
        setEconomyCache(snapshot);
        setStatus(prev => (prev ? { ...prev, economy: snapshot } : prev));
      }
      if (captureData.shopPurchase?.ok) {
        setLastShopMessage(`${captureData.shopPurchase.name} purchased (-${captureData.shopPurchase.price} coins)`);
      } else if (captureData.shopPurchase) {
        setLastShopMessage(`Purchase blocked: ${captureData.shopPurchase.reason || 'manual_review'}`);
      } else {
        setLastShopMessage('Purchase request sent.');
      }

      await refresh();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setShopPurchasing(null);
    }
  }, [refresh, ticketCategory, token]);

  return (
    <div className="page">
      <header className="header">
        <div className="title">
          <div className="h1">
            {status?.player ? `${status.player.name} // ${status.player.handle}` : 'Alfred Console'}
          </div>
          <div className="sub">
            {status?.player?.title ? (
              <span className="bold">{status.player.title}</span>
            ) : (
              <a href="/" className="link">Dashboard</a>
            )}
            <span className="muted"> / </span>
            <button className="link-btn" onClick={refresh} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>

        <div className="header-right">
          <div className="agent-strip">
            <label className="agent-pill">
              <span className="agent-label">Agent:</span>
              <select className="agent-select" value={agentMode} onChange={e => setAgentMode(e.target.value as AgentMode)}>
                <option value="general-assistant">General Assistant</option>
              </select>
            </label>

            <label className={`jarvis-toggle ${jarvisArmed ? 'jarvis-toggle-on' : ''}`}>
              <input
                type="checkbox"
                checked={jarvisArmed}
                onChange={e => setJarvisArmed(e.target.checked)}
              />
              <span className="jarvis-track">
                <span className="jarvis-thumb" />
              </span>
              <span className="jarvis-toggle-text">
                Jarvis {jarvisArmed ? 'ON (next msg)' : 'OFF'}
              </span>
            </label>
          </div>

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
              <span className="tiny muted uppercase">Master XP</span>
              <span className="mono">{status?.overview?.totalXP ?? '…'}</span>
            </div>
            <div className="pill">
              <span className="tiny muted uppercase">WorkQuest XP</span>
              <span className="mono">{totalWorkQuestXp}</span>
            </div>
            <div className="pill">
              <span className="tiny muted uppercase">Current Streak</span>
              <span className="mono">{gameState.streakDays || status?.overview?.streakDays || 0}d</span>
            </div>
            <div className="pill">
              <span className="tiny muted uppercase">Focus Energy</span>
              <span className="mono">{todayFocus}/{gameState.dailyFocusGoal}</span>
            </div>
          </div>
        </div>
      </header>

      {err ? <div className="error">Error: {err}</div> : null}

      <main className="grid">
        <section className="card span-8">
          <div className="card-title">Capture</div>
          <div className="card-sub">Prompt capture + slash command ingest (`/log ...`) for Jarvis inbox.</div>

          <div className="form-grid">
            <label className="label">
              Type
              <select className="select" value={type} onChange={e => setType(e.target.value as CaptureType)}>
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="improvement">Improvement</option>
                <option value="reminder">Reminder</option>
                <option value="note">Note</option>
                <option value="idea">Idea</option>
                <option value="insight">Insight</option>
                <option value="link">Link</option>
              </select>
            </label>

            <label className="label">
              Category
              <select className="select" value={ticketCategory} onChange={e => setTicketCategory(e.target.value as TicketCategory)}>
                <option value="work">Work</option>
                <option value="personal">Personal</option>
                <option value="openclaw">OpenClaw</option>
                <option value="health">Health</option>
                <option value="finance">Finance</option>
                <option value="learning">Learning</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="label">
              Priority
              <select className="select" value={priority} onChange={e => setPriority(e.target.value as CapturePriority)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
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
              Tags (comma)
              <input className="input" value={tags} onChange={e => setTags(e.target.value)} placeholder="workquest, boss" />
            </label>

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

            <label className="label">
              Ticket ID (for EEU claim)
              <input
                className="input"
                value={ticketId}
                onChange={e => setTicketId(e.target.value)}
                placeholder="task-2026-02-main-quest"
              />
              <span className="tiny muted">Use the same ID on follow-up updates to enable progress claims.</span>
            </label>

            <label className="label">
              Ticket Type
              <select className="select" value={ticketTaskType} onChange={e => setTicketTaskType(e.target.value as TicketEconomyMeta['taskType'])}>
                <option value="habit">habit</option>
                <option value="daily">daily</option>
                <option value="todo">todo</option>
                <option value="reward">reward</option>
              </select>
            </label>

            <label className="label">
              Planned EEU ({plannedEEU})
              <input
                type="range"
                min={1}
                max={1000}
                value={plannedEEU}
                onChange={e => setPlannedEEU(clamp(Number(e.target.value), 1, 1000))}
              />
              <span className="tiny muted">Anchor: 100 EEU = 60 minutes deep focus.</span>
            </label>

            <label className="label">
              Ticket Progress ({progressPct}%)
              <input
                type="range"
                min={0}
                max={100}
                value={progressPct}
                onChange={e => setProgressPct(clamp(Number(e.target.value), 0, 100))}
              />
              <span className="tiny muted">Only the incremental progress delta is rewarded.</span>
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
            <button className="btn" onClick={submit} disabled={!content.trim() || jarvisTriggering}>
              {jarvisTriggering
                ? 'Jarvis processing...'
                : (jarvisArmed
                  ? 'Send + Trigger Jarvis'
                  : (currentSlashCommand?.name ? `Queue /${currentSlashCommand.name}` : 'Send to Inbox'))}
            </button>
            <div className="muted tiny">
              Last update: <span className="mono">{fmt(status?.timestamp || null)}</span>
            </div>
          </div>

          {jarvisArmed ? (
            <div className="tiny muted jarvis-hint">
              Jarvis toggle is armed. The next sent message will be forwarded to Jarvis, then toggle auto-switches to OFF.
            </div>
          ) : null}
          {jarvisLastReply ? (
            <div className="note-box">
              <div className="tiny muted">Jarvis reply</div>
              <div>{jarvisLastReply}</div>
            </div>
          ) : null}
          {lastEconomyEffect ? (
            <div className="note-box">
              <div className="tiny muted">Last economy effect</div>
              <div className="tiny">
                +{lastEconomyEffect.deltaPU ?? lastEconomyEffect.deltaEEU} PU · +{lastEconomyEffect.deltaXP} XP · +{lastEconomyEffect.deltaCoins} coins · Focus ~{lastEconomyEffect.focusMinutesEquivalent} min
              </div>
              {lastEconomyEffect.flags.length ? (
                <div className="tiny muted">Flags: {lastEconomyEffect.flags.join(', ')}</div>
              ) : null}
            </div>
          ) : null}
          {lastShopMessage ? <div className="tiny muted">{lastShopMessage}</div> : null}
          <div className="note-box">
            <div className="item-top">
              <div className="tiny muted">Recent sent messages (persisted)</div>
              <button className="link-btn" onClick={clearUiMessageLog} disabled={!messageLog.length}>
                Clear
              </button>
            </div>
            <div className="list compact">
              {messageLog.slice(0, 8).map(msg => (
                <div key={msg.id} className="item">
                  <div className="item-top">
                    <span className="badge">{msg.role}</span>
                    <span className="tiny muted mono">{fmt(msg.ts)}</span>
                  </div>
                  <div className="item-content">{msg.text}</div>
                </div>
              ))}
              {!messageLog.length ? <div className="tiny muted">No messages yet.</div> : null}
            </div>
          </div>
        </section>

        <section className="card span-4 right-panel">
          {panelMode === 'monitor' ? (
            <>
              <div className="card-title">System Monitor</div>
              <div className="card-sub">Real-time metrics from Jarvis-Workspace.</div>

              <div className="stack-10">
                <div className="metric-row">
                  <span className="muted">Vitality Score</span>
                  <strong className="mono">
                    {status?.overview?.vitalityScore ?? '…'}
                    {status?.overview?.vitalityBand ? ` (${status.overview.vitalityBand})` : ''}
                  </strong>
                </div>
                <div className="metric-row">
                  <span className="muted">Pending Inbox</span>
                  <strong className="mono">{status?.inbox?.pending ?? '…'}</strong>
                </div>
                <div className="metric-row">
                  <span className="muted">Open Tasks</span>
                  <strong className="mono">{status?.overview?.openTasks ?? '…'}</strong>
                </div>
                <div className="metric-row">
                  <span className="muted">Active Quests</span>
                  <strong className="mono">{status?.quests?.active ?? '…'}</strong>
                </div>
                <div className="metric-row">
                  <span className="muted">Daily Events</span>
                  <strong className="mono">{status?.events?.count ?? '…'}</strong>
                </div>
                <div className="note-box">
                  <div className="tiny muted uppercase">PowerUnit Economy</div>
                  <div className="metric-row">
                    <span className="muted">Today PU</span>
                    <strong className="mono">{economyView?.powerUnit?.todayPU ?? economyView?.todayEEU ?? 0}</strong>
                  </div>
                  <div className="metric-row">
                    <span className="muted">Today XP / Coins</span>
                    <strong className="mono">{economyView?.todayXP ?? 0} / {economyView?.todayCoins ?? 0}</strong>
                  </div>
                  <div className="metric-row">
                    <span className="muted">Total XP</span>
                    <strong className="mono">{economyView?.totalXP ?? 0}</strong>
                  </div>
                  <div className="metric-row">
                    <span className="muted">Coin Balance</span>
                    <strong className="mono">{economyView?.coinBalance ?? 0}</strong>
                  </div>
                  <div className="metric-row">
                    <span className="muted">Daily Cap Remaining</span>
                    <strong className="mono">{economyView?.capRemaining ?? 0}</strong>
                  </div>
                </div>
                <div className="note-box">
                  <div className="tiny muted uppercase">Reward Shop</div>
                  <div className="tiny muted">Simple 3-tier MVP shop (atomic coin debit).</div>
                  <div className="actions" style={{ marginTop: 8 }}>
                    {SHOP_OPTIONS.map(option => (
                      <button
                        key={option.id}
                        className="btn"
                        onClick={() => purchaseShopTier(option.id)}
                        disabled={Boolean(shopPurchasing)}
                        title={`${option.label} (${option.price} coins)`}
                      >
                        {shopPurchasing === option.id ? 'Processing…' : `${option.label} (${option.price})`}
                      </button>
                    ))}
                  </div>
                  {economyView?.recentFlags?.length ? (
                    <div className="tiny muted">Recent flags: {economyView.recentFlags.map(flag => flag.flag).join(', ')}</div>
                  ) : null}
                </div>
                <div className="note-box highlight">
                  <div className="tiny muted uppercase">Jarvis Recommendation</div>
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

        <section className="card span-6">
          <div className="card-title">Active Quests (Workspace)</div>
          <div className="card-sub">Major missions fetched from your Jarvis-Workspace.</div>
          <div className="list">
            {(status?.quests?.list || []).map(quest => (
              <div key={quest.id} className={`item ${clsForPriority(quest.priority)}`}>
                <div className="item-top">
                  <div className="bold">{quest.name}</div>
                  <span className={`badge badge-status-${(quest.status || 'unknown').toLowerCase()}`}>{quest.status || 'Unknown'}</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${quest.progress}%` }} />
                </div>
                <div className="item-content tiny muted">{quest.description}</div>
                <div className="tags tiny">Reward: <span className="mono">+{quest.xpReward} XP</span> · Deadline: <span className="mono">{quest.deadline}</span></div>
              </div>
            ))}
            {!status?.quests?.list?.length ? <div className="muted tiny">No active workspace quests.</div> : null}
          </div>
        </section>

        <section className="card span-6">
          <div className="card-title">Open Tasks (Workspace)</div>
          <div className="card-sub">Current prioritized to-dos from your system tasks.</div>
          <div className="list">
            {(status?.tasks?.list || []).map(task => (
              <div key={task.id} className={`item ${clsForPriority(task.priority)}`}>
                <div className="item-top">
                  <div className="bold">{task.title}</div>
                  <span className="badge muted tiny">{task.age}</span>
                </div>
                <div className="tags tiny uppercase mono muted">Priority: {task.priority}</div>
              </div>
            ))}
            {!status?.tasks?.list?.length ? <div className="muted tiny">No open workspace tasks.</div> : null}
          </div>
        </section>

        <section className="card span-6">
          <div className="card-title">OpenClaw Sessions</div>
          <div className="card-sub">Active AI agent processes and token consumption.</div>
          <div className="list">
            {(status?.openclaw?.sessions || []).map(session => (
              <div key={session.id} className="item">
                <div className="item-top">
                  <strong>{session.name}</strong>
                  <span className="badge">{session.status}</span>
                </div>
                <div className="item-content tiny">{session.task}</div>
                <div className="tags tiny mono">
                  Runtime: {session.runtime} · Tokens: {session.tokens}
                </div>
              </div>
            ))}
            {!status?.openclaw?.sessions?.length ? <div className="muted tiny">No active AI sessions.</div> : null}
          </div>
        </section>

        <section className="card span-6">
          <div className="card-title">Life Stats</div>
          <div className="card-sub">Real-time vitality tracking (Sleep, Exercise, Nutrition).</div>
          {status?.life ? (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div className="item" style={{ textAlign: 'center' }}>
                <div className="tiny muted uppercase">Sleep</div>
                <div className="bold">{status.life?.sleep?.hours ?? 0}h</div>
                <div className="tiny muted">{status.life?.sleep?.quality || 'N/A'}</div>
              </div>
              <div className="item" style={{ textAlign: 'center' }}>
                <div className="tiny muted uppercase">Nutrition</div>
                <div className="bold">{status.life?.nutrition?.calories ?? 0}kcal</div>
                <div className="tiny muted">{status.life?.nutrition?.quality || 'N/A'}</div>
              </div>
              <div className="item" style={{ textAlign: 'center' }}>
                <div className="tiny muted uppercase">Exercise</div>
                <div className="bold">{status.life?.exercise?.duration ?? 0}m</div>
                <div className="tiny muted">{status.life?.exercise?.activity || 'N/A'}</div>
              </div>
            </div>
          ) : (
            <div className="muted tiny">Life stats unavailable.</div>
          )}
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
      <div className="noise-overlay" />
      <svg style={{ position: 'fixed', width: 0, height: 0, pointerEvents: 'none' }}>
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </svg>
    </div>
  );
}
