import type { Config } from "@netlify/functions";

export default async () => {
  const clientId = Netlify.env.get("PAYPAL_CLIENT_ID");
  const planId = Netlify.env.get("PAYPAL_PLAN_ID");

  if (!clientId) {
    return Response.json(
      { error: "PayPal is not configured" },
      { status: 500 },
    );
  }

  return Response.json({ clientId, planId: planId || null });
};

export const config: Config = {
  path: "/api/paypal-config",
  method: "GET",
};
