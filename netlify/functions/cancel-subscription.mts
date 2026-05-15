import type { Config, Context } from "@netlify/functions";
import { cancelSubscription } from "../../lib/paypal.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const clientId = Netlify.env.get("PAYPAL_CLIENT_ID");
  if (!clientId) {
    return Response.json(
      { error: "PayPal is not configured" },
      { status: 500 },
    );
  }

  const { userId } = (await req.json()) as { userId: string };

  if (!userId || typeof userId !== "string") {
    return Response.json({ error: "userId is required" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));
  if (existing.length === 0) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const user = existing[0];
  let subscriptionId = user.paypalSubscriptionId;

  if (!subscriptionId) {
    const clientIp = context.ip;
    if (clientIp) {
      const ipUsers = await db
        .select()
        .from(users)
        .where(eq(users.ipAddress, clientIp));
      const premiumUser = ipUsers.find(
        (u) => u.isPremium && u.paypalSubscriptionId,
      );
      if (premiumUser) {
        subscriptionId = premiumUser.paypalSubscriptionId;
      }
    }
  }

  if (!subscriptionId) {
    return Response.json(
      { error: "No active subscription found" },
      { status: 400 },
    );
  }

  try {
    await cancelSubscription(subscriptionId, "Vom Benutzer gekündigt");
  } catch (err) {
    console.error("PayPal cancel subscription failed:", err);
    return Response.json(
      { error: "Abo konnte nicht gekündigt werden." },
      { status: 502 },
    );
  }

  await db
    .update(users)
    .set({ isPremium: false, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return Response.json({ success: true });
};

export const config: Config = {
  path: "/api/cancel-subscription",
  method: "POST",
};
