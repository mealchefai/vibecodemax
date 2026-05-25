import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

type PaymentProvider = "stripe";
type WebhookDispatchStatus = "received" | "dispatch_failed" | "dispatched";
type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";
const WEBHOOK_CLAIM_TTL_MS = 60_000;

function toJsonObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function getWebhookEventRecord(
  provider: PaymentProvider,
  eventId: string
) {
  const { data, error } = await supabaseAdmin()
    .from("webhook_events")
    .select("id, status, dispatch_claim_token, dispatch_claimed_at")
    .eq("provider", provider)
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message || `Failed to load ${provider} webhook event`
    );
  }

  return data as {
    id: string;
    status: WebhookDispatchStatus;
    dispatch_claim_token: string | null;
    dispatch_claimed_at: string | null;
  } | null;
}

export async function isWebhookEventDispatched(
  provider: PaymentProvider,
  eventId: string
) {
  const data = await getWebhookEventRecord(provider, eventId);
  return data?.status === "dispatched";
}

export async function isDuplicateWebhookEvent(
  provider: PaymentProvider,
  eventId: string
) {
  return isWebhookEventDispatched(provider, eventId);
}

export async function recordWebhookEventReceived(
  provider: PaymentProvider,
  eventId: string,
  payload: unknown
) {
  const webhookEvents = supabaseAdmin().from("webhook_events");
  const existing = await getWebhookEventRecord(provider, eventId);

  if (!existing) {
    const { error } = await webhookEvents.insert({
      provider,
      event_id: eventId,
      status: "received",
      raw_payload: toJsonObject(payload),
      dispatch_error: null,
      dispatch_claim_token: null,
      dispatch_claimed_at: null,
    });

    if (error) {
      throw new Error(
        error.message || `Failed to record ${provider} webhook event`
      );
    }

    return;
  }

  if (existing.status === "dispatched") {
    return;
  }

  const { error } = await webhookEvents
    .update({
      status: "received",
      raw_payload: toJsonObject(payload),
      dispatch_error: null,
      dispatched_at: null,
      dispatch_claim_token: null,
      dispatch_claimed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("provider", provider)
    .eq("event_id", eventId)
    .neq("status", "dispatched");

  if (error) {
    throw new Error(
      error.message || `Failed to record ${provider} webhook event`
    );
  }
}

function isUniqueViolation(error: { code?: string } | null | undefined) {
  return error?.code === "23505";
}

export async function claimWebhookEventForDispatch(
  provider: PaymentProvider,
  eventId: string,
  payload: unknown
) {
  const claimToken = randomUUID();
  const claimedAt = new Date().toISOString();
  const staleBefore = new Date(Date.now() - WEBHOOK_CLAIM_TTL_MS).toISOString();
  const webhookEvents = supabaseAdmin().from("webhook_events");

  const { data: inserted, error: insertError } = await webhookEvents
    .insert({
      provider,
      event_id: eventId,
      status: "received",
      raw_payload: toJsonObject(payload),
      dispatch_error: null,
      dispatch_claim_token: claimToken,
      dispatch_claimed_at: claimedAt,
      dispatched_at: null,
    })
    .select("dispatch_claim_token")
    .maybeSingle();

  if (!insertError) {
    return inserted?.dispatch_claim_token === claimToken ? claimToken : null;
  }

  if (!isUniqueViolation(insertError)) {
    throw new Error(
      insertError.message || `Failed to claim ${provider} webhook event`
    );
  }

  const claimFields: {
    status: WebhookDispatchStatus;
    raw_payload: Record<string, unknown> | null;
    dispatch_error: null;
    dispatch_claim_token: string;
    dispatch_claimed_at: string;
    dispatched_at: null;
    updated_at: string;
  } = {
    status: "received",
    raw_payload: toJsonObject(payload),
    dispatch_error: null,
    dispatch_claim_token: claimToken,
    dispatch_claimed_at: claimedAt,
    dispatched_at: null,
    updated_at: claimedAt,
  };

  const { data: failedClaim, error: failedError } = await webhookEvents
    .update(claimFields)
    .eq("provider", provider)
    .eq("event_id", eventId)
    .eq("status", "dispatch_failed")
    .select("dispatch_claim_token")
    .maybeSingle();

  if (failedError) {
    throw new Error(
      failedError.message || `Failed to reclaim ${provider} webhook event`
    );
  }

  if (failedClaim?.dispatch_claim_token === claimToken) {
    return claimToken;
  }

  const { data: staleClaim, error: staleError } = await webhookEvents
    .update(claimFields)
    .eq("provider", provider)
    .eq("event_id", eventId)
    .eq("status", "received")
    .lt("dispatch_claimed_at", staleBefore)
    .select("dispatch_claim_token")
    .maybeSingle();

  if (staleError) {
    throw new Error(
      staleError.message || `Failed to claim stale ${provider} webhook event`
    );
  }

  return staleClaim?.dispatch_claim_token === claimToken ? claimToken : null;
}

export async function markWebhookEventDispatched(
  provider: PaymentProvider,
  eventId: string,
  claimToken: string
) {
  const { data, error } = await supabaseAdmin()
    .from("webhook_events")
    .update({
      status: "dispatched",
      dispatch_error: null,
      dispatch_claim_token: null,
      dispatch_claimed_at: null,
      dispatched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("provider", provider)
    .eq("event_id", eventId)
    .eq("dispatch_claim_token", claimToken)
    .neq("status", "dispatched")
    .select("id");

  if (error) {
    throw new Error(
      error.message || `Failed to mark ${provider} webhook event dispatched`
    );
  }

  if (!data || data.length === 0) {
    throw new Error(
      `Lost ${provider} webhook dispatch claim before completion`
    );
  }
}

export async function markWebhookEventDispatchFailed(
  provider: PaymentProvider,
  eventId: string,
  claimToken: string,
  errorMessage: string
) {
  const { data, error } = await supabaseAdmin()
    .from("webhook_events")
    .update({
      status: "dispatch_failed",
      dispatch_error: errorMessage,
      dispatch_claim_token: null,
      dispatch_claimed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("provider", provider)
    .eq("event_id", eventId)
    .eq("dispatch_claim_token", claimToken)
    .select("id");

  if (error) {
    throw new Error(
      error.message || `Failed to mark ${provider} webhook dispatch failure`
    );
  }

  if (!data || data.length === 0) {
    throw new Error(
      `Lost ${provider} webhook dispatch claim before failure handling`
    );
  }
}

export async function recordWebhookEvent(
  provider: PaymentProvider,
  eventId: string,
  payload: unknown
) {
  const claimToken = await claimWebhookEventForDispatch(
    provider,
    eventId,
    payload
  );
  if (!claimToken) {
    return;
  }

  await markWebhookEventDispatched(provider, eventId, claimToken);
}

export async function findProductPrice(
  provider: "stripe",
  providerPriceId: string
) {
  const { data, error } = await supabaseAdmin()
    .from("product_prices")
    .select("id, product_id, trial_days")
    .eq("provider", provider)
    .eq("provider_price_id", providerPriceId)
    .maybeSingle();

  if (error || !data) {
    console.warn(
      "Product price not found for provider price ID:",
      providerPriceId
    );
    return null;
  }

  return data as { id: string; product_id: string; trial_days?: number | null };
}

export function deriveEntitlementStatus(
  status: string,
  currentPeriodEnd: string | null
) {
  if (status === "trialing") return "trialing" as const;
  if (status === "canceled" && currentPeriodEnd) return "active" as const;
  if (status === "active" || status === "past_due") return "active" as const;
  return "expired" as const;
}

export function deriveExpiry(status: string, currentPeriodEnd: string | null) {
  if (status === "canceled" && currentPeriodEnd) {
    return currentPeriodEnd;
  }
  return null;
}

export async function upsertEntitlement(params: {
  userId: string;
  productId: string;
  status: "active" | "trialing" | "expired" | "revoked";
  source: "subscription" | "one_time" | "manual";
  expiresAt?: string | null;
  trialEndsAt?: string | null;
}) {
  const supabase = supabaseAdmin();
  const entitlementPatch = {
    status: params.status,
    source: params.source,
    expires_at: params.expiresAt ?? null,
    trial_ends_at: params.trialEndsAt ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data: existing } = await supabase
    .from("entitlements")
    .select("id")
    .eq("user_id", params.userId)
    .eq("product_id", params.productId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("entitlements")
      .update(entitlementPatch)
      .eq("id", existing.id);

    if (error) {
      throw new Error(error.message || "Failed to update entitlement");
    }

    return;
  }

  const { error } = await supabase.from("entitlements").insert({
    user_id: params.userId,
    product_id: params.productId,
    status: params.status,
    source: params.source,
    expires_at: params.expiresAt ?? null,
    trial_ends_at: params.trialEndsAt ?? null,
  });

  if (!error) {
    return;
  }

  if (error.code === "23505") {
    const { error: updateError } = await supabase
      .from("entitlements")
      .update(entitlementPatch)
      .eq("user_id", params.userId)
      .eq("product_id", params.productId)
      .in("status", ["active", "trialing"]);

    if (!updateError) {
      return;
    }

    throw new Error(
      updateError.message ||
        "Failed to recover entitlement after duplicate insert"
    );
  }

  throw new Error(error.message || "Failed to insert entitlement");
}

export async function upsertSubscription(params: {
  provider: "stripe";
  userId: string;
  productId: string;
  productPriceId: string;
  providerCustomerId: string;
  providerSubscriptionId: string;
  status: SubscriptionStatus;
  providerStatus: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
}) {
  const supabase = supabaseAdmin();
  const patch = {
    user_id: params.userId,
    product_id: params.productId,
    product_price_id: params.productPriceId,
    provider_customer_id: params.providerCustomerId,
    status: params.status,
    provider_status: params.providerStatus,
    current_period_end: params.currentPeriodEnd,
    trial_ends_at: params.trialEndsAt,
    updated_at: new Date().toISOString(),
  };
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("provider", params.provider)
    .eq("provider_subscription_id", params.providerSubscriptionId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("subscriptions")
      .update(patch)
      .eq("id", existing.id);

    if (error) {
      throw new Error(error.message || "Failed to update subscription");
    }
  } else {
    const { error } = await supabase.from("subscriptions").insert({
      provider: params.provider,
      provider_subscription_id: params.providerSubscriptionId,
      ...patch,
    });

    if (!error) {
      await upsertEntitlement({
        userId: params.userId,
        productId: params.productId,
        status: deriveEntitlementStatus(params.status, params.currentPeriodEnd),
        source: "subscription",
        expiresAt: deriveExpiry(params.status, params.currentPeriodEnd),
        trialEndsAt: params.trialEndsAt,
      });
      return;
    }

    if (error.code === "23505") {
      const { error: recoverError } = await supabase
        .from("subscriptions")
        .update(patch)
        .eq("provider", params.provider)
        .eq("provider_subscription_id", params.providerSubscriptionId);

      if (!recoverError) {
        await upsertEntitlement({
          userId: params.userId,
          productId: params.productId,
          status: deriveEntitlementStatus(
            params.status,
            params.currentPeriodEnd
          ),
          source: "subscription",
          expiresAt: deriveExpiry(params.status, params.currentPeriodEnd),
          trialEndsAt: params.trialEndsAt,
        });
        return;
      }

      throw new Error(
        recoverError.message ||
          "Failed to recover subscription after duplicate insert"
      );
    }

    if (error) {
      throw new Error(error.message || "Failed to insert subscription");
    }
  }

  await upsertEntitlement({
    userId: params.userId,
    productId: params.productId,
    status: deriveEntitlementStatus(params.status, params.currentPeriodEnd),
    source: "subscription",
    expiresAt: deriveExpiry(params.status, params.currentPeriodEnd),
    trialEndsAt: params.trialEndsAt,
  });
}

export type PurchaseTransactionType =
  | "one_time"
  | "subscription_initial"
  | "subscription_renewal";

export async function recordPurchaseTransaction(params: {
  provider: "stripe";
  userId: string;
  productId: string;
  productPriceId: string;
  providerPaymentId: string;
  providerEventId?: string | null;
  amountCents: number;
  currency: string;
  providerStatus?: string | null;
  purchaseType: PurchaseTransactionType;
  rawPayload?: unknown;
  grantEntitlement?: boolean;
}) {
  const { error } = await supabaseAdmin()
    .from("purchases")
    .upsert(
      {
        user_id: params.userId,
        product_id: params.productId,
        product_price_id: params.productPriceId,
        provider: params.provider,
        provider_payment_id: params.providerPaymentId,
        provider_event_id: params.providerEventId ?? null,
        amount_cents: params.amountCents,
        currency: params.currency,
        purchase_type: params.purchaseType,
        status: "paid",
        provider_status: params.providerStatus ?? "paid",
        raw_payload: toJsonObject(params.rawPayload),
      },
      { onConflict: "provider,provider_payment_id" }
    );

  if (error) {
    throw new Error(error.message || "Failed to record purchase");
  }

  if (params.grantEntitlement ?? params.purchaseType === "one_time") {
    await upsertEntitlement({
      userId: params.userId,
      productId: params.productId,
      status: "active",
      source: "one_time",
    });
  }
}

export async function recordOneTimePurchase(params: {
  provider: "stripe";
  userId: string;
  productId: string;
  productPriceId: string;
  providerPaymentId: string;
  providerEventId?: string | null;
  amountCents: number;
  currency: string;
  providerStatus?: string | null;
  rawPayload?: unknown;
}) {
  await recordPurchaseTransaction({
    ...params,
    purchaseType: "one_time",
    grantEntitlement: true,
  });
}
