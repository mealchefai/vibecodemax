import { task } from "@trigger.dev/sdk";
import {
  completeJob,
  failJob,
  triggerJob,
  updateJobProgress,
} from "@/lib/jobs/trigger";
import {
  findProductPrice,
  recordOneTimePurchase,
  recordPurchaseTransaction,
  upsertEntitlement,
  upsertSubscription,
} from "@/lib/payments/webhook-handlers";
import { supabaseAdmin } from "@/lib/supabase/admin";

type SubscriptionContext = {
  userId: string;
  productId: string;
  productPriceId: string;
  providerSubscriptionId: string | null;
};

type StripeMetadata = Record<string, string | null | undefined>;
type StripeExpandableId = string | { id?: string | null } | null | undefined;
type StripeLine = {
  metadata?: StripeMetadata;
  parent?: {
    subscription_item_details?: {
      subscription?: string | null;
    };
  };
  price?: {
    id?: string | null;
  };
  pricing?: {
    price_details?: {
      price?: string | null;
    };
  };
};
type StripePayload = {
  id?: string;
  amount_due?: number | null;
  amount_paid?: number | null;
  amount_total?: number | null;
  billing_reason?: string | null;
  client_reference_id?: string | null;
  currency?: string | null;
  current_period_end?: number | null;
  customer?: StripeExpandableId;
  customer_email?: string | null;
  items?: {
    data?: Array<{
      price?: {
        id?: string | null;
      };
    }>;
  };
  lines?: {
    data?: StripeLine[];
  };
  metadata?: StripeMetadata;
  mode?: string;
  parent?: {
    subscription_details?: {
      metadata?: StripeMetadata;
      subscription?: string | null;
    };
  };
  payment_intent?: StripeExpandableId;
  status?: string | null;
  subscription?: StripeExpandableId;
  trial_end?: number | null;
};
type StripeJobData = {
  eventId?: string | null;
  jobId?: string;
  payload?: StripePayload | string | null;
};
type StripeJobOutcome = {
  emailPayload?: {
    userId: string;
    [key: string]: unknown;
  } | null;
  emailType?: string | null;
  result?: Record<string, unknown> | null;
} | null;

function readExpandableId(value: StripeExpandableId): string | null {
  if (typeof value === "string") return value;
  return value?.id || null;
}

function readUnixTimestamp(value: number | null | undefined): string | null {
  return typeof value === "number"
    ? new Date(value * 1000).toISOString()
    : null;
}

function mapStripeSubscriptionStatus(
  status: string | null | undefined
): "trialing" | "active" | "past_due" | "canceled" | "unpaid" {
  switch ((status || "").trim().toLowerCase()) {
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "unpaid":
      return "unpaid";
    case "active":
    default:
      return "active";
  }
}

function buildStripeEmailDedupeKey(
  emailType: string,
  eventId: string | null | undefined,
  fallbackId: string
) {
  return eventId
    ? "stripe:" + eventId + ":" + emailType
    : "stripe:" + fallbackId + ":" + emailType;
}

async function findSubscriptionContextBySubscriptionId(
  providerSubscriptionId: string
): Promise<SubscriptionContext | null> {
  const { data, error } = await supabaseAdmin()
    .from("subscriptions")
    .select("user_id,product_id,product_price_id,provider_subscription_id")
    .eq("provider", "stripe")
    .eq("provider_subscription_id", providerSubscriptionId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    userId: data.user_id,
    productId: data.product_id,
    productPriceId: data.product_price_id,
    providerSubscriptionId: data.provider_subscription_id ?? null,
  };
}

async function findProductPriceById(localProductPriceId: string) {
  const { data, error } = await supabaseAdmin()
    .from("product_prices")
    .select("id,product_id")
    .eq("id", localProductPriceId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    product_id: data.product_id,
  };
}

async function findSubscriptionContextByCustomerAndPrice(
  providerCustomerId: string,
  localProductPriceId: string
): Promise<SubscriptionContext | null> {
  const { data, error } = await supabaseAdmin()
    .from("subscriptions")
    .select("user_id,product_id,product_price_id,provider_subscription_id")
    .eq("provider", "stripe")
    .eq("provider_customer_id", providerCustomerId)
    .eq("product_price_id", localProductPriceId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    userId: data.user_id,
    productId: data.product_id,
    productPriceId: data.product_price_id,
    providerSubscriptionId: data.provider_subscription_id ?? null,
  };
}

async function findLatestSubscriptionContextByCustomer(
  providerCustomerId: string
): Promise<SubscriptionContext | null> {
  const { data, error } = await supabaseAdmin()
    .from("subscriptions")
    .select("user_id,product_id,product_price_id,provider_subscription_id")
    .eq("provider", "stripe")
    .eq("provider_customer_id", providerCustomerId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    userId: data.user_id,
    productId: data.product_id,
    productPriceId: data.product_price_id,
    providerSubscriptionId: data.provider_subscription_id ?? null,
  };
}

