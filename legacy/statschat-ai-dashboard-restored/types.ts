
export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: Date;
  wordCount: number;
}

export interface ChatThread {
  id: string;
  title: string;
  updatedAt: Date;
  messages: Message[];
}

export interface AgentConfig {
  id: string;
  name: string;
  systemInstruction: string;
  color: string;
}

export interface DailyStats {
  wordsSent: number;
  promptsSent: number;
  hourlyActivity: { hour: number; words: number }[];
}

export interface CalendarEvent {
  id: string;
  date: string; // Format: YYYY-MM-DD
  text: string;
}

export type DashboardView = 'default' | 'heatmap' | 'cognitive' | 'linguistic' | 'indexing';

export type DailyActivityStat = {
  date: string;       // ISO date string: "2025-11-21"
  wordCount: number;  // total words written that day
  promptCount: number;// number of prompts that day
};
