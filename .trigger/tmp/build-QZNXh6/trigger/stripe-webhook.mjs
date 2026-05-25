import {
  completeJob,
  failJob,
  supabaseAdmin,
  triggerJob,
  updateJobProgress
} from "../chunk-SWWEV3XL.mjs";
import {
  task
} from "../chunk-62GFTMDR.mjs";
import "../chunk-DPUW62IF.mjs";
import "../chunk-6QBBEOUN.mjs";
import "../chunk-MH2JEEC2.mjs";
import "../chunk-Q7CCAEH6.mjs";
import {
  __name,
  init_esm
} from "../chunk-SOPMFPK3.mjs";

// trigger/stripe-webhook.ts
init_esm();

// src/lib/payments/webhook-handlers.ts
init_esm();
function toJsonObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
__name(toJsonObject, "toJsonObject");
async function findProductPrice(provider, providerPriceId) {
  const { data, error } = await supabaseAdmin().from("product_prices").select("id, product_id, trial_days").eq("provider", provider).eq("provider_price_id", providerPriceId).maybeSingle();
  if (error || !data) {
    console.warn(
      "Product price not found for provider price ID:",
      providerPriceId
    );
    return null;
  }
  return data;
}
__name(findProductPrice, "findProductPrice");
function deriveEntitlementStatus(status, currentPeriodEnd) {
  if (status === "trialing") return "trialing";
  if (status === "canceled" && currentPeriodEnd) return "active";
  if (status === "active" || status === "past_due") return "active";
  return "expired";
}
__name(deriveEntitlementStatus, "deriveEntitlementStatus");
function deriveExpiry(status, currentPeriodEnd) {
  if (status === "canceled" && currentPeriodEnd) {
    return currentPeriodEnd;
  }
  return null;
}
__name(deriveExpiry, "deriveExpiry");
async function upsertEntitlement(params) {
  const supabase = supabaseAdmin();
  const entitlementPatch = {
    status: params.status,
    source: params.source,
    expires_at: params.expiresAt ?? null,
    trial_ends_at: params.trialEndsAt ?? null,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  const { data: existing } = await supabase.from("entitlements").select("id").eq("user_id", params.userId).eq("product_id", params.productId).maybeSingle();
  if (existing?.id) {
    const { error: error2 } = await supabase.from("entitlements").update(entitlementPatch).eq("id", existing.id);
    if (error2) {
      throw new Error(error2.message || "Failed to update entitlement");
    }
    return;
  }
  const { error } = await supabase.from("entitlements").insert({
    user_id: params.userId,
    product_id: params.productId,
    status: params.status,
    source: params.source,
    expires_at: params.expiresAt ?? null,
    trial_ends_at: params.trialEndsAt ?? null
  });
  if (!error) {
    return;
  }
  if (error.code === "23505") {
    const { error: updateError } = await supabase.from("entitlements").update(entitlementPatch).eq("user_id", params.userId).eq("product_id", params.productId).in("status", ["active", "trialing"]);
    if (!updateError) {
      return;
    }
    throw new Error(
      updateError.message || "Failed to recover entitlement after duplicate insert"
    );
  }
  throw new Error(error.message || "Failed to insert entitlement");
}
__name(upsertEntitlement, "upsertEntitlement");
async function upsertSubscription(params) {
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
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  const { data: existing } = await supabase.from("subscriptions").select("id").eq("provider", params.provider).eq("provider_subscription_id", params.providerSubscriptionId).maybeSingle();
  if (existing?.id) {
    const { error } = await supabase.from("subscriptions").update(patch).eq("id", existing.id);
    if (error) {
      throw new Error(error.message || "Failed to update subscription");
    }
  } else {
    const { error } = await supabase.from("subscriptions").insert({
      provider: params.provider,
      provider_subscription_id: params.providerSubscriptionId,
      ...patch
    });
    if (!error) {
      await upsertEntitlement({
        userId: params.userId,
        productId: params.productId,
        status: deriveEntitlementStatus(params.status, params.currentPeriodEnd),
        source: "subscription",
        expiresAt: deriveExpiry(params.status, params.currentPeriodEnd),
        trialEndsAt: params.trialEndsAt
      });
      return;
    }
    if (error.code === "23505") {
      const { error: recoverError } = await supabase.from("subscriptions").update(patch).eq("provider", params.provider).eq("provider_subscription_id", params.providerSubscriptionId);
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
          trialEndsAt: params.trialEndsAt
        });
        return;
      }
      throw new Error(
        recoverError.message || "Failed to recover subscription after duplicate insert"
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
    trialEndsAt: params.trialEndsAt
  });
}
__name(upsertSubscription, "upsertSubscription");
async function recordPurchaseTransaction(params) {
  const { error } = await supabaseAdmin().from("purchases").upsert(
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
      raw_payload: toJsonObject(params.rawPayload)
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
      source: "one_time"
    });
  }
}
__name(recordPurchaseTransaction, "recordPurchaseTransaction");
async function recordOneTimePurchase(params) {
  await recordPurchaseTransaction({
    ...params,
    purchaseType: "one_time",
    grantEntitlement: true
  });
}
__name(recordOneTimePurchase, "recordOneTimePurchase");

