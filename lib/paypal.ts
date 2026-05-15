import {
  ApiError,
  CheckoutPaymentIntent,
  Client,
  Environment,
  LogLevel,
  OrdersController,
} from "@paypal/paypal-server-sdk";

function getClient(): Client {
  const clientId = Netlify.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Netlify.env.get("PAYPAL_CLIENT_SECRET");
  const sandbox = Netlify.env.get("PAYPAL_SANDBOX");

  if (!clientId || !clientSecret) {
    throw new Error("PayPal ist nicht konfiguriert.");
  }

  return new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: clientId,
      oAuthClientSecret: clientSecret,
    },
    timeout: 0,
    environment:
      sandbox === "true" ? Environment.Sandbox : Environment.Production,
    logging: {
      logLevel: LogLevel.Info,
      logRequest: { logBody: true },
      logResponse: { logHeaders: true },
    },
  });
}

export async function createOrder(
  cart: Array<{ id: string; quantity: string }>,
): Promise<{ id: string; status: string }> {
  const client = getClient();
  const ordersController = new OrdersController(client);

  const collect = {
    body: {
      intent: CheckoutPaymentIntent.Capture,
      purchaseUnits: [
        {
          amount: {
            currencyCode: "USD",
            value: "100",
            breakdown: {
              itemTotal: {
                currencyCode: "USD",
                value: "100",
              },
            },
          },
          items: [
            {
              name: "T-Shirt",
              unitAmount: {
                currencyCode: "USD",
                value: "100",
              },
              quantity: "1",
              description: "Super Fresh Shirt",
              sku: "sku01",
            },
          ],
        },
      ],
    },
    prefer: "return=minimal",
  };

  try {
    const response = await ordersController.createOrder(collect);
    return response.result as unknown as { id: string; status: string };
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Error(error.message);
    }
    throw error;
  }
}

export async function captureOrder(
  orderID: string,
): Promise<Record<string, unknown>> {
  const client = getClient();
  const ordersController = new OrdersController(client);

  const collect = {
    id: orderID,
    prefer: "return=minimal",
  };

  try {
    const response = await ordersController.captureOrder(collect);
    return response.result as unknown as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Error(error.message);
    }
    throw error;
  }
}

function getPayPalApiUrl(): string {
  const sandbox = Netlify.env.get("PAYPAL_SANDBOX");
  return sandbox === "true"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
}

export async function getPayPalAccessToken(): Promise<string> {
  const clientId = Netlify.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Netlify.env.get("PAYPAL_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("PayPal ist nicht konfiguriert.");
  }

  const response = await fetch(`${getPayPalApiUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error("PayPal-Authentifizierung fehlgeschlagen.");
  }

  const data = await response.json();
  return data.access_token;
}

export async function createSubscription(
  planId: string,
  returnUrl: string,
  cancelUrl: string,
  userId: string,
): Promise<{ subscriptionId: string; approvalUrl: string }> {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(
    `${getPayPalApiUrl()}/v1/billing/subscriptions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: userId,
        application_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
          brand_name: "Carefully",
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error("PayPal-Abo konnte nicht erstellt werden.");
  }

  const data = await response.json();
  const approveLink = data.links?.find(
    (l: { rel: string }) => l.rel === "approve",
  );

  if (!approveLink?.href) {
    throw new Error("PayPal-Genehmigungslink nicht gefunden.");
  }

  return { subscriptionId: data.id, approvalUrl: approveLink.href };
}

export async function getSubscriptionDetails(
  subscriptionId: string,
): Promise<{ status: string; customId?: string }> {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(
    `${getPayPalApiUrl()}/v1/billing/subscriptions/${subscriptionId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error("PayPal-Abo konnte nicht abgerufen werden.");
  }

  const data = await response.json();
  return { status: data.status, customId: data.custom_id };
}

export async function cancelSubscription(
  subscriptionId: string,
  reason: string,
): Promise<void> {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(
    `${getPayPalApiUrl()}/v1/billing/subscriptions/${subscriptionId}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    },
  );

  if (!response.ok) {
    throw new Error("PayPal-Abo konnte nicht gekündigt werden.");
  }
}

export async function verifyWebhookSignature(
  headers: Headers,
  body: string,
  webhookId: string,
): Promise<boolean> {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(
    `${getPayPalApiUrl()}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: webhookId,
        webhook_event: JSON.parse(body),
      }),
    },
  );

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  return data.verification_status === "SUCCESS";
}
