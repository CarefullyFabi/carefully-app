import type { Config, Context } from "@netlify/functions";
import Stripe from "stripe";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secretKey = Netlify.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Netlify.env.get("STRIPE_WEBHOOK_SECRET");

  if (!secretKey || !webhookSecret) {
    return new Response(
      JSON.stringify({ error: "Stripe is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const stripe = new Stripe(secretKey);
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      return Response.json({ received: true, action: "payment_not_paid" });
    }

    const userId =
      session.metadata?.userId || session.client_reference_id;

    if (!userId) {
      return Response.json({ received: true, action: "no_user_id" });
    }

    await db
      .update(users)
      .set({
        isPremium: true,
        stripeSessionId: session.id,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return Response.json({ received: true, action: "user_upgraded" });
  }

  return Response.json({ received: true, action: "unhandled_event" });
};

export const config: Config = {
  path: "/api/stripe-webhook",
  method: "POST",
};
