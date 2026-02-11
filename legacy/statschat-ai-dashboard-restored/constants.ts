import { AgentConfig } from './types';

export const AGENTS: AgentConfig[] = [
  {
    id: 'default',
    name: 'General Assistant',
    systemInstruction: 'You are a helpful, concise, and friendly AI assistant.',
    color: 'bg-blue-500'
  },
  {
    id: 'creative',
    name: 'Creative Writer',
    systemInstruction: 'You are a creative writer. Use vivid imagery, metaphors, and an engaging tone. Be expressive.',
    color: 'bg-purple-500'
  },
  {
    id: 'technical',
    name: 'Technical Expert',
    systemInstruction: 'You are a technical expert. Provide precise, code-heavy, and technically accurate responses. Avoid fluff.',
    color: 'bg-green-500'
  },
  {
    id: 'skeptic',
    name: 'Critical Thinker',
    systemInstruction: 'You are a critical thinker. Challenge assumptions, look for logical fallacies, and provide balanced perspectives.',
    color: 'bg-red-500'
  }
];
