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
      maxOutputTokens: 500,
      temperature: 0.8,
    },
  });

  return Response.json({ text: response.text ?? "" });
};

export const config: Config = {
  path: "/api/chat",
  method: "POST",
};
