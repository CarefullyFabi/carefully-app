import type { Config, Context } from "@netlify/functions";
import { getSubscriptionDetails } from "../../lib/paypal.js";
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

  const { userId, subscriptionId } = (await req.json()) as {
    userId: string;
    subscriptionId: string;
  };

  if (!userId || !subscriptionId) {
    return Response.json(
      { error: "userId and subscriptionId are required" },
      { status: 400 },
    );
  }

  let details: { status: string; customId?: string };
  try {
    details = await getSubscriptionDetails(subscriptionId);
  } catch (err) {
    console.error("PayPal subscription retrieval failed:", err);
    return Response.json(
      { success: false, reason: "Zahlung konnte nicht verifiziert werden." },
      { status: 502 },
    );
  }

  if (details.status !== "ACTIVE") {
    return Response.json({
      success: false,
      reason: "Subscription not active",
    });
  }

  if (details.customId && details.customId !== userId) {
    return Response.json({ success: false, reason: "User mismatch" });
  }

  await db
    .update(users)
    .set({
      isPremium: true,
      paypalSubscriptionId: subscriptionId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return Response.json({ success: true, isPremium: true });
};

export const config: Config = {
  path: "/api/verify-payment",
  method: "POST",
};
