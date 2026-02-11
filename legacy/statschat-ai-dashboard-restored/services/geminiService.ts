import { Message } from '../types';

type JarvisChatResponse = {
  ok?: boolean;
  error?: string;
  sessionKey?: string;
  runId?: string;
  replyText?: string;
};

function sanitizeThreadId(threadId?: string) {
  return String(threadId || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function buildSessionKey(threadId?: string) {
  const cleaned = sanitizeThreadId(threadId);
  if (cleaned) return `agent:main:webchat:${cleaned}`;
  return 'agent:main:main';
}

export const sendMessageToGemini = async (
  _history: Message[],
  newMessage: string,
  _systemInstruction: string,
  threadId?: string
): Promise<string> => {
  const message = newMessage.trim();
  if (!message) {
    return 'Error: Empty message.';
  }

  const sessionKey = buildSessionKey(threadId);

  try {
    const res = await fetch('/api/jarvis/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sessionKey,
        threadId,
        message,
        timeoutMs: 90000
      })
    });

    const data = (await res.json()) as JarvisChatResponse;
    if (!res.ok || !data?.ok) {
      return `Error: ${data?.error || `Jarvis request failed (${res.status})`}`;
    }

    const reply = (data.replyText || '').trim();
    return reply || 'Jarvis returned no text response.';
  } catch (error: any) {
    return `Error: ${error?.message || 'Unable to reach Jarvis backend.'}`;
  }
};
