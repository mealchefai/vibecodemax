# Feature PRD: Meal Plan Generation Form

## Feature Summary

A single-screen form at `/app/generate` where a subscribed user with a completed health profile can trigger the generation of their personalised 7-day meal plan. The page displays a read-only summary of the user's biometric data, a food category preference selector, and a single "Generate my plan" submit button. On submission, a server action validates the request, calculates BMR/TDEE/calorie targets, creates a `meal_plans` row, dispatches the Trigger.dev background job, and redirects the user to the generation progress screen. This is the primary product action — everything before it is setup; everything after it is delivery.

---

## User Problem

A subscribed user who has completed their health profile lands on the dashboard with a "Generate my plan" CTA but has no place to confirm their preferences and initiate generation. Without this form the product delivers nothing — the generation job is never queued and the meal plan is never produced.

---

## User Goal

Confirm my details and trigger the generation of a personalised weekly meal plan in one action.

---

## MVP Scope

- Create the `/app/generate` page (authenticated, subscription-gated)
- Display a read-only biometric summary pulled from the user's health profile
- Implement a food category preference selector (multi-select chip group) with the following options: Chicken, Beef, Fish & Seafood, Eggs, Vegetarian, Dairy, Pasta & Grains, Salads
- Create the `generateMealPlan` server action that:
  1. Verifies authentication via `requireUser()`
  2. Verifies active entitlement via `getUserEntitlement()` — returns a `_root` error if not subscribed
  3. Checks for an in-flight job — returns a `_root` error if a `generating` plan already exists for this user
  4. Reads the user's health profile
  5. Calculates BMR, TDEE, and daily calorie target server-side (Mifflin-St Jeor)
  6. Creates a `meal_plans` row with `status = 'generating'`
  7. Creates and dispatches the Trigger.dev job via `triggerJob()`, storing the `jobId` back onto the `meal_plans` row
  8. Applies rate limiting: max 3 generation requests per user per 24 hours via `enforceRateLimit`
  9. Redirects to `/app/generate/progress?jobId={jobId}` on success

---

## Out of Scope

- The background generation job itself (PRD-05)
- The generation progress screen (PRD-06) — this feature redirects to it but does not build it
- Editing the health profile from this page (PRD-08)
- Regenerating individual meals
- Multiple concurrent active meal plans — only one generating plan at a time per user
- Storing food category preferences on the user profile permanently — they are passed as job input only

---

## User Flow

1. User clicks "Generate my plan" on the dashboard
2. User lands on `/app/generate`
3. Page renders their biometric summary (read-only) and the food category selector (empty by default)
4. User selects one or more food categories (optional)
5. User clicks "Generate my plan"
6. Server action runs: auth check → entitlement check → duplicate-in-flight check → BMR/TDEE calculation → `meal_plans` insert → `triggerJob` dispatch → `meal_plans` job_id update
7. User is redirected to `/app/generate/progress?jobId={jobId}`

---

## Screens and UI Requirements

### `/app/generate` — Generation Form Page

**Layout:** Single-column, `max-w-xl mx-auto`, same spacing as the onboarding page. No sidebar. Page heading: "Generate your meal plan". Subheading: "Review your details and select your food preferences, then generate your personalised 7-day plan."

**Biometric Summary section**

- Section label: "Your profile"
- Read-only display of the following fields in a two-column grid on desktop, stacked on mobile:
  - Age: `{age} years`
  - Weight: `{weight_kg} kg`
  - Height: `{height_cm} cm`
  - Goal: mapped display label (Lose weight / Maintain weight / Gain muscle)
  - Activity level: mapped display label (e.g. "Moderately active")
  - Daily calorie target: `{daily_calories} kcal` — calculated server-side and shown here as a preview
- Each field is a small labelled value block using `text-xs text-text-secondary` for the label and `text-sm font-medium text-foreground` for the value
- A small "Edit profile" link (`text-xs text-primary`) to `/app/profile/health` for users who want to update their data before generating — this route does not exist yet (PRD-08); it renders as a plain link