async function resolveSubscriptionContext(params: {
  fallbackUserId?: string | null;
  fallbackProductPriceId?: string | null;
  providerSubscriptionId?: string | null;
  providerCustomerId?: string | null;
  providerPriceId?: string | null;
}) {
  const localProductPrice = params.fallbackProductPriceId
    ? await findProductPriceById(params.fallbackProductPriceId)
    : null;
  const productPrice = params.providerPriceId
    ? await findProductPrice("stripe", params.providerPriceId)
    : null;
  const resolvedProductPrice = productPrice || localProductPrice;

  if (params.fallbackUserId && resolvedProductPrice) {
    return {
      userId: params.fallbackUserId,
      productId: resolvedProductPrice.product_id,
      productPriceId: resolvedProductPrice.id,
      providerSubscriptionId: params.providerSubscriptionId || null,
      via: "metadata",
    };
  }

  if (params.providerSubscriptionId) {
    const existing = await findSubscriptionContextBySubscriptionId(
      params.providerSubscriptionId
    );
    if (existing) {
      return {
        ...existing,
        via: "subscription_lookup",
      };
    }
  }

  if (params.providerCustomerId && resolvedProductPrice) {
    const existing = await findSubscriptionContextByCustomerAndPrice(
      params.providerCustomerId,
      resolvedProductPrice.id
    );
    if (existing) {
      return {
        ...existing,
        via: "customer_price_lookup",
      };
    }
  }

  if (params.providerCustomerId) {
    const existing = await findLatestSubscriptionContextByCustomer(
      params.providerCustomerId
    );
    if (existing) {
      return {
        ...existing,
        via: "customer_lookup",
      };
    }
  }

  if (resolvedProductPrice && params.fallbackUserId) {
    return {
      userId: params.fallbackUserId,
      productId: resolvedProductPrice.product_id,
      productPriceId: resolvedProductPrice.id,
      providerSubscriptionId: params.providerSubscriptionId || null,
      via: "metadata",
    };
  }

  return null;
}

async function processStripeCheckoutCompleted(
  data: StripeJobData
): Promise<StripeJobOutcome> {
  const session = data.payload;
  if (!session || typeof session === "string") return null;

  if (session.mode === "subscription" && session.subscription) {
    const userId = session.client_reference_id || session.metadata?.user_id;
    const providerSubscriptionId = readExpandableId(session.subscription);
    const providerCustomerId = readExpandableId(session.customer);
    const providerPriceId = session.metadata?.provider_price_id;
    if (
      !userId ||
      !providerSubscriptionId ||
      !providerCustomerId ||
      !providerPriceId
    ) {
      return null;
    }

    const productPrice = await findProductPrice("stripe", providerPriceId);
    if (!productPrice) return null;

    await upsertSubscription({
      provider: "stripe",
      userId,
      productId: productPrice.product_id,
      productPriceId: productPrice.id,
      providerCustomerId,
      providerSubscriptionId,
      status: "active",
      providerStatus: "active",
      currentPeriodEnd: readUnixTimestamp(session.current_period_end),
      trialEndsAt: readUnixTimestamp(session.trial_end),
    });

    return {
      result: { mode: "subscription", providerSubscriptionId },
    };
  }

  if (session.mode === "payment") {
    const userId = session.client_reference_id || session.metadata?.user_id;
    const providerPaymentId =
      readExpandableId(session.payment_intent) || session.id;
    const providerPriceId = session.metadata?.provider_price_id;
    if (!userId || !providerPaymentId || !providerPriceId) {
      return null;
    }

    const productPrice = await findProductPrice("stripe", providerPriceId);
    if (!productPrice) return null;

    await recordOneTimePurchase({
      provider: "stripe",
      userId,
      productId: productPrice.product_id,
      productPriceId: productPrice.id,
      providerPaymentId,
      providerEventId: session.id,
      amountCents: session.amount_total || 0,
      currency: session.currency || "usd",
      providerStatus: "paid",
      rawPayload: session,
    });

    return {
      result: { mode: "payment", providerPaymentId },
    };
  }

  return null;
}

