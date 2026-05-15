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
    const effectiveLimit = FREE_MESSAGE_LIMIT + (user.purchasedMessages ?? 0);
    return Response.json({
      userId: user.id,
      messageCount: user.messageCount,
      isPremium: user.isPremium,
      purchasedMessages: user.purchasedMessages ?? 0,
      limitReached: !user.isPremium && user.messageCount >= effectiveLimit,
    });
  }

  let inheritedCount = 0;
  let inheritedPremium = false;
  let inheritedPaypalSubscriptionId: string | null = null;
  let inheritedPurchasedMessages = 0;

  if (clientIp) {
    const ipUsers = await db
      .select()
      .from(users)
      .where(eq(users.ipAddress, clientIp));

    const maxCount = ipUsers.reduce(
      (max, u) => Math.max(max, u.messageCount),
      0,
    );
    if (maxCount > 0) {
      inheritedCount = maxCount;
    }

    const maxPurchased = ipUsers.reduce(
      (max, u) => Math.max(max, u.purchasedMessages ?? 0),
      0,
    );
    if (maxPurchased > 0) {
      inheritedPurchasedMessages = maxPurchased;
    }

    const premiumUser = ipUsers.find((u) => u.isPremium);
    if (premiumUser) {
      inheritedPremium = true;
      inheritedPaypalSubscriptionId = premiumUser.paypalSubscriptionId;
    }
  }

  const [newUser] = await db
    .insert(users)
    .values({
      id: userId,
      messageCount: inheritedCount,
      purchasedMessages: inheritedPurchasedMessages,
      isPremium: inheritedPremium,
      paypalSubscriptionId: inheritedPaypalSubscriptionId,
      ipAddress: clientIp || null,
    })
    .returning();

  const newEffectiveLimit = FREE_MESSAGE_LIMIT + (newUser.purchasedMessages ?? 0);
  return Response.json({
    userId: newUser.id,
    messageCount: newUser.messageCount,
    isPremium: newUser.isPremium,
    purchasedMessages: newUser.purchasedMessages ?? 0,
    limitReached:
      !newUser.isPremium && newUser.messageCount >= newEffectiveLimit,
  });
};

export const config: Config = {
  path: "/api/user-init",
  method: "POST",
};
