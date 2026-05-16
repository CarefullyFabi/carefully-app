import type { Config, Context } from "@netlify/functions";
import { createOrder } from "../../lib/paypal.js";

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { cart, userId } = (await req.json()) as {
      cart: Array<{ id: string; quantity: string }>;
      userId?: string;
    };

    const order = await createOrder(cart, userId);
    return Response.json(order);
  } catch (error) {
    console.error("Failed to create order:", error);
    return Response.json(
      { error: "Failed to create order." },
      { status: 500 },
    );
  }
};

export const config: Config = {
  path: "/api/orders",
  method: "POST",
};
