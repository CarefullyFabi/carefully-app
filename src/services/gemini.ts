export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface ChatResponse {
  text: string;
  messageCount: number;
  remainingMessages: number | null;
  limitReached: boolean;
}

export interface ChatError {
  error: 'limit_reached';
  limitReached: true;
  messageCount: number;
  remainingMessages: number;
}

export type ChatResult =
  | { ok: true; data: ChatResponse }
  | { ok: false; limitReached: true; messageCount: number }
  | { ok: false; limitReached: false; error: string };

export const geminiService = {
  chat: async (userId: string, history: Message[], prompt: string): Promise<ChatResult> => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, history, prompt }),
    });

    const data = await response.json();

    if (data.error === 'limit_reached') {
      return { ok: false, limitReached: true, messageCount: data.messageCount };
    }

    if (!response.ok) {
      return { ok: false, limitReached: false, error: data.error || 'Unknown error' };
    }

    return { ok: true, data };
  }
};
