import { GoogleGenerativeAI } from "@google/generative-ai";

export interface Message {
  role: 'user' | 'model';
  text: string;
}

// Holt den Key sicher aus der Umgebungsvariable (wird später in Vercel gesetzt)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY; 
const genAI = new GoogleGenerativeAI(API_KEY);

export const geminiService = {
  chat: async (history: Message[], prompt: string): Promise<string> => {
    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.8,
        }
      });

      const chatHistory = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));

      const chat = model.startChat({
        history: chatHistory,
      });

      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Fehler beim Gemini-Chat:", error);
      return "Entschuldige, ich habe gerade Schwierigkeiten, dich zu verstehen. ✨";
    }
  }
};
