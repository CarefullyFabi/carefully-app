import type { Config, Context } from "@netlify/functions";
import { createOrder } from "../../lib/paypal.js";

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let userId: string | undefined;
  try {
    const body = await req.json();
    userId = body.userId;
  } catch {}

  try {
    const order = await createOrder("3.99", "EUR", userId);
    return Response.json({ id: order.id });
  } catch (error) {
    console.error("Failed to create order:", error);
    return Response.json(
      { error: "Failed to create order." },
      { status: 500 },
    );
  }
};

export const config: Config = {
  path: "/api/create-order",
  method: "POST",
};