**Food Preferences section**

- Section label: "Food preferences" with helper text: "Optional — select the foods you enjoy. We'll build your plan around these."
- Multi-select chip group with 8 options: Chicken, Beef, Fish & Seafood, Eggs, Vegetarian, Dairy, Pasta & Grains, Salads
- Same chip/tag visual style as the dietary preferences selector in `health-profile-form.tsx` — native `<input type="checkbox">` with `has-[:checked]` CSS for selected state
- Field name: `food_categories` (maps to multiple checkbox values)
- No minimum selection required — fully optional

**Submit section**

- Root error banner at the top of the form when `errors._root` is set — "Something went wrong. Please try again." (same pattern as `health-profile-form.tsx`)
- Submit button: label "Generate my plan", full-width on mobile, auto width on desktop
- Loading state: "Generating…" with button disabled while the action is pending
- The button is always enabled (no empty-state disable) — food preferences are optional and all required data comes from the profile

---

## Data Requirements

### Tables written

| Table | Operation | Who writes |
|---|---|---|
| `meal_plans` | `INSERT` (status = `'generating'`) | Server action via `supabaseAdmin()` |
| `meal_plans` | `UPDATE` job_id after dispatch | Server action via `supabaseAdmin()` |
| `jobs` | `INSERT` (type = `'generate-meal-plan'`) | `triggerJob()` via `supabaseAdmin()` |

### Tables read

| Table | Columns read | Purpose |
|---|---|---|
| `user_health_profiles` | all columns | BMR/TDEE calculation + display summary |
| `entitlements` | `status` | Subscription gate — already available via `getUserEntitlement()` |
| `meal_plans` | `status` | Duplicate in-flight check |

### Job input payload

The following values are written to `jobs.input` (jsonb) and passed to the Trigger.dev task:

```json
{
  "meal_plan_id": "<uuid>",
  "user_id": "<uuid>",
  "daily_calories": 1950,
  "goal": "lose",
  "dietary_preferences": ["Vegetarian", "Gluten-free"],
  "food_categories": ["Chicken", "Eggs", "Salads"]
}
```

`dietary_preferences` comes from `user_health_profiles.dietary_preferences`. `food_categories` comes from the form submission.

---

## Business Logic

### BMR Calculation (Mifflin-St Jeor)

```
Male:   BMR = (10 × weight_kg) + (6.25 × height_cm) − (5 × age) + 5
Female: BMR = (10 × weight_kg) + (6.25 × height_cm) − (5 × age) − 161
```

### TDEE (Activity Multiplier)

| Activity Level | Multiplier |
|---|---|
| `sedentary` | 1.2 |
| `light` | 1.375 |
| `moderate` | 1.55 |
| `active` | 1.725 |
| `very_active` | 1.9 |

`TDEE = round(BMR × multiplier, 2)`

### Daily Calorie Target (Goal Adjustment)

| Goal | Adjustment |
|---|---|
| `lose` | `TDEE − 500`, minimum 1200 kcal |
| `maintain` | `TDEE` |
| `gain` | `TDEE + 300` |

`daily_calories` is stored as an integer — round to nearest whole number.

### Duplicate in-flight guard

Before creating a new `meal_plans` row, query `meal_plans` for any row with `user_id = user.id` and `status = 'generating'`. If one exists, return `{ errors: { _root: "A meal plan is already being generated. Please wait for it to finish." } }` — do not create a new job.

### Rate limit

Use `enforceRateLimit({ key: "generate-meal-plan:" + user.id, limit: 3, windowSeconds: 86400 })` before any DB writes. If the limit is exceeded, return `{ errors: { _root: "You have reached the generation limit for today. Please try again tomorrow." } }`.

### Job dispatch sequence

