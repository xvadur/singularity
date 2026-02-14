/**
 * PR-01: Contract Foundation
 *
 * Centralized type definitions and feature flags for Singularity runtime.
 * All interfaces here are additive — they extend existing API contracts
 * without breaking backwards compatibility.
 */

// ---------------------------------------------------------------------------
// Feature Flags (per-flow dark launch)
// ---------------------------------------------------------------------------

export const FLOW_FLAGS = {
  FLOW_BRIEF: false,
  FLOW_CAPTURE: false,
  FLOW_NOTIFY: false,
  FLOW_XP: false,
} as const;

export type FlowFlagKey = keyof typeof FLOW_FLAGS;

// ---------------------------------------------------------------------------
// Capture Mode (shell-level context, Q41)
// ---------------------------------------------------------------------------

export type CaptureModeValue =
  | 'mainstream'
  | 'business'
  | 'jedlo'
  | 'cvicenie'
  | 'karol';

export interface CaptureMode {
  mode: CaptureModeValue;
}

// ---------------------------------------------------------------------------
// Gate State (backend authority, local mirror cache, Q4)
// ---------------------------------------------------------------------------

export type GateStatusValue =
  | 'none'
  | 'morning_pending'
  | 'evening_pending'
  | 'carry_pending';

export interface GateState {
  status: GateStatusValue;
  authority: 'backend';
}

// ---------------------------------------------------------------------------
// Command Lifecycle (backend authority, Q22-Q29)
// ---------------------------------------------------------------------------

export type CommandStageValue =
  | 'Accepted'
  | 'Plan'
  | 'Execution'
  | 'Measurement'
  | 'Done'
  | 'failed-final';

export interface CommandLifecycle {
  stage: CommandStageValue;
  retryCount: number;
  lastRetryAt: number | null;
}

// ---------------------------------------------------------------------------
// Notification State (Q31-Q40)
// ---------------------------------------------------------------------------

export type NotificationTypeValue = 'xp' | 'brief' | 'task' | 'system';

export interface NotificationItem {
  id: string;
  eventId: string;
  timestamp: number;
  type: NotificationTypeValue;
  message: string;
  deepLink?: string;
}

export interface NotificationState {
  items: NotificationItem[];
  highlightedId: string | null;
}

// ---------------------------------------------------------------------------
// Additive API response fields — POST /api/capture
// ---------------------------------------------------------------------------

export interface XpEngineEffect {
  deltaXU: number;
  deltaXP: number;
  deltaCoins: number;
  sessionId: string | null;
  engineVersion: string;
}

export interface CaptureResponseAdditive {
  xpEngineEffect: XpEngineEffect | null;
  gateStateAfter: GateState | null;
  notificationCandidates: NotificationItem[];
  flowFlagsApplied: Record<FlowFlagKey, boolean>;
}

// ---------------------------------------------------------------------------
// Additive API response fields — GET /api/status
// ---------------------------------------------------------------------------

export interface XpEngineStatus {
  todayXU: number;
  todayXP: number;
  todayCoins: number;
  totalXP: number;
  coinBalance: number;
  capRemaining: number;
  dailyMultiplier: number;
  engineVersion: string;
}

export interface BriefGatesStatus {
  morning: GateState;
  evening: GateState;
  carryPending: boolean;
  dayBoundary: string; // ISO 8601 of next 03:00 local
}

export interface KpiDiffStatus {
  deltaXP: number;
  deltaCoins: number;
  deltaStreak: number;
  direction: 'up' | 'down' | 'neutral';
}

export interface ActivityFeedMeta {
  retentionDays: number;
  sortOrder: 'timestamp_desc';
  tieBreak: 'eventId_desc';
}

export interface StatusResponseAdditive {
  xpEngine: XpEngineStatus | null;
  briefGates: BriefGatesStatus | null;
  kpiDiff: KpiDiffStatus | null;
  activityFeedMeta: ActivityFeedMeta | null;
}
