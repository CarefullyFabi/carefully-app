import { GoogleGenAI } from "@google/genai";
import type { Config, Context } from "@netlify/functions";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { eq, sql } from "drizzle-orm";

const FREE_MESSAGE_LIMIT = 20;
const ai = new GoogleGenAI({});

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { userId, history, prompt } = (await req.json()) as {
    userId: string;
    history: ChatMessage[];
    prompt: string;
  };

  if (!userId || typeof userId !== "string") {
    return Response.json({ error: "userId is required" }, { status: 400 });
  }

  if (!prompt || typeof prompt !== "string") {
    return Response.json({ error: "Prompt is required" }, { status: 400 });
  }

  const existing = await db.select().from(users).where(eq(users.id, userId));
  if (existing.length === 0) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const user = existing[0];

  const effectiveLimit = (user.purchasedMessages ?? 0) > 0 ? (user.purchasedMessages ?? 0) : FREE_MESSAGE_LIMIT;

  if (!user.isPremium && user.messageCount >= effectiveLimit) {
    return Response.json({
      error: "limit_reached",
      limitReached: true,
      messageCount: user.messageCount,
      remainingMessages: 0,
    });
  }

  const [updated] = await db
    .update(users)
    .set({
      messageCount: sql`${users.messageCount} + 1`,
      ipAddress: context.ip,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

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

  const newCount = updated.messageCount;

  const updatedLimit = (updated.purchasedMessages ?? 0) > 0 ? (updated.purchasedMessages ?? 0) : FREE_MESSAGE_LIMIT;

  return Response.json({
    text: response.text ?? "",
    messageCount: newCount,
    remainingMessages: updated.isPremium
      ? null
      : Math.max(0, updatedLimit - newCount),
    limitReached: !updated.isPremium && newCount >= updatedLimit,
  });
};

export const config: Config = {
  path: "/api/chat",
  method: "POST",
};
