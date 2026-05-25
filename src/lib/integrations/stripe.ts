import Stripe from "stripe";

export interface StripeConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
}

export interface CreateCheckoutSessionParams {
  userId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
  customerId?: string;
}

export interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface StripeSubscription {
  id: string;
  customerId: string;
  status: Stripe.Subscription.Status;
  currentPeriodEnd: Date;
  priceId: string;
  metadata?: Record<string, string>;
}

export interface StripePrice {
  id: string;
  productId: string;
  unitAmount: number;
  currency: string;
  interval?: "month" | "year" | "week" | "day";
  intervalCount?: number;
}

let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY in environment.");
  }

  stripeClient = new Stripe(secretKey);
  return stripeClient;
}

function normalizeMetadata(
  metadata?: Record<string, string>
): Record<string, string> | undefined {
  if (!metadata) return undefined;
  const normalized = Object.entries(metadata).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (!key) return acc;
      acc[key] = String(value);
      return acc;
    },
    {}
  );
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<CheckoutSessionResult> {
  const stripe = getStripeClient();

  const price = await stripe.prices.retrieve(params.priceId);
  const mode: Stripe.Checkout.SessionCreateParams.Mode = price.recurring
    ? "subscription"
    : "payment";

  const metadata = normalizeMetadata({
    ...(params.metadata || {}),
    user_id: params.userId,
    provider_price_id: params.priceId,
  });

  const session = await stripe.checkout.sessions.create({
    mode,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    line_items: [{ price: params.priceId, quantity: 1 }],
    client_reference_id: params.userId,
    customer: params.customerId,
    metadata,
    ...(mode === "subscription"
      ? {
          subscription_data: {
            metadata,
          },
        }
      : {}),
    ...(mode === "payment"
      ? {
          payment_intent_data: {
            metadata,
          },
        }
      : {}),
  });

  if (!session.url) {
    throw new Error(
      "Stripe checkout session was created without a redirect URL."
    );
  }

  return {
    sessionId: session.id,
    url: session.url,
    customerId:
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id || params.customerId,
  };
}

export async function createCustomer(
  email: string,
  name?: string,
  metadata?: Record<string, string>
): Promise<StripeCustomer> {
  const stripe = getStripeClient();

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: normalizeMetadata(metadata),
  });

  return {
    id: customer.id,
    email: customer.email || email,
    name: customer.name || name,
    metadata: customer.metadata as Record<string, string> | undefined,
  };
}

export async function getSubscription(
  subscriptionId: string
): Promise<StripeSubscription | null> {
  const stripe = getStripeClient();

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const firstPrice = subscription.items.data[0]?.price;
    const currentPeriodEndUnix = (
      subscription as Stripe.Subscription & {
        current_period_end?: number | null;
      }
    ).current_period_end;

    return {
      id: subscription.id,
      customerId:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id,
      status: subscription.status,
      currentPeriodEnd: new Date((currentPeriodEndUnix || 0) * 1000),
      priceId: firstPrice?.id || "",
      metadata: subscription.metadata || undefined,
    };
  } catch (error) {
    if (
      error instanceof Stripe.errors.StripeError &&
      error.code === "resource_missing"
    ) {
      return null;
    }
    throw error;
  }
}

export async function cancelSubscription(
  subscriptionId: string
): Promise<void> {
  const stripe = getStripeClient();

  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

export async function listPrices(): Promise<StripePrice[]> {
  const stripe = getStripeClient();

  const prices = await stripe.prices.list({
    active: true,
    limit: 100,
    expand: ["data.product"],
  });

  return prices.data
    .filter((price) => price.unit_amount !== null)
    .map((price) => ({
      id: price.id,
      productId:
        typeof price.product === "string"
          ? price.product
          : price.product?.id || "",
      unitAmount: price.unit_amount || 0,
      currency: price.currency,
      interval: price.recurring?.interval,
      intervalCount: price.recurring?.interval_count,
    }));
}

export async function constructWebhookEvent(
  body: string,
  signature: string
): Promise<Stripe.Event> {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET in environment.");
  }

  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}
