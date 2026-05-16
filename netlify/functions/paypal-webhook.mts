import type { Config, Context } from "@netlify/functions";
import { verifyWebhookSignature } from "../../lib/paypal.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { eq } from "drizzle-orm";

const MESSAGES_PER_PURCHASE = 30;

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const webhookId = Netlify.env.get("PAYPAL_WEBHOOK_ID");
  if (!webhookId) {
    return Response.json(
      { error: "PayPal webhook is not configured" },
      { status: 500 },
    );
  }

  const body = await req.text();

  const verified = await verifyWebhookSignature(req.headers, body, webhookId);
  if (!verified) {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body);

  if (event.event_type === "BILLING.SUBSCRIPTION.ACTIVATED") {
    const resource = event.resource;
    const subscriptionId = resource.id;
    const userId = resource.custom_id;

    if (!userId) {
      return Response.json({ received: true, action: "no_user_id" });
    }

    await db
      .update(users)
      .set({
        isPremium: true,
        paypalSubscriptionId: subscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return Response.json({ received: true, action: "user_upgraded" });
  }

  if (event.event_type === "BILLING.SUBSCRIPTION.CANCELLED") {
    const resource = event.resource;
    const userId = resource.custom_id;

    if (userId) {
      await db
        .update(users)
        .set({ isPremium: false, updatedAt: new Date() })
        .where(eq(users.id, userId));

      return Response.json({ received: true, action: "user_downgraded" });
    }

    return Response.json({ received: true, action: "no_user_id" });
  }

  if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
    const resource = event.resource;
    const userId = resource.custom_id;

    if (!userId) {
      return Response.json({ received: true, action: "no_user_id" });
    }

    await db
      .update(users)
      .set({
        messageCount: 0,
        purchasedMessages: MESSAGES_PER_PURCHASE,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return Response.json({ received: true, action: "messages_reset" });
  }

  return Response.json({ received: true, action: "unhandled_event" });
};

export const config: Config = {
  path: "/api/paypal-webhook",
  method: "POST",
};
