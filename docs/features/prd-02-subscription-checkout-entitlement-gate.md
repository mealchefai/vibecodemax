# Feature PRD: Subscription Checkout & Entitlement Gate

## Feature Summary

Users must hold an active **Meal Plan Premium** subscription before they can generate meal plans. This feature adds a server-side entitlement check that gates the meal generation UI, a clear upgrade prompt for users without a subscription, and wires the existing Stripe checkout flow to the already-seeded Meal Plan Premium product. After checkout the user is redirected back into the app with their entitlement active.

---

## User Problem

A user who has completed onboarding and lands on the meal plan dashboard has no way to generate a plan yet — they are not yet a subscriber. Without a clear path to subscribe and an immediate paywall enforced on the backend, either users hit a confusing dead end or unsubscribed users could attempt to call the generation API.

---

## User Goal

Subscribe to Meal Chef in as few steps as possible, then immediately land on a working meal plan dashboard where the "Generate my plan" action is unlocked.

---

## MVP Scope

- ~~Seed one subscription product and price~~ — the **Meal Plan Premium** product and monthly price are already seeded in the local database; no seed data work required
- Implement a server-side `getUserEntitlement(userId)` helper that returns whether the user holds an active subscription
- Gate the meal plan dashboard: users without an active entitlement see an upgrade prompt instead of the generation UI
- Wire the existing Stripe checkout session creation to the seeded **Meal Plan Premium** product (`local_meal_plan_premium_7a5b129d`)
- Handle the post-checkout redirect at `/checkout/return`: on success verify the entitlement is now active and redirect to `/app`; on cancel redirect to `/app`
- Show a simple "Subscription active" badge or confirmation on the dashboard for subscribed users

---

## Out of Scope

- Free trial logic
- Multiple subscription tiers
- Coupon or promo code UI
- Subscription management (cancel, upgrade, billing portal) — that is PRD-03
- Payment method update flows
- Invoice history
- Dunning / failed payment recovery
- Per-feature entitlements beyond the single "can generate" gate

---

## User Flow

1. User completes onboarding (PRD-01) and is redirected to `/app`
2. `/app` calls `getUserEntitlement(user.id)` — no active entitlement found
3. User sees the dashboard with a locked generation section and a prominent "Subscribe to unlock" call-to-action
4. User clicks the CTA → navigated to `/app/subscribe` (or the existing `/pricing` page with a direct checkout link)
5. Stripe Checkout opens (hosted page). User enters card details and confirms
6. Stripe redirects to `/checkout/return?status=success&session_id={CHECKOUT_SESSION_ID}`
7. The return page verifies the session and confirms the entitlement row exists (written by the existing webhook → Trigger.dev job)
8. User is redirected to `/app` — entitlement now active, generation UI is unlocked

---

## Screens and UI Requirements

### `/app` — Dashboard (no entitlement)

- The "Generate my plan" card or section is replaced by an **Upgrade Gate** component
- Upgrade Gate shows:
  - Heading: "Unlock your personalised meal plan"
  - Body: "Subscribe to generate a calorie-matched meal plan built around your health profile."
  - Primary CTA button: "View plans" → links to `/pricing`
- No other content is hidden; the profile summary and nav remain visible
- Do **not** use a modal or overlay — inline replacement only

### `/app` — Dashboard (entitlement active)

- A small badge near the user greeting reads "Pro" (or similar semantic token style, `bg-primary text-primary-foreground`)
- The generation section renders normally (placeholder for PRD-04)

### `/checkout/return`

- **Success state** (`?status=success`):
  - Heading: "You're all set!"
  - Body: "Your subscription is active. Let's build your first meal plan."
  - Single button: "Go to dashboard" → `/app`
  - Do not show raw Stripe session data

- **Cancel state** (`?status=cancelled`):
  - Heading: "Checkout cancelled"
  - Body: "No charge was made. You can subscribe whenever you're ready."
  - Single button: "Back to dashboard" → `/app`

- Both states use a centred single-column layout, `max-w-md mx-auto`, consistent with the onboarding page layout

---

## Data Requirements

### Existing tables used (no schema changes required)

| Table | Used for |
|---|---|
| `products` | The **Meal Plan Premium** product is already seeded — no insert needed |
| `product_prices` | The $9.00/month price is already seeded — no insert needed |
| `subscriptions` | Written by the Stripe webhook job; read to determine entitlement |
| `entitlements` | Written by the Stripe webhook job; primary source of truth for gate checks |
| `purchases` | Written by the Stripe webhook job; referenced for audit |

### Existing seeded product (confirmed in local DB)

| Field | Value |
|---|---|
| `products.id` | `local_meal_plan_premium_7a5b129d` |
| `products.name` | `Meal Plan Premium` |
| `products.provider_product_id` | `prod_UYdFMDyRNkaTkV` |
| `products.type` | `subscription` |
| `products.active` | `true` |
| `product_prices.id` | `ee94fd53-c637-43c5-871d-7728611c580c` |
| `product_prices.provider_price_id` | `price_1TZVyZAPV3rxT0C0G6mi4xh0` |
| `product_prices.amount_cents` | `900` (USD $9.00/month) |
| `product_prices.interval` | `month` |
| `product_prices.is_default` | `true` |

