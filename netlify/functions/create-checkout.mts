import type { Config, Context } from "@netlify/functions";
import { createSubscription } from "../../lib/paypal.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const planId = Netlify.env.get("PAYPAL_PLAN_ID");
    if (!planId) {
      return Response.json(
        { error: "PayPal ist nicht konfiguriert." },
        { status: 500 },
      );
    }

    let body: { userId?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
    }

    const { userId } = body;
    if (!userId || typeof userId !== "string") {
      return Response.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    if (existing.length === 0) {
      return Response.json(
        { error: "Benutzer nicht gefunden." },
        { status: 404 },
      );
    }

    const siteUrl = Netlify.env.get("URL") || "http://localhost:8888";
    const returnUrl = `${siteUrl}?paypal_success=true`;
    const cancelUrl = `${siteUrl}?paypal_cancelled=true`;

    let result: { subscriptionId: string; approvalUrl: string };
    try {
      result = await createSubscription(planId, returnUrl, cancelUrl, userId);
    } catch (err) {
      console.error("PayPal subscription creation failed:", err);
      return Response.json(
        {
          error:
            "Zahlung konnte nicht gestartet werden. Bitte versuche es später erneut.",
        },
        { status: 502 },
      );
    }

    try {
      await db
        .update(users)
        .set({
          paypalSubscriptionId: result.subscriptionId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    } catch (dbErr) {
      console.error("Failed to update paypalSubscriptionId:", dbErr);
    }

    return Response.json({
      subscriptionId: result.subscriptionId,
      url: result.approvalUrl,
    });
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
