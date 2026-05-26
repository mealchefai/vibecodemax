# Feature Plan: Subscription Checkout & Entitlement Gate

> Gates the meal plan dashboard behind an active Meal Plan Premium subscription. Unsubscribed users land on an inline upgrade prompt with a link to `/pricing`; subscribed users see the (placeholder) generation UI and a "Pro" badge. The entire checkout flow — from the pricing page CTA through Stripe Checkout to the post-payment return page — uses existing boilerplate infrastructure wired to the already-seeded product.

---

## Tasks

### Server Data Layer

- [x] Read `src/lib/db/health-profiles.ts` to confirm the query pattern (server client, `maybeSingle`, typed return) before writing the entitlement equivalent
- [x] Create `src/lib/db/entitlements.ts` exporting `getUserEntitlement(userId: string)` — queries `entitlements` where `user_id = userId` and `status = 'active'`, returns the first row or `null`, using `createSupabaseServerClient()` (RLS-aware; the `entitlements_select_own` policy already exists)
- [x] Define and export an `Entitlement` type in `src/lib/db/entitlements.ts` matching the columns needed by the gate check: `id`, `user_id`, `product_id`, `status`, `source`, `granted_at`, `expires_at`

### Dashboard — Entitlement Gate

- [x] Read `src/app/(protected)/app/page.tsx` to understand the current dashboard layout before adding the gate
- [x] In `src/app/(protected)/app/page.tsx`, import `getUserEntitlement` and call it after `requireUser()` — store the result in `entitlement`
- [x] Add a "Pro" badge next to the user greeting when `entitlement` is not null — use `bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full` inline with the existing heading
- [x] Replace the existing placeholder card in `src/app/(protected)/app/page.tsx` with a conditional: render `<UpgradeGate />` when `entitlement` is null, render `<GenerationPlaceholder />` when entitlement is active
- [x] Create `src/components/app/upgrade-gate.tsx` as a Server Component with:
  - Heading: "Unlock your personalised meal plan"
  - Body: "Subscribe to generate a calorie-matched meal plan built around your health profile."
  - Primary CTA `<Button>` as a `<Link href="/pricing">`: label "View plans"
  - Card layout matching existing `<Card>` + `<CardHeader>` + `<CardContent>` pattern, `bg-surface border-border`
- [x] Create `src/components/app/generation-placeholder.tsx` as a Server Component — a card with heading "Your Meal Plan" and body "Your personalised meal plan will appear here." (placeholder for PRD-04); same card layout

### Checkout Return Page

- [x] Read `src/app/(public)/checkout/return/page.tsx` in full to understand the current state before replacing its copy
- [x] Update the success state copy in `src/app/(public)/checkout/return/page.tsx`:
  - Title: `"You're all set!"`
  - Description: `"Your subscription is active. Let's build your first meal plan."`
- [x] Update the cancelled state copy in `src/app/(public)/checkout/return/page.tsx`:
  - Title: `"Checkout cancelled"`
  - Description: `"No charge was made. You can subscribe whenever you're ready."`
- [x] Add a `<Link href="/app">` button to the success state with label `"Go to dashboard"` — use `<Button asChild>` pattern consistent with the codebase
- [x] Add a `<Link href="/app">` button to the cancelled state with label `"Back to dashboard"` — use `<Button variant="outline" asChild>`
- [x] Add `requireUser()` to `src/app/(public)/checkout/return/page.tsx` at the top — unauthenticated users hitting this route should redirect to `/login`

### Verification

- [x] Run `npm run typecheck` — fix any type errors before proceeding
- [x] Run `npm run lint` — fix any lint errors before proceeding

---

## Smoke Tests

1. **Unsubscribed user sees upgrade gate**
   Sign in as a user who has completed onboarding but has no active subscription. Navigate to `/app`. The "Unlock your personalised meal plan" heading should be visible. No meal generation UI should appear.

2. **Upgrade Gate CTA links to pricing**
   On the `/app` upgrade gate, click "View plans". You should land on `/pricing`. The Meal Plan Premium card should be visible showing $9/month with the three feature bullets.

3. **Pricing page CTA initiates checkout**
   On `/pricing`, click "Subscribe" on the Meal Plan Premium card. You should be redirected to Stripe Checkout (hosted page) with the correct price pre-loaded. (Use Stripe test card `4242 4242 4242 4242`.)

4. **Successful checkout lands on success return page**
   Complete the Stripe test checkout. You should land on `/checkout/return?status=success` showing the "You're all set!" heading and a "Go to dashboard" button.

5. **Post-payment dashboard is unlocked**
   Click "Go to dashboard" from the success return page. Navigate to `/app`. The upgrade gate should no longer appear. A "Pro" badge should be visible next to the user greeting. The "Your Meal Plan" placeholder card should appear instead of the upgrade gate.

6. **Cancelled checkout lands on cancel return page**
   Start a new checkout and click "Back" or close the Stripe Checkout page. You should land on `/checkout/return?status=cancelled` showing "Checkout cancelled" and a "Back to dashboard" button. Clicking it should return to `/app` where the upgrade gate is still shown.

7. **Subscribed user returning to pricing page**
   As a subscribed user, navigate directly to `/pricing` and click "Subscribe". Stripe Checkout should open (the checkout API uses the existing `provider_customer_id` from `subscriptions` to attach the session to the existing customer — Stripe will prevent a duplicate active subscription).

---

## Notes

- **Stripe local webhook listener must be running** for the entitlement to be written after checkout. Run `npm run stripe:listen` in a separate terminal during smoke testing. Without it, the webhook → Trigger.dev job will not fire and `entitlements` will remain empty even after a successful payment. The gate will re-open on the next page load until the webhook is processed.
- **`getUserEntitlement` does not filter by `product_id`**. The PRD specifies a single product and a single gate, so checking for any `active` entitlement is correct for MVP. If multiple products are introduced later, the query will need a `product_id` filter.
- The checkout API route (`src/app/api/payments/checkout/route.ts`) already handles the `priceId` lookup, deduplication via `provider_customer_id`, and the redirect to `/checkout/return`. No changes to that route are needed — the pricing page CTA wires to it via `?priceId={product_prices.id}` (the UUID), not the Stripe Price ID.