The pricing section at `/pricing` will render this product automatically. The checkout API route reads `provider_price_id` from the DB at runtime — the Stripe Price ID (`price_1TZVyZAPV3rxT0C0G6mi4xh0`) is never hard-coded in application source.

---

## Business Logic

### Entitlement check

```
getUserEntitlement(userId):
  query entitlements where user_id = userId and status = 'active'
  return first row or null
```

- Use the Supabase **server client** (session-aware) so RLS is respected
- The check must run **server-side** in every Server Component that gates content — never trust client-side state alone
- Result is not cached between requests; always fetch fresh (subscription status can change via webhook)

### Checkout session creation

- Reuse or extend the existing checkout session creation route/action in the boilerplate
- Pass the Stripe Price ID from `product_prices` (fetched from DB, not hard-coded)
- Set `success_url` to `{NEXT_PUBLIC_BASE_URL}/checkout/return?status=success&session_id={CHECKOUT_SESSION_ID}`
- Set `cancel_url` to `{NEXT_PUBLIC_BASE_URL}/checkout/return?status=cancelled`
- Pass `customer_email` from the authenticated user's email to pre-fill Stripe Checkout
- Set `mode: 'subscription'`

### Post-checkout return

- The `/checkout/return` page receives `?status` and optionally `?session_id`
- On `status=success`: the entitlement may not yet be written if the webhook has not fired. The page should:
  1. Poll `getUserEntitlement(userId)` up to 5 times with 1-second intervals (server-side via a small client-side fetch or `revalidatePath`)
  2. If entitlement is confirmed, show success state and redirect to `/app` after 2 seconds (or on button click)
  3. If entitlement is not confirmed after polling, still show success state — the webhook may be in-flight; the gate on `/app` will reflect the correct state on next load
- On `status=cancelled`: show cancel state immediately, no polling needed

---

## Existing Boilerplate Infrastructure Used

| Infrastructure | Location | How used |
|---|---|---|
| Stripe client | `src/lib/stripe/` | Creating checkout sessions |
| Stripe webhook handler | `src/app/api/webhooks/stripe/route.ts` | Receives checkout completion events |
| Trigger.dev webhook job | `src/trigger/` | Writes `subscriptions`, `entitlements`, `purchases` rows |
| `products` + `product_prices` tables | Supabase DB | Source of record for pricing display and checkout |
| `entitlements` table | Supabase DB | Single source of truth for the gate |
| `/checkout/return` page | `src/app/(public)/checkout/return/page.tsx` | Extended for Meal Chef post-checkout UX |
| Pricing section | `src/app/(public)/_sections/pricing.tsx` | Renders the subscription product automatically once seeded |
| `requireUser()` | `src/lib/auth/require-user.ts` | Auth guard in all protected pages |
| `createSupabaseServerClient()` | `src/lib/supabase/server.ts` | Server-side DB queries with RLS |

---

## Edge Cases

| Case | Handling |
|---|---|
| User navigates to `/app` immediately after payment, before webhook fires | Entitlement check returns null → gate is shown. On next refresh (after webhook) gate lifts. Return page polled first to reduce this window. |
| User with cancelled subscription navigates to `/app` | `entitlements.status` is not `active` → gate is shown. Existing webhook handler sets status on cancellation. |
| Unauthenticated user reaches `/checkout/return` | `requireUser()` redirects to `/login` |
| Duplicate checkout sessions (user opens checkout twice) | Stripe deduplicates; Trigger.dev job uses upsert on `subscriptions`; idempotent |
| User already subscribed clicks "View plans" CTA | Stripe Checkout creation should check for existing active subscription and redirect to `/app` instead |
| `session_id` missing from success URL | Treat as success state without polling; show success copy and let user proceed |

---

## Acceptance Criteria

1. A user with no entitlement who visits `/app` sees the Upgrade Gate component and does **not** see any meal generation UI.
2. The Upgrade Gate contains a working "View plans" link that navigates to `/pricing`.
3. The `/pricing` page renders the Meal Chef Pro product and monthly price fetched from the database.
4. Clicking the subscribe CTA on the pricing page initiates a Stripe Checkout session in `subscription` mode.
5. Completing checkout redirects to `/checkout/return?status=success`.
6. The success return page shows "You're all set!" copy and a "Go to dashboard" button.
7. Clicking "Go to dashboard" (or auto-redirect) takes the user to `/app` where the Upgrade Gate is no longer shown.
8. Cancelling checkout redirects to `/checkout/return?status=cancelled` with cancel copy and no charge.
9. Clicking "Back to dashboard" from the cancel state returns to `/app`.
10. A user with an active entitlement who visits `/app` sees a "Pro" badge and no Upgrade Gate.
11. `getUserEntitlement` is called server-side; the gate cannot be bypassed by client-side manipulation.
12. No Stripe API keys, Price IDs, or secrets are rendered in client-side HTML or JavaScript bundles.
13. `npm run typecheck` passes with no errors.
14. `npm run lint` passes with no errors.