1. `INSERT` into `meal_plans` with `bmr`, `tdee`, `daily_calories`, `status = 'generating'`, `job_id = null` → get back `meal_plan_id`
2. Call `triggerJob({ type: 'generate-meal-plan', userId: user.id, input: { meal_plan_id, user_id, daily_calories, goal, dietary_preferences, food_categories } })` → get back `{ jobId }`
3. `UPDATE meal_plans SET job_id = jobId WHERE id = meal_plan_id`
4. `redirect('/app/generate/progress?jobId=' + jobId)`

If `triggerJob` throws, the `meal_plans` row is left with `status = 'generating'` and `job_id = null`. The duplicate-in-flight guard will block further attempts. The Trigger.dev client already calls `failJob` internally on dispatch failure — a cleanup path is not required for MVP.

---

## Existing Boilerplate Infrastructure Used

| Infrastructure | Location | How used |
|---|---|---|
| `requireUser()` | `src/lib/auth/require-user.ts` | Auth guard in server action |
| `getUserEntitlement()` | `src/lib/db/entitlements.ts` | Subscription gate in server action |
| `getHealthProfile()` | `src/lib/db/health-profiles.ts` | Read biometric data for calculation and display |
| `triggerJob()` | `src/lib/jobs/trigger.ts` | Creates `jobs` row + dispatches Trigger.dev task |
| `supabaseAdmin()` | `src/lib/supabase/admin.ts` | `meal_plans` insert and update (bypasses RLS — no client write policy) |
| `enforceRateLimit()` | `src/lib/security/rate-limit.ts` | Per-user daily generation limit |
| `useActionState` (React 19) | — | Wires server action to the form client component |
| Server Actions (`"use server"`) | — | `generateMealPlan` action pattern follows `saveHealthProfile` in `onboarding/actions.ts` |

---

## Edge Cases

| Case | Handling |
|---|---|
| User navigates to `/app/generate` with no health profile | Server component calls `getHealthProfile` — redirects to `/app/onboarding/profile` if null |
| User navigates to `/app/generate` with no active subscription | Server component calls `getUserEntitlement` — redirects to `/app` if null |
| User submits while a plan is already generating | Server action returns `_root` error: "A meal plan is already being generated." |
| User hits the daily rate limit (3 requests/24h) | Server action returns `_root` error: "You have reached the generation limit for today." |
| `triggerJob` throws after `meal_plans` is inserted | `meal_plans` row is left with `status = 'generating'`, `job_id = null`; duplicate guard prevents re-submission; user can contact support |
| User submits with no food categories selected | Valid — food categories are optional; `food_categories` in job input is an empty array |
| Health profile is deleted between page load and submission | `getHealthProfile` in the server action returns null → return `_root` error: "Profile not found. Please complete your health profile." |

---

## Acceptance Criteria

1. Navigating to `/app/generate` without an active subscription redirects to `/app`.
2. Navigating to `/app/generate` without a completed health profile redirects to `/app/onboarding/profile`.
3. The page renders a read-only biometric summary for the authenticated user — age, weight, height, goal, activity level, and calculated daily calorie target are all visible.
4. The food category chip selector renders all 8 options; selected chips are visually distinct from unselected chips.
5. Submitting the form with no food categories selected proceeds without a validation error — food preferences are optional.
6. A valid submission creates a `meal_plans` row in `status = 'generating'` with the correct `bmr`, `tdee`, and `daily_calories` values.
7. A valid submission creates a `jobs` row of type `generate-meal-plan` with the correct input payload including `meal_plan_id`, `daily_calories`, `goal`, `dietary_preferences`, and `food_categories`.
8. A valid submission redirects the user to `/app/generate/progress?jobId={jobId}`.
9. Submitting while a plan is already in `status = 'generating'` shows the `_root` error: "A meal plan is already being generated. Please wait for it to finish."
10. The submit button shows "Generating…" and is disabled while the server action is pending.
11. After 3 submissions within 24 hours, the action returns the rate limit error message and no new job is created.
12. `npm run typecheck` passes with no errors.
13. `npm run lint` passes with no errors.
