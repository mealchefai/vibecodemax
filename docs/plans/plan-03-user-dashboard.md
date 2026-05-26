# Feature Plan: User Dashboard

> Replaces the stub `GenerationPlaceholder` with a proper state-aware dashboard. The server resolves the user's current state — no plan, plan generating, or plan ready — and renders the matching card. Introduces the `meal_plans` table (rows written later by PRD-04/05) and the query + UI layer the dashboard depends on.

---

## Tasks

### Database

- [x] Read `supabase/migrations/20260526000000_user_health_profiles.sql` to confirm the migration pattern (trigger function naming, RLS policy style, grant statement) before writing the meal plans migration
- [x] Create `supabase/migrations/20260526000100_meal_plans.sql` with the `meal_plans` table: `id uuid PK`, `user_id uuid` (references `profiles(id)` on delete cascade), `job_id uuid` (references `jobs(id)` on delete set null, nullable), `bmr numeric(7,2) not null`, `tdee numeric(7,2) not null`, `daily_calories integer not null`, `status text not null` (check: `'generating'`, `'ready'`, `'failed'`), `created_at timestamptz`, `updated_at timestamptz`
- [x] Add `updated_at` auto-update trigger in the migration using the same pattern as `set_user_health_profiles_updated_at` in `20260526000000_user_health_profiles.sql`
- [x] Add RLS in the migration: enable row level security; add `SELECT` policy for authenticated users scoped to `user_id = auth.uid()` — no client `INSERT` or `UPDATE` policy
- [x] Add `grant select on public.meal_plans to authenticated;` in the migration
- [x] Add index `create index on public.meal_plans(user_id, created_at desc);` in the migration
- [x] Apply the migration: `npx supabase migration up --include-all`
- [x] Add `meal_plans` Row/Insert/Update type definitions to `src/lib/supabase/database.types.ts` — follow the existing pattern for `user_health_profiles`

### Server Data Layer

- [x] Read `src/lib/db/health-profiles.ts` to confirm the query pattern before writing the meal plans equivalent
- [x] Create `src/lib/db/meal-plans.ts` exporting `getMostRecentMealPlan(userId: string)` — queries `meal_plans` where `user_id = userId`, ordered by `created_at desc`, limit 1, returns the row or `null`, using `createSupabaseServerClient()` (RLS-aware)
- [x] Define and export a `MealPlan` type in `src/lib/db/meal-plans.ts` matching the columns the dashboard reads: `id`, `user_id`, `job_id`, `bmr`, `tdee`, `daily_calories`, `status`, `created_at`, `updated_at`
- [x] Define and export a `MealPlanStatus` union type in `src/lib/db/meal-plans.ts`: `'generating' | 'ready' | 'failed'`
- [x] Add `getJob(jobId: string)` to a new `src/lib/db/jobs.ts` — queries `jobs` where `id = jobId`, returns `{ id, status, progress }` or `null`, using `createSupabaseServerClient()`

### Dashboard — UI Components

- [x] Read `src/components/app/upgrade-gate.tsx` and `src/app/(protected)/app/page.tsx` to confirm the card layout pattern before building the three new dashboard cards
- [x] Create `src/components/app/no-meal-plan-card.tsx` as a Server Component:
  - Icon: sparkles SVG in a `h-10 w-10 rounded-lg bg-primary/10` block with `text-primary`
  - Heading: "Generate your first meal plan"
  - Body: "Your calorie target is ready. Generate a personalised 7-day meal plan in about 2 minutes."
  - `<Button size="sm" asChild>` wrapping `<Link href="/app/generate">`: label "Generate my plan"
  - Use `<Card>` + `<CardHeader>` + `<CardContent>`, `bg-surface border-border`
- [x] Create `src/components/app/generating-card.tsx` as a Server Component:
  - Accept props: `progress: number`, `jobId: string | null`
  - Heading: "Your meal plan is being prepared"
  - Body: "This usually takes 1–3 minutes. You can leave and come back — we'll have it ready for you."
  - Progress bar: `<div>` with `bg-muted` track and `bg-primary` fill at `width: {progress}%`; `role="progressbar"`, `aria-valuenow={progress}`, `aria-valuemin={0}`, `aria-valuemax={100}`
  - Progress label beneath bar: "Almost ready!" when `progress >= 90`, otherwise "Generating…"
  - Link below label: when `jobId` is not null, `<Link href="/app/generate/progress?jobId={jobId}">` with label "View progress"; when `jobId` is null, `<Link href="/app/generate">` with label "Check status"
  - Same `<Card>` layout