// trigger/stripe-webhook.ts
function readExpandableId(value) {
  if (typeof value === "string") return value;
  return value?.id || null;
}
__name(readExpandableId, "readExpandableId");
function readUnixTimestamp(value) {
  return typeof value === "number" ? new Date(value * 1e3).toISOString() : null;
}
__name(readUnixTimestamp, "readUnixTimestamp");
function mapStripeSubscriptionStatus(status) {
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
__name(mapStripeSubscriptionStatus, "mapStripeSubscriptionStatus");
function buildStripeEmailDedupeKey(emailType, eventId, fallbackId) {
  return eventId ? "stripe:" + eventId + ":" + emailType : "stripe:" + fallbackId + ":" + emailType;
}
__name(buildStripeEmailDedupeKey, "buildStripeEmailDedupeKey");
async function findSubscriptionContextBySubscriptionId(providerSubscriptionId) {
  const { data, error } = await supabaseAdmin().from("subscriptions").select("user_id,product_id,product_price_id,provider_subscription_id").eq("provider", "stripe").eq("provider_subscription_id", providerSubscriptionId).maybeSingle();
  if (error || !data) {
    return null;
  }
  return {
    userId: data.user_id,
    productId: data.product_id,
    productPriceId: data.product_price_id,
    providerSubscriptionId: data.provider_subscription_id ?? null
  };
}
__name(findSubscriptionContextBySubscriptionId, "findSubscriptionContextBySubscriptionId");
async function findProductPriceById(localProductPriceId) {
  const { data, error } = await supabaseAdmin().from("product_prices").select("id,product_id").eq("id", localProductPriceId).maybeSingle();
  if (error || !data) {
    return null;
  }
  return {
    id: data.id,
    product_id: data.product_id
  };
}
__name(findProductPriceById, "findProductPriceById");
async function findSubscriptionContextByCustomerAndPrice(providerCustomerId, localProductPriceId) {
  const { data, error } = await supabaseAdmin().from("subscriptions").select("user_id,product_id,product_price_id,provider_subscription_id").eq("provider", "stripe").eq("provider_customer_id", providerCustomerId).eq("product_price_id", localProductPriceId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (error || !data) {
    return null;
  }
  return {
    userId: data.user_id,
    productId: data.product_id,
    productPriceId: data.product_price_id,
    providerSubscriptionId: data.provider_subscription_id ?? null
  };
}
__name(findSubscriptionContextByCustomerAndPrice, "findSubscriptionContextByCustomerAndPrice");
async function findLatestSubscriptionContextByCustomer(providerCustomerId) {
  const { data, error } = await supabaseAdmin().from("subscriptions").select("user_id,product_id,product_price_id,provider_subscription_id").eq("provider", "stripe").eq("provider_customer_id", providerCustomerId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (error || !data) {
    return null;
  }
  return {
    userId: data.user_id,
    productId: data.product_id,
    productPriceId: data.product_price_id,
    providerSubscriptionId: data.provider_subscription_id ?? null
  };
}
__name(findLatestSubscriptionContextByCustomer, "findLatestSubscriptionContextByCustomer");
async function resolveSubscriptionContext(params) {
  const localProductPrice = params.fallbackProductPriceId ? await findProductPriceById(params.fallbackProductPriceId) : null;
  const productPrice = params.providerPriceId ? await findProductPrice("stripe", params.providerPriceId) : null;
  const resolvedProductPrice = productPrice || localProductPrice;
  if (params.fallbackUserId && resolvedProductPrice) {
    return {
      userId: params.fallbackUserId,
      productId: resolvedProductPrice.product_id,
      productPriceId: resolvedProductPrice.id,
      providerSubscriptionId: params.providerSubscriptionId || null,
      via: "metadata"
    };
  }
  if (params.providerSubscriptionId) {
    const existing = await findSubscriptionContextBySubscriptionId(
      params.providerSubscriptionId
    );
    if (existing) {
      return {
        ...existing,
        via: "subscription_lookup"
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
        via: "customer_price_lookup"
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
        via: "customer_lookup"
      };
    }
  }
  if (resolvedProductPrice && params.fallbackUserId) {
    return {
      userId: params.fallbackUserId,
      productId: resolvedProductPrice.product_id,
      productPriceId: resolvedProductPrice.id,
      providerSubscriptionId: params.providerSubscriptionId || null,
      via: "metadata"
    };
  }
  return null;
}
__name(resolveSubscriptionContext, "resolveSubscriptionContext");
async function processStripeCheckoutCompleted(data) {
  const session = data.payload;
  if (!session || typeof session === "string") return null;
  if (session.mode === "subscription" && session.subscription) {
    const userId = session.client_reference_id || session.metadata?.user_id;
    const providerSubscriptionId = readExpandableId(session.subscription);
    const providerCustomerId = readExpandableId(session.customer);
    const providerPriceId = session.metadata?.provider_price_id;
    if (!userId || !providerSubscriptionId || !providerCustomerId || !providerPriceId) {
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
      trialEndsAt: readUnixTimestamp(session.trial_end)
    });
    return {
      result: { mode: "subscription", providerSubscriptionId }
    };
  }
  if (session.mode === "payment") {
    const userId = session.client_reference_id || session.metadata?.user_id;
    const providerPaymentId = readExpandableId(session.payment_intent) || session.id;
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
      rawPayload: session
    });
    return {
      result: { mode: "payment", providerPaymentId }
    };
  }
  return null;
}
__name(processStripeCheckoutCompleted, "processStripeCheckoutCompleted");
async function processStripeSubscriptionChange(data, isCanceled = false) {
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
    providerPriceId
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
    status: isCanceled ? "canceled" : mapStripeSubscriptionStatus(subscription.status),
    providerStatus: subscription.status || null,
    currentPeriodEnd: readUnixTimestamp(subscription.current_period_end),
    trialEndsAt: readUnixTimestamp(subscription.trial_end)
  });
  return {
    emailType: isCanceled ? "email/subscription.canceled" : null,
    emailPayload: isCanceled ? {
      userId: context.userId,
      email: subscription.metadata?.user_email || null,
      name: subscription.metadata?.user_name || null,
      productName: subscription.metadata?.product_name || "your subscription",
      provider: "stripe",
      providerEventId: data.eventId || providerSubscriptionId,
      dedupeKey: buildStripeEmailDedupeKey(
        "email/subscription.canceled",
        data.eventId || null,
        providerSubscriptionId
      )
    } : null,
    result: {
      providerSubscriptionId,
      status: isCanceled ? "canceled" : subscription.status
    }
  };
}
__name(processStripeSubscriptionChange, "processStripeSubscriptionChange");
async function markStripeSubscriptionPaymentFailed(params) {
  const patch = {
    status: "past_due",
    provider_status: params.providerStatus || "payment_failed",
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (params.providerSubscriptionId) {
    const { data: data2, error: error2 } = await supabaseAdmin().from("subscriptions").update(patch).eq("provider", "stripe").eq("provider_subscription_id", params.providerSubscriptionId).select("id");
    if (error2) {
      throw new Error(error2.message || "Failed to update failed subscription");
    }
    if (data2 && data2.length > 0) {
      await upsertEntitlement({
        userId: params.context.userId,
        productId: params.context.productId,
        status: "active",
        source: "subscription"
      });
      return true;
    }
  }
  if (!params.providerCustomerId) {
    return false;
  }
  const { data, error } = await supabaseAdmin().from("subscriptions").update(patch).eq("provider", "stripe").eq("provider_customer_id", params.providerCustomerId).eq("product_price_id", params.context.productPriceId).select("id");
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
    source: "subscription"
  });
  return true;
}
__name(markStripeSubscriptionPaymentFailed, "markStripeSubscriptionPaymentFailed");
async function processStripeInvoiceSucceeded(data) {
  const invoice = data.payload;
  if (!invoice || typeof invoice === "string") {
    return null;
  }
  const providerSubscriptionId = readExpandableId(invoice.subscription) || invoice.parent?.subscription_details?.subscription || invoice.lines?.data?.[0]?.parent?.subscription_item_details?.subscription || null;
  const providerCustomerId = readExpandableId(invoice.customer);
  const providerPriceId = invoice.parent?.subscription_details?.metadata?.provider_price_id || invoice.lines?.data?.[0]?.metadata?.provider_price_id || invoice.lines?.data?.[0]?.pricing?.price_details?.price || invoice.lines?.data?.[0]?.price?.id || null;
  const fallbackProductPriceId = invoice.parent?.subscription_details?.metadata?.product_price_id || invoice.lines?.data?.[0]?.metadata?.product_price_id || null;
  const providerPaymentId = readExpandableId(invoice.payment_intent) || invoice.id;
  const context = await resolveSubscriptionContext({
    fallbackUserId: invoice.parent?.subscription_details?.metadata?.user_id || invoice.lines?.data?.[0]?.metadata?.user_id || null,
    fallbackProductPriceId,
    providerSubscriptionId,
    providerCustomerId,
    providerPriceId
  });
  if (!providerPaymentId || !context) {
    return null;
  }
  const purchaseType = invoice.billing_reason === "subscription_cycle" ? "subscription_renewal" : "subscription_initial";
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
    grantEntitlement: false
  });
  return {
    result: { providerPaymentId, purchaseType }
  };
}
__name(processStripeInvoiceSucceeded, "processStripeInvoiceSucceeded");
async function processStripeInvoiceFailure(data) {
  const invoice = data.payload;
  if (!invoice || typeof invoice === "string") {
    return null;
  }
  const providerSubscriptionId = readExpandableId(invoice.subscription) || invoice.parent?.subscription_details?.subscription || invoice.lines?.data?.[0]?.parent?.subscription_item_details?.subscription || null;
  const providerCustomerId = readExpandableId(invoice.customer);
  const providerPriceId = invoice.parent?.subscription_details?.metadata?.provider_price_id || invoice.lines?.data?.[0]?.metadata?.provider_price_id || invoice.lines?.data?.[0]?.pricing?.price_details?.price || invoice.lines?.data?.[0]?.price?.id || null;
  const fallbackProductPriceId = invoice.parent?.subscription_details?.metadata?.product_price_id || invoice.lines?.data?.[0]?.metadata?.product_price_id || null;
  const context = await resolveSubscriptionContext({
    fallbackUserId: invoice.parent?.subscription_details?.metadata?.user_id || invoice.lines?.data?.[0]?.metadata?.user_id || null,
    fallbackProductPriceId,
    providerSubscriptionId,
    providerCustomerId,
    providerPriceId
  });
  if (!context) {
    return null;
  }
  const subscriptionUpdated = await markStripeSubscriptionPaymentFailed({
    context,
    providerSubscriptionId,
    providerCustomerId,
    providerStatus: invoice.status || "payment_failed"
  });
  return {
    emailType: "email/payment.failed",
    emailPayload: {
      userId: context.userId,
      email: invoice.customer_email || invoice.parent?.subscription_details?.metadata?.user_email || invoice.lines?.data?.[0]?.metadata?.user_email || null,
      name: invoice.parent?.subscription_details?.metadata?.user_name || invoice.lines?.data?.[0]?.metadata?.user_name || null,
      productName: invoice.parent?.subscription_details?.metadata?.product_name || invoice.lines?.data?.[0]?.metadata?.product_name || "your subscription",
      provider: "stripe",
      providerEventId: data.eventId || invoice.id || null,
      dedupeKey: buildStripeEmailDedupeKey(
        "email/payment.failed",
        data.eventId || null,
        providerSubscriptionId || invoice.id || "invoice"
      )
    },
    result: {
      providerSubscriptionId: providerSubscriptionId || null,
      status: "payment_failed",
      subscriptionUpdated
    }
  };
}
__name(processStripeInvoiceFailure, "processStripeInvoiceFailure");
function createStripeTask(id, handler) {
  return task({
    id,
    retry: { maxAttempts: 3 },
    run: /* @__PURE__ */ __name(async (data) => {
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
            input: emailPayload
          });
        }
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Job failed";
        await failJob(jobId, message);
        throw error;
      }
    }, "run")
  });
}
__name(createStripeTask, "createStripeTask");
var stripeCheckoutCompletedJob = createStripeTask(
  "payment-checkout-completed",
  processStripeCheckoutCompleted
);
var stripeSubscriptionCreatedJob = createStripeTask(
  "payment-subscription-created",
  (data) => processStripeSubscriptionChange(data, false)
);
var stripeSubscriptionUpdatedJob = createStripeTask(
  "payment-subscription-updated",
  (data) => processStripeSubscriptionChange(data, false)
);
var stripeSubscriptionDeletedJob = createStripeTask(
  "payment-subscription-deleted",
  (data) => processStripeSubscriptionChange(data, true)
);
var stripeInvoiceSucceededJob = createStripeTask(
  "payment-invoice-succeeded",
  processStripeInvoiceSucceeded
);
var stripeInvoiceFailedJob = createStripeTask(
  "payment-invoice-failed",
  processStripeInvoiceFailure
);
export {
  stripeCheckoutCompletedJob,
  stripeInvoiceFailedJob,
  stripeInvoiceSucceededJob,
  stripeSubscriptionCreatedJob,
  stripeSubscriptionDeletedJob,
  stripeSubscriptionUpdatedJob
};
//# sourceMappingURL=stripe-webhook.mjs.map
