# Feature Plan: Meal Plan Generation Form

> The primary product action. A subscribed user reviews their read-only biometric summary, optionally selects food category preferences, and submits to trigger generation. The server action calculates BMR/TDEE, inserts a `meal_plans` row, dispatches the Trigger.dev background job, and redirects to the progress screen.

---

## Tasks

### Server Logic — BMR/TDEE Calculator

- [x] Create `src/lib/nutrition/calculator.ts` exporting `calculateNutrition(profile: HealthProfile): { bmr: number; tdee: number; daily_calories: number }` — implement the Mifflin-St Jeor BMR formula, the activity multiplier TDEE, and the goal adjustment with a minimum of 1200 kcal for the `lose` goal; return `daily_calories` as a rounded integer

### Server Logic — Meal Plan DB Mutations

- [x] Read `src/lib/db/health-profiles.ts` and `src/lib/supabase/admin.ts` to confirm the admin client mutation pattern before writing the meal plan mutations
- [x] Add `createMealPlan(userId: string, data: { bmr: number; tdee: number; daily_calories: number }): Promise<{ id: string }>` to `src/lib/db/meal-plans.ts` — inserts a `meal_plans` row with `status = 'generating'` and `job_id = null` using `supabaseAdmin()`, returns the new row's `id`
- [x] Add `setMealPlanJobId(mealPlanId: string, jobId: string): Promise<void>` to `src/lib/db/meal-plans.ts` — updates `meal_plans.job_id` for the given row using `supabaseAdmin()`
- [x] Add `getGeneratingMealPlan(userId: string): Promise<MealPlan | null>` to `src/lib/db/meal-plans.ts` — queries `meal_plans` where `user_id = userId` and `status = 'generating'`, returns the row or `null`, using `createSupabaseServerClient()`

### Server Action

- [x] Read `src/app/(protected)/app/onboarding/actions.ts` to confirm the server action pattern (`"use server"`, `requireUser`, typed state, `redirect` on success) before writing the generate action
- [x] Read `src/lib/security/rate-limit.ts` to confirm the `enforceRateLimit` signature before calling it
- [x] Read `src/lib/jobs/trigger.ts` to confirm the `triggerJob` signature and input shape before calling it
- [x] Create `src/app/(protected)/app/generate/actions.ts` with `"use server"` directive
- [x] Export `GenerateMealPlanFormState` interface from `actions.ts` with shape `{ errors?: { _root?: string; food_categories?: string } }`
- [x] Implement `generateMealPlan(_prevState: GenerateMealPlanFormState, formData: FormData): Promise<GenerateMealPlanFormState>` in `actions.ts` with the following steps in order:
  1. Call `requireUser()` — return `_root` error if not authenticated
  2. Call `enforceRateLimit({ key: 'generate-meal-plan:' + user.id, limit: 3, windowSeconds: 86400 })` — return `_root` error `"You have reached the generation limit for today. Please try again tomorrow."` if not allowed
  3. Call `getUserEntitlement(user.id)` — return `_root` error `"An active subscription is required to generate a meal plan."` if null
  4. Call `getGeneratingMealPlan(user.id)` — return `_root` error `"A meal plan is already being generated. Please wait for it to finish."` if a row exists
  5. Call `getHealthProfile(user.id)` — return `_root` error `"Profile not found. Please complete your health profile."` if null
  6. Parse `food_categories` from `formData.getAll('food_categories')` — filter against the allowed list of 8 options; an empty array is valid
  7. Call `calculateNutrition(healthProfile)` to get `{ bmr, tdee, daily_calories }`
  8. Call `createMealPlan(user.id, { bmr, tdee, daily_calories })` — get back `mealPlanId`
  9. Call `triggerJob({ type: 'generate-meal-plan', userId: user.id, input: { meal_plan_id: mealPlanId, user_id: user.id, daily_calories, goal: healthProfile.goal, dietary_preferences: healthProfile.dietary_preferences ?? [], food_categories } })` — get back `{ jobId }`
  10. Call `setMealPlanJobId(mealPlanId, jobId)`
  11. Call `redirect('/app/generate/progress?jobId=' + jobId)`

### UI — Form Component

- [x] Read `src/components/forms/health-profile-form.tsx` to confirm the `useActionState`, chip group, root error banner, and submit button patterns before building the generation form
- [x] Create `src/components/forms/generate-meal-plan-form.tsx` as a `"use client"` component
- [x] In the form component, accept a `generateAction` prop typed as the `generateMealPlan` server action signature, and a `dailyCalories` prop (`number`) for displaying the pre-calculated calorie target in the summary
- [x] Wire `useActionState(generateAction, { errors: {} })` to get `[state, formAction, isPending]`
- [x] Implement the **Food Preferences** section: a `flex flex-wrap gap-2` chip group with 8 options — Chicken, Beef, Fish & Seafood, Eggs, Vegetarian, Dairy, Pasta & Grains, Salads — using `<input type="checkbox" name="food_categories" value={option} className="sr-only">` with `has-[:checked]` label styling matching the existing dietary preferences chip pattern in `health-profile-form.tsx`
- [x] Add section label `"Food preferences"` and helper text `"Optional — select the foods you enjoy. We'll build your plan around these."`
- [x] Add root error banner: render `<div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">` with `<p className="text-sm text-danger">` when `state.errors?._root` is set
- [x] Add submit button: label `"Generate my plan"`, `disabled={isPending}`, loading label `"Generating…"`, class `"w-full sm:w-auto"`

