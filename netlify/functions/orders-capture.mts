import type { Config, Context } from "@netlify/functions";
import { captureOrder } from "../../lib/paypal.js";

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

  try {
    const orderData = await captureOrder(orderID);
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
