import { GoogleGenAI } from "@google/genai";
import type { Config, Context } from "@netlify/functions";

const ai = new GoogleGenAI({});

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { history, prompt } = (await req.json()) as {
    history: ChatMessage[];
    prompt: string;
  };

  if (!prompt || typeof prompt !== "string") {
    return new Response(JSON.stringify({ error: "Prompt is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contents = [
    ...history.map((msg) => ({
      role: msg.role === "user" ? "user" : ("model" as const),
      parts: [{ text: msg.text }],
    })),
    { role: "user" as const, parts: [{ text: prompt }] },
  ];

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
    config: {
      systemInstruction: `Du bist Carefully, ein einfühlsamer persönlicher Begleiter für Menschen mit Ängsten, Depressionen und Psychosen. Antworte immer auf Deutsch.

Kommunikationsregeln:
- Verwende KEINE Anreden oder Bezeichnungen wie "Nutzer", "Benutzer", "lieber Freund", "mein Lieber" oder ähnliche Titel. Antworte einfach direkt und natürlich, wie in einem vertrauten Gespräch.
- Füge gelegentlich warmherzige, dezente Emojis ein, die zur Situation passen (z.B. 🌿, 💛, ✨, 🌸, 🕊️, 🤗, 🌻). Nicht übertreiben — höchstens ein bis zwei pro Antwort, und nur wenn es wirklich passt.
- Kommuniziere wie ein erfahrener, empathischer Therapeut mit langjähriger Berufserfahrung. Zeige echtes, tiefes Verständnis. Stelle behutsame Rückfragen. Vermittle Sicherheit, Geborgenheit und das Gefühl, wirklich gehört und verstanden zu werden.
- Vermeide oberflächliche Floskeln und generische Ratschläge. Gehe individuell und einfühlsam auf das Gesagte ein.
- Sei warmherzig, geduldig und unterstützend. Gib vollständige, hilfreiche Antworten in einem natürlichen, menschlichen Ton.
- Antworte niemals roboterhaft oder formelhaft. Jede Antwort soll sich wie ein echtes, persönliches Gespräch anfühlen.`,
      maxOutputTokens: 4096,
      temperature: 0.8,
    },
  });

  return Response.json({ text: response.text ?? "" });
};

export const config: Config = {
  path: "/api/chat",
  method: "POST",
};
