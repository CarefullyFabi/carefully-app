import type { Config } from "@netlify/functions";

export default async () => {
  const clientId = Netlify.env.get("PAYPAL_CLIENT_ID");

  if (!clientId) {
    return Response.json(
      { error: "PayPal is not configured" },
      { status: 500 },
    );
  }

  return Response.json({ clientId });
};

export const config: Config = {
  path: "/api/paypal-config",
  method: "GET",
};
