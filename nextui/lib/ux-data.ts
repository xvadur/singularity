export type StatCard = {
  label: string;
  value: string;
  note: string;
  tone?: "primary" | "success" | "warning" | "default";
};

export const commandCenterStats: StatCard[] = [
  { label: "Today PU", value: "847", note: "34% of daily cap", tone: "primary" },
  { label: "XP Earned", value: "4,280", note: "85% of level target", tone: "success" },
  { label: "Queue Pending", value: "3", note: "Next run 03:00 local", tone: "warning" },
  { label: "Streak", value: "7 days", note: "No misses this week", tone: "default" },
];

export const activityFeed = [
  "10:42 Captured ticket: Implement PowerUnit economy scoring model",
  "10:45 Jarvis queue status requested in runtime thread",
  "11:05 Daily brief updated: Utorok 12.2 Main quest",
  "11:19 Slash command /log synced into queue JSON",
];

export const systemsFeed = [
  { name: "Capture API", status: "Operational" },
  { name: "Jarvis Gateway", status: "Connected" },
  { name: "Queue Processor", status: "Idle" },
  { name: "03:00 Cleanup", status: "Scheduled" },
];

export type ThreadMessage = {
  role: "user" | "jarvis";
  text: string;
  meta: string;
};

export const threadMessages: ThreadMessage[] = [
  {
    role: "user",
    text: "/capture Implement PowerUnit economy scoring model",
    meta: "10:42 AM",
  },
  {
    role: "jarvis",
    text:
      "Captured: Implement PowerUnit economy scoring model\n\nQueued as pending ticket. Economy effect:\n• +47 PU (plannedEEU: 200, progress: 35%)\n• +28 XP\n• +6 coins",
    meta: "10:42 AM · Jarvis",
  },
  {
    role: "user",
    text: "Show me today's queue status",
    meta: "10:45 AM",
  },
  {
    role: "jarvis",
    text:
      "Queue Status — Utorok 12.2\n\nPending: 3 items\nProcessing: 1 item\nCompleted today: 7 items\n\nNext scheduled run: 03:00 local",
    meta: "10:45 AM · Jarvis",
  },
];

export const slashCommands = ["/capture", "/status", "/queue", "/brief", "/journal"];

export const sessionStats = [
  { value: "1,247", label: "Words Today" },
  { value: "42 min", label: "Focus Time" },
  { value: "18", label: "Messages" },
  { value: "5", label: "Commands" },
];

export const rollingTotals = [
  { label: "24h", value: "3,412 words · 847 PU" },
  { label: "7d", value: "18,920 words · 4,280 PU" },
  { label: "30d", value: "72,100 words · 15,400 PU" },
];

export const economyQuickView = [
  { label: "Today PU", value: "847 / 2,500", tone: "primary" },
  { label: "XP", value: "4,280 / 5,000", tone: "default" },
  { label: "Coins", value: "89", tone: "default" },
  { label: "Streak", value: "7 days", tone: "success" },
];

export const puStats: StatCard[] = [
  {
    label: "Daily PU Budget",
    value: "847 / 2,500",
    note: "34% used · Soft start at 1,200",
    tone: "primary",
  },
  {
    label: "Repeat Factor",
    value: "0.77x",
    note: "2 claims today · 1/(1+0.15×2)",
    tone: "warning",
  },
  {
    label: "Soft Slowdown",
    value: "1.00x",
    note: "Below soft start · Full rate active",
    tone: "success",
  },
  {
    label: "Claims Today",
    value: "7",
    note: "Across 4 tickets · No audit flags",
    tone: "default",
  },
];

export const taskRows = [
  {
    task: "Implement Dashboard UX",
    type: "todo",
    priority: "high",
    progress: 70,
    planned: 350,
    earned: 245,
    status: "In Progress",
  },
  {
    task: "PowerUnit Recovery Engine",
    type: "habit",
    priority: "normal",
    progress: 30,
    planned: 500,
    earned: 150,
    status: "Queued",
  },
  {
    task: "Morning Brief Automation",
    type: "daily",
    priority: "high",
    progress: 90,
    planned: 180,
    earned: 162,
    status: "Ready",
  },
];