- [x] Create `src/components/app/meal-plan-summary-card.tsx` as a Server Component:
  - Accept props: `mealPlanId: string`, `dailyCalories: number`, `goal: 'lose' | 'maintain' | 'gain'`, `createdAt: string`
  - Heading: "Your meal plan is ready"
  - Body: `"{dailyCalories} kcal/day · {goalLabel}"` where goal labels are `lose → "Lose weight"`, `maintain → "Maintain weight"`, `gain → "Gain muscle"`
  - Date line: `"Generated {formatted date}"` — format `createdAt` with `toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })`
  - `<Button size="sm" asChild>` wrapping `<Link href="/app/plan/{mealPlanId}">`: label "View my plan"
  - Same `<Card>` layout

### Dashboard — Page

- [x] Update `src/app/(protected)/app/page.tsx`:
  - Import `getMostRecentMealPlan` from `src/lib/db/meal-plans.ts`
  - Import `getJob` from `src/lib/db/jobs.ts`
  - Import `NoMealPlanCard`, `GeneratingCard`, `MealPlanSummaryCard`
  - Remove the import and usage of `GenerationPlaceholder`
  - After the existing `entitlement` check, call `getMostRecentMealPlan(user.id)` — store result in `mealPlan`
  - If `mealPlan` exists and `mealPlan.status === 'generating'`, call `getJob(mealPlan.job_id)` — store result in `job`
  - Replace `{entitlement ? <GenerationPlaceholder /> : <UpgradeGate />}` with the state-based conditional:
    - No entitlement → `<UpgradeGate />`
    - Entitlement + no plan (or failed plan) → `<NoMealPlanCard />`
    - Entitlement + generating plan → `<GeneratingCard progress={job?.progress ?? 0} jobId={mealPlan.job_id} />`
    - Entitlement + ready plan → `<MealPlanSummaryCard mealPlanId={mealPlan.id} dailyCalories={mealPlan.daily_calories} goal={healthProfile.goal} createdAt={mealPlan.created_at} />`
  - Pass `healthProfile.goal` into `MealPlanSummaryCard` — `healthProfile` is already in scope from the existing profile check
- [x] Delete `src/components/app/generation-placeholder.tsx` — it has been fully replaced by the three state cards

### Verification

- [x] Run `npm run typecheck` — fix any type errors before proceeding
- [x] Run `npm run lint` — fix any lint errors before proceeding

---

## Smoke Tests

1. **Subscribed user with no meal plan sees generate CTA**
   Sign in as a subscribed user who has completed their health profile but has no meal plan. Navigate to `/app`. The card heading "Generate your first meal plan" should be visible. A "Generate my plan" button should be present.

2. **Subscribed user with a generating plan sees progress card**
   Manually insert a `meal_plans` row via the Supabase Studio local UI with `status = 'generating'` and a matching `jobs` row with `progress = 40`. Navigate to `/app`. The card heading "Your meal plan is being prepared" should be visible. A progress bar filled to roughly 40% should appear. The label "Generating…" should be beneath it. A "View progress" link should be visible.

3. **Progress label changes near completion**
   Update the `jobs` row to `progress = 95`. Reload `/app`. The label beneath the bar should read "Almost ready!" instead of "Generating…".

4. **Subscribed user with a ready plan sees summary card**
   Update the `meal_plans` row to `status = 'ready'`. Reload `/app`. The card heading "Your meal plan is ready" should be visible. The calorie target and goal label (e.g. "2 000 kcal/day · Lose weight") should appear. A "View my plan" button should be present.

5. **Failed plan shows generate CTA**
   Update the `meal_plans` row to `status = 'failed'`. Reload `/app`. The "Generate your first meal plan" card should appear — the failed state is not surfaced to the user.

6. **Unsubscribed user still sees upgrade gate**
   Sign in as a user with no active entitlement. Navigate to `/app`. The "Unlock your personalised meal plan" card from PRD-02 should still be visible — all new state cards are behind the entitlement check.

---

## Notes

- **`generation-placeholder.tsx` is deleted as part of this plan.** It was a PRD-02 stub. If any other file imports it, the typecheck step will catch it.
- The `getJob` query uses `createSupabaseServerClient()` (RLS-aware). The `jobs` table has a `SELECT` policy scoped to `user_id` — confirm the `jobs` RLS policy name in `20260519123838_base_core_init.sql` before writing the query to ensure the column name matches.
- Smoke tests 2–5 require directly inserting or updating rows in the local Supabase Studio (`http://localhost:54323`). The generation form (PRD-04) does not exist yet, so test data must be inserted manually.
- `healthProfile` is already fetched and non-null by the time the dashboard renders (the existing redirect handles the null case). It is safe to read `healthProfile.goal` without a null check when passing it to `MealPlanSummaryCard`.
