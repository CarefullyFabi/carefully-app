export interface Message {
  role: 'user' | 'model';
  text: string;
}

export const geminiService = {
  chat: async (history: Message[], prompt: string): Promise<string> => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, prompt }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.text || '';
    } catch (error) {
      console.error("Fehler beim Chat:", error);
      return "Entschuldige, ich habe gerade Schwierigkeiten. Bitte versuche es nochmal. ✨";
    }
  }
};
