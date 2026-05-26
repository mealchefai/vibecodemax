# Feature PRD: User Dashboard

## Feature Summary

The authenticated user dashboard at `/app` is the post-login home screen. It resolves the user's current state server-side and renders the appropriate UI: a prompt to subscribe (no entitlement), a CTA to generate their first meal plan (subscribed, no plan), a live progress indicator (plan is generating), or a meal plan summary card (plan is ready). This feature replaces the placeholder `GenerationPlaceholder` component that was added as a stub in PRD-02 and connects the full user journey from login to plan view.

---

## User Problem

After logging in, a subscribed user with a completed health profile has no clear starting point. The current dashboard renders a generic placeholder with no actionable next step. A user with a plan in progress has no way to track it. A user whose plan is ready has no way to navigate to it.

---

## User Goal

Land on a dashboard that immediately shows me what to do next — generate my first plan, track an in-progress generation, or view my completed plan.

---

## MVP Scope

- Create the `meal_plans` database migration (table only — rows are written by PRD-04 and PRD-05)
- Implement a server-side `getMostRecentMealPlan(userId)` query function
- Define a server-side `DashboardState` resolver that determines which of four states the user is in
- Replace `GenerationPlaceholder` on `/app` with state-based conditional rendering:
  - **No entitlement** → `<UpgradeGate />` (already implemented in PRD-02 — no change)
  - **Subscribed, no meal plan** → `<NoMealPlanCard />` with "Generate my meal plan" CTA
  - **Subscribed, plan generating** → `<GeneratingCard />` with a progress bar and link to the progress screen
  - **Subscribed, plan ready** → `<MealPlanSummaryCard />` with plan calorie target, goal, and a "View my plan" link

---

## Out of Scope

- The meal plan generation form itself (PRD-04)
- The background generation job (PRD-05)
- The generation progress screen (PRD-06) — the dashboard links to it but does not implement it
- The full meal plan view (PRD-07) — the dashboard links to it but does not implement it
- Health profile editing (PRD-08)
- Multiple saved meal plan history — only the most recent plan is surfaced on the dashboard
- Subscription management or cancellation

---

## User Flow

1. User signs in and lands on `/app`
2. Server resolves the user's state:
   - **No health profile** → redirect to `/app/onboarding/profile` (already handled from PRD-01)
   - **No entitlement** → show `<UpgradeGate />` (already handled from PRD-02)
   - **Entitlement active, no meal plan** → show `<NoMealPlanCard />`
   - **Entitlement active, plan generating** → show `<GeneratingCard />` with progress and a link to `/app/generate/progress?jobId={job_id}`
   - **Entitlement active, plan ready** → show `<MealPlanSummaryCard />` with a link to `/app/plan/{meal_plan_id}`
3. User takes the relevant action from the dashboard card

---

## Screens and UI Requirements

### `/app` — Dashboard (subscribed, no meal plan)

- A card showing:
  - Icon: a sparkles or wand SVG in a `bg-primary/10` icon block
  - Heading: "Generate your first meal plan"
  - Body: "Your calorie target is ready. Generate a personalised 7-day meal plan in about 2 minutes."
  - Primary CTA button: "Generate my plan" → links to `/app/generate` (route stub for PRD-04)

### `/app` — Dashboard (plan is generating)

- A card showing:
  - Heading: "Your meal plan is being prepared"
  - Body: "This usually takes 1–3 minutes. You can leave and come back — we'll have it ready for you."
  - A progress bar reflecting `jobs.progress` (0–100) — rendered with the value fetched at page load; no Realtime subscription on the dashboard itself
  - A text label beneath the bar: "Generating…" when progress < 100, "Almost ready!" when progress ≥ 90
  - A link: "View progress" → `/app/generate/progress?jobId={job_id}`
- The progress bar is a static server-rendered snapshot. Live updates are handled by the progress screen (PRD-06), not this dashboard.

### `/app` — Dashboard (plan is ready)

- A card showing:
  - Heading: "Your meal plan is ready"
  - Body: "{daily_calories} kcal/day · {goal label}" where goal is one of "Lose weight", "Maintain weight", "Gain muscle"
  - A `created_at` date line: "Generated {formatted date}"
  - Primary CTA button: "View my plan" → links to `/app/plan/{meal_plan_id}`
- All dashboard states preserve the existing "Welcome back" heading and "Pro" badge from PRD-02

### Layout

- All states use a single-column card at `max-w-4xl mx-auto` — consistent with the existing dashboard layout
- Card uses `bg-surface border-border` with the existing `<Card>` component

---

## Data Requirements

### New table: `meal_plans`

Create migration `supabase/migrations/20260526000100_meal_plans.sql` with the following:

