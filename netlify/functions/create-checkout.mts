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

  const stripe = new Stripe(secretKey);

  const siteUrl = Netlify.env.get("URL") || "http://localhost:8888";

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Carefully Premium",
              description:
                "Unbegrenzter Zugang zu Carefully – deinem persönlichen Begleiter",
            },
            unit_amount: 499,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${siteUrl}?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}?payment_cancelled=true`,
      subscription_data: {
        metadata: {
          userId,
        },
      },
      metadata: {
        userId,
      },
    });
  } catch (err) {
    console.error("Stripe checkout session creation failed:", err);
    return Response.json(
      { error: "Zahlung konnte nicht gestartet werden. Bitte versuche es später erneut." },
      { status: 502 },
    );
  }

  await db
    .update(users)
    .set({ stripeSessionId: session.id, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return Response.json({ sessionId: session.id, url: session.url });
};

export const config: Config = {
  path: "/api/create-checkout",
  method: "POST",
};
