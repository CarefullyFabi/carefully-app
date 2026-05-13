import type { Config, Context } from "@netlify/functions";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { eq, sql } from "drizzle-orm";

const FREE_MESSAGE_LIMIT = 20;

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { userId } = (await req.json()) as { userId: string };

  if (!userId || typeof userId !== "string") {
    return new Response(JSON.stringify({ error: "userId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const existing = await db.select().from(users).where(eq(users.id, userId));

  if (existing.length === 0) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = existing[0];

  if (!user.isPremium && user.messageCount >= FREE_MESSAGE_LIMIT) {
    return Response.json({
      allowed: false,
      messageCount: user.messageCount,
      isPremium: false,
      limitReached: true,
    });
  }

  const [updated] = await db
    .update(users)
    .set({
      messageCount: sql`${users.messageCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return Response.json({
    allowed: true,
    messageCount: updated.messageCount,
    isPremium: updated.isPremium,
    limitReached: !updated.isPremium && updated.messageCount >= FREE_MESSAGE_LIMIT,
  });
};

export const config: Config = {
  path: "/api/user-message",
  method: "POST",
};