```sql
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  bmr numeric(7,2) not null,
  tdee numeric(7,2) not null,
  daily_calories integer not null,
  status text not null check (status in ('generating', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

- Add `updated_at` auto-update trigger (same pattern as `user_health_profiles`)
- Enable RLS; add `SELECT` policy for authenticated users scoped to `user_id = auth.uid()`
- No direct client `INSERT` or `UPDATE` policy — writes are via service role from the background job
- Add `grant select on public.meal_plans to authenticated;`
- Add index: `create index on public.meal_plans(user_id, created_at desc);`

### Existing tables read by the dashboard

| Table | Columns read | Purpose |
|---|---|---|
| `user_health_profiles` | `user_id` | Existence check — already queried from PRD-01 |
| `entitlements` | `status` | Gate check — already queried from PRD-02 |
| `meal_plans` | `id`, `status`, `job_id`, `daily_calories`, `created_at` | Determine plan state |
| `jobs` | `progress`, `status` | Snapshot progress value for the generating card |

---

## Business Logic

### Dashboard state resolution

The server resolves exactly one of these states in order:

```
resolveDashboardState(userId):
  1. healthProfile = getHealthProfile(userId)           -- from PRD-01
     if !healthProfile → redirect("/app/onboarding/profile")

  2. entitlement = getUserEntitlement(userId)           -- from PRD-02
     if !entitlement → state = NO_ENTITLEMENT

  3. mealPlan = getMostRecentMealPlan(userId)
     if !mealPlan → state = NO_MEAL_PLAN

  4. if mealPlan.status = 'generating':
       job = getJob(mealPlan.job_id)
       state = GENERATING (with job.progress snapshot)

  5. if mealPlan.status = 'ready':
       state = PLAN_READY

  6. if mealPlan.status = 'failed':
       state = NO_MEAL_PLAN   (failed plan treated same as no plan — user can retry)
```

### `getMostRecentMealPlan`

```
getMostRecentMealPlan(userId):
  query meal_plans
  where user_id = userId
  order by created_at desc
  limit 1
  return row or null
```

Use `createSupabaseServerClient()` (RLS-aware). Returns the most recent plan regardless of status. Failed plans return the same as no plan at the UI level — the state resolver handles the mapping.

### Goal label mapping

| DB value | Display label |
|---|---|
| `lose` | "Lose weight" |
| `maintain` | "Maintain weight" |
| `gain` | "Gain muscle" |

---

## Existing Boilerplate Infrastructure Used

| Infrastructure | Location | How used |
|---|---|---|
| `requireUser()` | `src/lib/auth/require-user.ts` | Auth guard — already in dashboard |
| `createSupabaseServerClient()` | `src/lib/supabase/server.ts` | Server-side DB queries with RLS |
| `getHealthProfile()` | `src/lib/db/health-profiles.ts` | Profile existence check — already in dashboard |
| `getUserEntitlement()` | `src/lib/db/entitlements.ts` | Entitlement check — already in dashboard |
| `<Card>`, `<Button>` | `src/components/ui/` | Card and button layout |
| Authenticated layout | `src/app/(protected)/layout.tsx` | Wraps all dashboard content |
| `jobs` table | Supabase DB | Snapshot progress value for generating card |

---

## Edge Cases

| Case | Handling |
|---|---|
| Meal plan `status = 'failed'` | Treat as `NO_MEAL_PLAN` — show "Generate my plan" CTA so user can retry |
| `job_id` is null on a generating plan | Show generating card without a progress bar; link text changes to "Check status" → `/app/generate` |
| `jobs` row not found for a generating plan | Show generating card with 0% progress; link to `/app/generate` |
| User navigates to `/app` before PRD-04 route exists | "Generate my plan" CTA links to `/app/generate` — this route is a stub until PRD-04 is built; it will 404 gracefully until then |
| User navigates to `/app` before PRD-07 route exists | "View my plan" CTA links to `/app/plan/{id}` — 404 gracefully until PRD-07 is built |
| Subscription lapses while plan exists | Entitlement check returns null → `UpgradeGate` is shown; existing plans are not deleted |

---

## Acceptance Criteria

1. The `meal_plans` migration applies cleanly via `npx supabase migration up --include-all` with no errors.
2. A subscribed user with a completed health profile and no meal plan sees the "Generate your first meal plan" card with a "Generate my plan" button.
3. A subscribed user with a meal plan in `status = 'generating'` sees the "Your meal plan is being prepared" card with a static progress bar and a "View progress" link.
4. A subscribed user with a meal plan in `status = 'ready'` sees the "Your meal plan is ready" card showing the correct calorie target, goal label, and a "View my plan" link.
5. A subscribed user with a meal plan in `status = 'failed'` sees the same card as a user with no plan — the failed state is not surfaced to the user on the dashboard.
6. An unsubscribed user still sees `<UpgradeGate />` — the entitlement check from PRD-02 is unaffected.
7. The "Pro" badge and "Welcome back" heading from PRD-02 remain visible in all subscribed states.
8. No meal plan data is readable by a different authenticated user (RLS enforced — verified by confirming the `SELECT` policy scopes to `user_id = auth.uid()`).
9. `npm run typecheck` passes with no errors.
10. `npm run lint` passes with no errors.
