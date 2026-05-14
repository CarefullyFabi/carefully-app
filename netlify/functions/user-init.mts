import type { Config, Context } from "@netlify/functions";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { eq } from "drizzle-orm";

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

  const clientIp = context.ip;

  const existing = await db.select().from(users).where(eq(users.id, userId));

  if (existing.length > 0) {
    const user = existing[0];
    if (clientIp && user.ipAddress !== clientIp) {
      await db
        .update(users)
        .set({ ipAddress: clientIp, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }
    return Response.json({
      userId: user.id,
      messageCount: user.messageCount,
      isPremium: user.isPremium,
      limitReached: !user.isPremium && user.messageCount >= FREE_MESSAGE_LIMIT,
    });
  }

  let inheritedCount = 0;
  if (clientIp) {
    const ipUsers = await db
      .select()
      .from(users)
      .where(eq(users.ipAddress, clientIp));
    const maxCount = ipUsers.reduce(
      (max, u) => Math.max(max, u.messageCount),
      0,
    );
    const anyPremium = ipUsers.some((u) => u.isPremium);
    if (!anyPremium && maxCount > 0) {
      inheritedCount = maxCount;
    }
  }

  const [newUser] = await db
    .insert(users)
    .values({
      id: userId,
      messageCount: inheritedCount,
      ipAddress: clientIp || null,
    })
    .returning();

  return Response.json({
    userId: newUser.id,
    messageCount: newUser.messageCount,
    isPremium: newUser.isPremium,
    limitReached:
      !newUser.isPremium && newUser.messageCount >= FREE_MESSAGE_LIMIT,
  });
};

export const config: Config = {
  path: "/api/user-init",
  method: "POST",
};