### UI — Page

- [x] Create `src/app/(protected)/app/generate/page.tsx` as an `async` Server Component
- [x] In the page, call `requireUser()` at the top; call `getUserEntitlement(user.id)` — `redirect('/app')` if null
- [x] Call `getHealthProfile(user.id)` — `redirect('/app/onboarding/profile')` if null
- [x] Call `calculateNutrition(healthProfile)` to get `daily_calories` for the biometric summary display
- [x] Render the page heading `"Generate your meal plan"` and subheading `"Review your details and select your food preferences, then generate your personalised 7-day plan."` inside a `max-w-xl mx-auto py-12` layout
- [x] Render the **Biometric Summary** section with label `"Your profile"` — a `grid grid-cols-2 gap-4` block showing six read-only fields: Age (`{age} years`), Weight (`{weight_kg} kg`), Height (`{height_cm} cm`), Goal (mapped label), Activity level (mapped label), Daily calorie target (`{daily_calories} kcal`); each field uses a `<dt>` with `text-xs text-text-secondary` for the label and `<dd>` with `text-sm font-medium text-foreground` for the value
- [x] Add an `"Edit profile"` link (`text-xs text-primary`) to `/app/profile/health` beneath the summary grid
- [x] Render `<GenerateMealPlanForm generateAction={generateMealPlan} dailyCalories={daily_calories} />` below the summary

### Verification

- [x] Run `npm run typecheck` — fix any type errors before proceeding
- [x] Run `npm run lint` — fix any lint errors before proceeding

---

## Smoke Tests

1. **Unsubscribed user cannot access the generate page**
   Sign in as a user with a completed health profile but no active subscription. Navigate to `/app/generate`. You should be immediately redirected to `/app` — the generate page should not render.

2. **Generate page renders biometric summary**
   Sign in as a subscribed user with a completed health profile. Navigate to `/app/generate`. The heading "Generate your meal plan" should be visible. A summary section showing age, weight, height, goal, activity level, and daily calorie target should all be visible. No form fields should be blank or show errors on load.

3. **Food preference chips render and toggle**
   On the generate page, all 8 food category chips should be visible and unselected by default. Click "Chicken" — it should appear visually selected (highlighted border and background). Click it again — it should deselect. Multiple chips should be selectable simultaneously.

4. **Form submits with no food preferences selected**
   Leave all food category chips unselected and click "Generate my plan". The button should change to "Generating…" and be disabled. After the action completes, you should be redirected to `/app/generate/progress?jobId=...` (this route will 404 until PRD-06 is built — a 404 here confirms the redirect occurred correctly).

5. **Form submits with food preferences selected**
   Select two or three food category chips and click "Generate my plan". Same as above — button shows loading state, then redirects to the progress URL.

6. **Duplicate generation is blocked**
   With a `meal_plans` row already in `status = 'generating'` for the current user, navigate to `/app/generate` and click "Generate my plan". The form should display the root error banner: "A meal plan is already being generated. Please wait for it to finish." No redirect should occur.

7. **Dashboard now links correctly**
   Navigate to `/app`. The "Generate my plan" button on the dashboard `<NoMealPlanCard />` should link to `/app/generate`. Clicking it should land on the generate page.

---

## Notes

- **`enforceRateLimit` throws if Upstash env vars are missing.** The function catches internally and returns `{ allowed: false, error: "..." }` — but `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` must be set in `.env.local` for the action to work in development. If they are unset the action will return a generic `_root` error on every submission. Check `.env.local` before testing smoke test 4.
- **The progress route (`/app/generate/progress`) does not exist until PRD-06.** Smoke tests 4 and 5 will land on a 404 after redirect — this is the expected outcome for this PRD. The redirect itself is the success condition.
- **`calculateNutrition` is called twice** — once in the page (Server Component, for display) and once in the server action (before the DB insert). This is intentional: the page cannot pass server-computed values into a server action via hidden fields safely. The calculation is pure and deterministic so the double call is harmless.
- The `triggerJob` dispatch will fail silently in development unless `npm run trigger:dev` is running in a separate terminal. The `meal_plans` row will be created but left with `job_id = null` and `status = 'generating'`. The duplicate guard will then block further attempts. To reset: delete the `meal_plans` row via Supabase Studio and restart `trigger:dev`.
