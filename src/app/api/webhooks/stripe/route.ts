import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { constructWebhookEvent } from "@/lib/integrations/stripe";
import { triggerJob } from "@/lib/jobs/trigger";
import {
  claimWebhookEventForDispatch,
  markWebhookEventDispatched,
  markWebhookEventDispatchFailed,
} from "@/lib/payments/webhook-handlers";

function readObjectId(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = (value as { id?: unknown }).id;
  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate
    : null;
}

const STRIPE_EVENT_TO_JOB: Record<string, string> = {
  "checkout.session.completed": "payment/checkout.completed",
  "customer.subscription.created": "payment/subscription.created",
  "customer.subscription.updated": "payment/subscription.updated",
  "customer.subscription.deleted": "payment/subscription.deleted",
  "invoice.payment_succeeded": "payment/invoice.succeeded",
  "invoice.payment_failed": "payment/invoice.failed",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;
    try {
      event = await constructWebhookEvent(body, signature);
    } catch (error) {
      if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 400 }
        );
      }

      throw error;
    }

    const eventData = event;
    const eventId = eventData.id || readObjectId(eventData.data.object);
    const jobType = STRIPE_EVENT_TO_JOB[eventData.type];

    if (!jobType) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const claimToken = eventId
      ? await claimWebhookEventForDispatch("stripe", eventId, eventData)
      : null;
    if (eventId && !claimToken) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    try {
      await triggerJob({
        type: jobType,
        userId: null,
        input: {
          provider: "stripe",
          eventId: eventId || null,
          eventType: eventData.type,
          payload: eventData.data.object,
        },
      });
    } catch (error) {
      if (eventId && claimToken) {
        const message =
          error instanceof Error ? error.message : "Failed to dispatch job";
        await markWebhookEventDispatchFailed(
          "stripe",
          eventId,
          claimToken,
          message
        );
      }
      throw error;
    }

    if (eventId && claimToken) {
      await markWebhookEventDispatched("stripe", eventId, claimToken);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
