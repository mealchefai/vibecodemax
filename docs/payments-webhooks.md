# Stripe Payments Webhooks

This project uses Stripe Checkout for one-time purchases and subscriptions.

## Endpoint

Configure Stripe to send webhooks to:

```text
https://<your-domain>/api/webhooks/stripe
```

For local testing, use the included Stripe listener script:

```bash
npm run stripe:listen
```

## Required Environment Variables

Set these server-side variables:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Stripe Events To Configure

Enable these events for the webhook endpoint:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## How Events Affect Your Data

This project records payment state in four tables:

- `webhook_events`: idempotent webhook tracking
- `subscriptions`: recurring billing state
- `purchases`: payment transactions
- `entitlements`: user access state

### One-Time Purchase

`checkout.session.completed` with `mode = payment`:

- records a purchase transaction with `purchase_type = one_time`
- grants an active entitlement for the purchased product

### Initial Subscription Purchase

The first subscription checkout usually produces:

- `checkout.session.completed`
- `customer.subscription.created`
- `invoice.payment_succeeded`

Behavior:

- subscription state is created or updated in `subscriptions`
- the first paid invoice is recorded in `purchases` with `purchase_type = subscription_initial`
- entitlements are driven by the subscription state, not by the invoice transaction

### Renewal

`invoice.payment_succeeded` with `billing_reason = subscription_cycle`:

- records a purchase transaction with `purchase_type = subscription_renewal`
- does not create a second subscription row

### Cancellation

`customer.subscription.deleted` or a cancellation update:

- updates `subscriptions.status`
- updates the matching entitlement

If a cancellation still has paid time left, the entitlement can remain active until the current billing period ends.

## Local Testing

1. Install Stripe CLI if it is not already installed.
2. Log in with Stripe CLI:

   ```bash
   stripe login
   ```

3. Run the app, Trigger.dev worker, and Stripe listener locally:

   ```bash
   npm run dev:all
   ```

4. The listener reads `NEXT_PUBLIC_SITE_URL` from `.env.local` and forwards events to `/api/webhooks/stripe`.
5. If you need to override the local app URL, set `STRIPE_LOCAL_APP_URL` in `.env.local`.
6. Copy the `whsec_...` signing secret printed by Stripe CLI and set it as `STRIPE_WEBHOOK_SECRET` in `.env.local`.
7. Restart the app after changing `.env.local`.

Use the `STRIPE_WEBHOOK_SECRET` from the Stripe CLI listener for local testing. A webhook signing secret from a Dashboard endpoint is different and will not verify CLI-forwarded events.

### Test a One-Time Purchase

1. Run the app locally.
2. Start the local Stripe listener.
3. Complete a test purchase.

Expected result:

- a `one_time` row in `purchases`
- an active entitlement for the product

### Test an Initial Subscription

1. Run the app locally.
2. Start the local Stripe listener.
3. Complete a subscription checkout in Stripe test mode.
4. Confirm the webhook endpoint receives:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `invoice.payment_succeeded`

Expected result:

- an active row in `subscriptions`
- a `subscription_initial` row in `purchases`

### Test a Renewal

Use Stripe test clocks or subscription simulation while the local Stripe listener is running.

Expected result:

- `invoice.payment_succeeded`
- `billing_reason = subscription_cycle`
- a `subscription_renewal` row in `purchases`

### Test a Cancellation

Cancel the subscription in Stripe test mode while the local Stripe listener is running.

Expected result:

- `customer.subscription.deleted` or `customer.subscription.updated`
- updated subscription status
- entitlement updated to reflect the canceled state

## Troubleshooting Checklist

If Stripe checkouts complete but records do not change:

1. Confirm Stripe is sending events to `/api/webhooks/stripe`.
2. Confirm `STRIPE_WEBHOOK_SECRET` matches the endpoint signing secret.
3. Confirm the relevant `product_prices.provider_price_id` values match Stripe prices.
4. Check `webhook_events` first to verify the event was received and dispatched.

If subscription renewal payments arrive without a clear subscription id:

- the project can still record the payment transaction by resolving the user and product from local Stripe customer context
- if that fallback is too weak, the transaction is recorded without forcing a guessed subscription id