async function processStripeSubscriptionChange(
  data: StripeJobData,
  isCanceled = false
): Promise<StripeJobOutcome> {
  const subscription = data.payload;
  if (!subscription || typeof subscription === "string") return null;

  const providerPriceId = subscription.items?.data?.[0]?.price?.id;
  const providerSubscriptionId = subscription.id;
  const providerCustomerId = readExpandableId(subscription.customer);
  const fallbackUserId = subscription.metadata?.user_id || null;

  const context = await resolveSubscriptionContext({
    fallbackUserId,
    providerSubscriptionId,
    providerCustomerId,
    providerPriceId,
  });

  if (!providerSubscriptionId || !providerCustomerId || !context) {
    return null;
  }

  await upsertSubscription({
    provider: "stripe",
    userId: context.userId,
    productId: context.productId,
    productPriceId: context.productPriceId,
    providerCustomerId,
    providerSubscriptionId,
    status: isCanceled
      ? "canceled"
      : mapStripeSubscriptionStatus(subscription.status),
    providerStatus: subscription.status || null,
    currentPeriodEnd: readUnixTimestamp(subscription.current_period_end),
    trialEndsAt: readUnixTimestamp(subscription.trial_end),
  });

  return {
    emailType: isCanceled ? "email/subscription.canceled" : null,
    emailPayload: isCanceled
      ? {
          userId: context.userId,
          email: subscription.metadata?.user_email || null,
          name: subscription.metadata?.user_name || null,
          productName:
            subscription.metadata?.product_name || "your subscription",
          provider: "stripe",
          providerEventId: data.eventId || providerSubscriptionId,
          dedupeKey: buildStripeEmailDedupeKey(
            "email/subscription.canceled",
            data.eventId || null,
            providerSubscriptionId
          ),
        }
      : null,
    result: {
      providerSubscriptionId,
      status: isCanceled ? "canceled" : subscription.status,
    },
  };
}

async function markStripeSubscriptionPaymentFailed(params: {
  context: SubscriptionContext;
  providerSubscriptionId: string | null;
  providerCustomerId: string | null;
  providerStatus: string | null;
}): Promise<boolean> {
  const patch = {
    status: "past_due" as const,
    provider_status: params.providerStatus || "payment_failed",
    updated_at: new Date().toISOString(),
  };

  if (params.providerSubscriptionId) {
    const { data, error } = await supabaseAdmin()
      .from("subscriptions")
      .update(patch)
      .eq("provider", "stripe")
      .eq("provider_subscription_id", params.providerSubscriptionId)
      .select("id");

    if (error) {
      throw new Error(error.message || "Failed to update failed subscription");
    }

    if (data && data.length > 0) {
      await upsertEntitlement({
        userId: params.context.userId,
        productId: params.context.productId,
        status: "active",
        source: "subscription",
      });
      return true;
    }
  }

  if (!params.providerCustomerId) {
    return false;
  }

  const { data, error } = await supabaseAdmin()
    .from("subscriptions")
    .update(patch)
    .eq("provider", "stripe")
    .eq("provider_customer_id", params.providerCustomerId)
    .eq("product_price_id", params.context.productPriceId)
    .select("id");

  if (error) {
    throw new Error(error.message || "Failed to update failed subscription");
  }

  if (!data || data.length === 0) {
    return false;
  }

  await upsertEntitlement({
    userId: params.context.userId,
    productId: params.context.productId,
    status: "active",
    source: "subscription",
  });

  return true;
}

async function processStripeInvoiceSucceeded(
  data: StripeJobData
): Promise<StripeJobOutcome> {
  const invoice = data.payload;
  if (!invoice || typeof invoice === "string") {
    return null;
  }

  const providerSubscriptionId =
    readExpandableId(invoice.subscription) ||
    invoice.parent?.subscription_details?.subscription ||
    invoice.lines?.data?.[0]?.parent?.subscription_item_details?.subscription ||
    null;
  const providerCustomerId = readExpandableId(invoice.customer);
  const providerPriceId =
    invoice.parent?.subscription_details?.metadata?.provider_price_id ||
    invoice.lines?.data?.[0]?.metadata?.provider_price_id ||
    invoice.lines?.data?.[0]?.pricing?.price_details?.price ||
    invoice.lines?.data?.[0]?.price?.id ||
    null;
  const fallbackProductPriceId =
    invoice.parent?.subscription_details?.metadata?.product_price_id ||
    invoice.lines?.data?.[0]?.metadata?.product_price_id ||
    null;
  const providerPaymentId =
    readExpandableId(invoice.payment_intent) || invoice.id;

  const context = await resolveSubscriptionContext({
    fallbackUserId:
      invoice.parent?.subscription_details?.metadata?.user_id ||
      invoice.lines?.data?.[0]?.metadata?.user_id ||
      null,
    fallbackProductPriceId,
    providerSubscriptionId,
    providerCustomerId,
    providerPriceId,
  });

  if (!providerPaymentId || !context) {
    return null;
  }

  const purchaseType =
    invoice.billing_reason === "subscription_cycle"
      ? "subscription_renewal"
      : "subscription_initial";

  await recordPurchaseTransaction({
    provider: "stripe",
    userId: context.userId,
    productId: context.productId,
    productPriceId: context.productPriceId,
    providerPaymentId,
    providerEventId: invoice.id || null,
    amountCents: invoice.amount_paid || invoice.amount_due || 0,
    currency: invoice.currency || "usd",
    providerStatus: invoice.status || "paid",
    purchaseType,
    rawPayload: invoice,
    grantEntitlement: false,
  });

  return {
    result: { providerPaymentId, purchaseType },
  };
}

