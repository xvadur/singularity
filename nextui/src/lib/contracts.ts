export type StatusResponse = {
  timestamp: string;
  player: {
    name: string;
    level: number;
    totalXP: number;
    xpToNext: number;
    streak: number;
    [key: string]: unknown;
  };
  overview?: {
    inboxPending?: number | null;
    pendingCommands?: number | null;
    openTasks?: number;
    vitalityScore?: number | null;
    [key: string]: unknown;
  };
  inbox?: {
    pending: number | null;
    totalCaptured: number | null;
    list: Array<{
      id: string;
      type: string;
      content: string;
      capturedAt: string;
      priority?: string;
      tags?: string[];
    }>;
  };
  commands?: {
    pending: number | null;
    totalQueued: number | null;
    list: Array<{
      id: string | null;
      command: string | null;
      args?: string;
      source?: string | null;
      createdAt?: string | null;
      status?: string;
    }>;
  };
  economy?: unknown;
  [key: string]: unknown;
};

export type CaptureRequest = {
  content: string;
  source?: string;
  threadId?: string | null;
  sessionKey?: string;
  type?: string;
  priority?: string;
  tags?: string[];
  meta?: Record<string, unknown> | null;
};

export type CaptureResponse = {
  ok: boolean;
  item?: {
    id: string;
    type: string;
    content: string;
    source: string;
    capturedAt: string;
    processed: boolean;
    priority?: string;
    tags?: string[];
    meta?: Record<string, unknown> | null;
  };
  queuedCommand?: {
    id: string;
    command: string;
    args?: string;
    raw?: string;
    source?: string;
    threadId?: string | null;
    sessionKey?: string | null;
    status: string;
    createdAt: string;
  } | null;
  economyEffect?: unknown;
  shopPurchase?: unknown;
  economy?: unknown;
  error?: string;
  timestamp?: string;
};

