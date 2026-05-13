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
  if (!secretKey) {
    return new Response(
      JSON.stringify({ error: "Stripe is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const { userId, sessionId } = (await req.json()) as {
    userId: string;
    sessionId: string;
  };

  if (!userId || !sessionId) {
    return new Response(
      JSON.stringify({ error: "userId and sessionId are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const stripe = new Stripe(secretKey);

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    return Response.json({ success: false, reason: "Payment not completed" });
  }

  const sessionUserId = session.metadata?.userId || session.client_reference_id;
  if (sessionUserId !== userId) {
    return Response.json({ success: false, reason: "User mismatch" });
  }

  await db
    .update(users)
    .set({
      isPremium: true,
      stripeSessionId: sessionId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return Response.json({ success: true, isPremium: true });
};

export const config: Config = {
  path: "/api/verify-payment",
  method: "POST",
};
