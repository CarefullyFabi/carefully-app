import type { Config, Context } from "@netlify/functions";
import Stripe from "stripe";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const secretKey = Netlify.env.get("STRIPE_SECRET_KEY");
    if (!secretKey) {
      return Response.json(
        { error: "Stripe ist nicht konfiguriert." },
        { status: 500 },
      );
    }

    let body: { userId?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "Ungültige Anfrage." },
        { status: 400 },
      );
    }

    const { userId } = body;
    if (!userId || typeof userId !== "string") {
      return Response.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const existing = await db.select().from(users).where(eq(users.id, userId));
    if (existing.length === 0) {
      return Response.json(
        { error: "Benutzer nicht gefunden." },
        { status: 404 },
      );
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
        client_reference_id: userId,
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

    try {
      await db
        .update(users)
        .set({ stripeSessionId: session.id, updatedAt: new Date() })
        .where(eq(users.id, userId));
    } catch (dbErr) {
      console.error("Failed to update stripeSessionId:", dbErr);
    }

    return Response.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error("create-checkout unexpected error:", err);
    return Response.json(
      { error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
};

export const config: Config = {
  path: "/api/create-checkout",
  method: "POST",
};