async function processStripeInvoiceFailure(
  data: StripeJobData
): Promise<StripeJobOutcome> {
  const invoice = data.payload;
  if (!invoice || typeof invoice === "string") {
    return null;
  }

  const providerSubscriptionId =
    readExpandableId(invoice.subscription) ||
    invoice.parent?.subscription_details?.subscription ||
    invoice.lines?.data?.[0]?.parent?.subscription_item_details?.subscription ||
    null;
  const providerCustomerId = readExpandableId(invoice.customer);
  const providerPriceId =
    invoice.parent?.subscription_details?.metadata?.provider_price_id ||
    invoice.lines?.data?.[0]?.metadata?.provider_price_id ||
    invoice.lines?.data?.[0]?.pricing?.price_details?.price ||
    invoice.lines?.data?.[0]?.price?.id ||
    null;
  const fallbackProductPriceId =
    invoice.parent?.subscription_details?.metadata?.product_price_id ||
    invoice.lines?.data?.[0]?.metadata?.product_price_id ||
    null;

  const context = await resolveSubscriptionContext({
    fallbackUserId:
      invoice.parent?.subscription_details?.metadata?.user_id ||
      invoice.lines?.data?.[0]?.metadata?.user_id ||
      null,
    fallbackProductPriceId,
    providerSubscriptionId,
    providerCustomerId,
    providerPriceId,
  });

  if (!context) {
    return null;
  }

  const subscriptionUpdated = await markStripeSubscriptionPaymentFailed({
    context,
    providerSubscriptionId,
    providerCustomerId,
    providerStatus: invoice.status || "payment_failed",
  });

  return {
    emailType: "email/payment.failed",
    emailPayload: {
      userId: context.userId,
      email:
        invoice.customer_email ||
        invoice.parent?.subscription_details?.metadata?.user_email ||
        invoice.lines?.data?.[0]?.metadata?.user_email ||
        null,
      name:
        invoice.parent?.subscription_details?.metadata?.user_name ||
        invoice.lines?.data?.[0]?.metadata?.user_name ||
        null,
      productName:
        invoice.parent?.subscription_details?.metadata?.product_name ||
        invoice.lines?.data?.[0]?.metadata?.product_name ||
        "your subscription",
      provider: "stripe",
      providerEventId: data.eventId || invoice.id || null,
      dedupeKey: buildStripeEmailDedupeKey(
        "email/payment.failed",
        data.eventId || null,
        providerSubscriptionId || invoice.id || "invoice"
      ),
    },
    result: {
      providerSubscriptionId: providerSubscriptionId || null,
      status: "payment_failed",
      subscriptionUpdated,
    },
  };
}

function createStripeTask(
  id: string,
  handler: (data: StripeJobData) => Promise<StripeJobOutcome>
) {
  return task({
    id,
    retry: { maxAttempts: 3 },
    run: async (data: StripeJobData) => {
      const jobId = data.jobId;
      if (!jobId) {
        throw new Error("Job id is missing");
      }

      try {
        await updateJobProgress(jobId, 10);

        const outcome = await handler(data);

        await completeJob(jobId, outcome?.result || null);
        const emailType = outcome?.emailType || null;
        const emailPayload = outcome?.emailPayload || null;
        if (emailType && emailPayload) {
          await triggerJob({
            type: emailType,
            userId: emailPayload.userId,
            input: emailPayload,
          });
        }

        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Job failed";
        await failJob(jobId, message);
        throw error;
      }
    },
  });
}

export const stripeCheckoutCompletedJob = createStripeTask(
  "payment-checkout-completed",
  processStripeCheckoutCompleted
);
export const stripeSubscriptionCreatedJob = createStripeTask(
  "payment-subscription-created",
  (data) => processStripeSubscriptionChange(data, false)
);
export const stripeSubscriptionUpdatedJob = createStripeTask(
  "payment-subscription-updated",
  (data) => processStripeSubscriptionChange(data, false)
);
export const stripeSubscriptionDeletedJob = createStripeTask(
  "payment-subscription-deleted",
  (data) => processStripeSubscriptionChange(data, true)
);
export const stripeInvoiceSucceededJob = createStripeTask(
  "payment-invoice-succeeded",
  processStripeInvoiceSucceeded
);
export const stripeInvoiceFailedJob = createStripeTask(
  "payment-invoice-failed",
  processStripeInvoiceFailure
);
