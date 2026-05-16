import type { Config, Context } from "@netlify/functions";
import { createOrderWithRedirect } from "../../lib/paypal.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
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

    let result: { orderId: string; approvalUrl: string };
    try {
      result = await createOrderWithRedirect(returnUrl, cancelUrl, userId);
    } catch (err) {
      console.error("PayPal order creation failed:", err);
      return Response.json(
        {
          error:
            "Zahlung konnte nicht gestartet werden. Bitte versuche es später erneut.",
        },
        { status: 502 },
      );
    }

    return Response.json({
      orderId: result.orderId,
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
