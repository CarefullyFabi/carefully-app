import type { Config, Context } from "@netlify/functions";
import { captureOrder } from "../../lib/paypal.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { eq, sql } from "drizzle-orm";

const MESSAGES_PER_PURCHASE = 50;

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const orderIndex = segments.indexOf("orders");
  const orderID = segments[orderIndex + 1];

  if (!orderID) {
    return Response.json({ error: "Order ID is required" }, { status: 400 });
  }

  let userId: string | undefined;
  try {
    const body = await req.json();
    userId = body.userId;
  } catch {}

  try {
    const orderData = await captureOrder(orderID);

    if (userId) {
      await db
        .update(users)
        .set({
          purchasedMessages: sql`${users.purchasedMessages} + ${MESSAGES_PER_PURCHASE}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    return Response.json(orderData);
  } catch (error) {
    console.error("Failed to capture order:", error);
    return Response.json(
      { error: "Failed to capture order." },
      { status: 500 },
    );
  }
};

export const config: Config = {
  path: "/api/orders/:orderID/capture",
  method: "POST",
};
