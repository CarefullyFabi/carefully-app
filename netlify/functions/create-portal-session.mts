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
    return Response.json({ error: "Stripe is not configured" }, { status: 500 });
  }

  const { userId } = (await req.json()) as { userId: string };

  if (!userId || typeof userId !== "string") {
    return Response.json({ error: "userId is required" }, { status: 400 });
  }

  const existing = await db.select().from(users).where(eq(users.id, userId));
  if (existing.length === 0) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const user = existing[0];
  let stripeSessionId = user.stripeSessionId;

  if (!stripeSessionId) {
    const clientIp = context.ip;
    if (clientIp) {
      const ipUsers = await db.select().from(users).where(eq(users.ipAddress, clientIp));
      const premiumUser = ipUsers.find((u) => u.isPremium && u.stripeSessionId);
      if (premiumUser) {
        stripeSessionId = premiumUser.stripeSessionId;
      }
    }
  }

  if (!stripeSessionId) {
    return Response.json({ error: "No active subscription found" }, { status: 400 });
  }

  const stripe = new Stripe(secretKey);

  const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
  const customerId = session.customer as string;

  if (!customerId) {
    return Response.json({ error: "No customer found" }, { status: 400 });
  }

  const siteUrl = Netlify.env.get("URL") || "http://localhost:8888";

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: siteUrl,
  });

  return Response.json({ url: portalSession.url });
};

export const config: Config = {
  path: "/api/create-portal-session",
  method: "POST",
};
