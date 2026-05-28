# PRD-06 — Generation Progress Screen

## Feature Summary

An authenticated client-side screen at `/app/generate/progress?jobId=<id>` that subscribes to the `jobs` row in real-time via Supabase Realtime and displays a live progress bar to the user while their meal plan is being generated. When the job reaches `status = 'completed'`, the screen automatically redirects to the meal plan view. When the job reaches `status = 'failed'`, an error state is shown with a retry CTA. The screen covers the 1–3 minute window between the generation form submission and a viewable meal plan.

---

## User Problem

After submitting the generation form, the user is redirected to a URL with no content until PRD-06 is built. Generation takes 1–3 minutes — long enough that a blank or static screen will cause users to assume the app has crashed and either navigate away or refresh, potentially corrupting the generation state.

---

## User Goal

The user wants to know their meal plan is being generated, see that it is progressing, and be taken directly to the result when it is ready — without any manual action.

---

## MVP Scope

- Page at `src/app/(protected)/app/generate/progress/page.tsx` that reads `jobId` from the URL search params and performs an initial server-side guard
- Client component that subscribes to `jobs` row changes via Supabase Realtime
- Progress bar mapping `jobs.progress` (0–100) to a visual percentage
- Status messages keyed to progress ranges: queued/early, generating text, generating images, almost done
- Auto-redirect to `/app/plan/<meal_plan_id>` when `jobs.status = 'completed'`
- Error state with "Try again" link back to `/app/generate` when `jobs.status = 'failed'`
- Guard: if `jobId` is missing or the job does not belong to the authenticated user, redirect to `/app`

---

## Out of Scope

- Email or push notification when generation completes
- Manual polling fallback if Realtime fails (Realtime is reliable enough for MVP)
- Ability to cancel an in-progress generation from this screen
- Showing which specific meals have been generated so far
- Displaying the meal plan partially before all images are complete (PRD-07 responsibility)

---

## User Flow

1. PRD-04 server action completes and calls `redirect('/app/generate/progress?jobId=<id>')`.
2. The page renders server-side: reads `jobId` from search params, calls `requireUser()`, fetches the job to verify it belongs to the authenticated user. If invalid, redirects to `/app`.
3. The initial `jobs.progress` value is passed to the client component as a prop.
4. The client component mounts and opens a Supabase Realtime subscription on `jobs` filtered by `id = jobId`.
5. As the background job progresses, Realtime pushes updates and the client component updates the progress bar and status message.
6. When `status = 'completed'`: the client fetches the `meal_plans` row to get the plan ID, then calls `router.push('/app/plan/<meal_plan_id>')`.
7. When `status = 'failed'`: the progress UI is replaced by an error state with a "Try again" link to `/app/generate`.
8. User is never expected to stay on this page longer than ~3 minutes.

---

## Screens and UI Requirements

### Progress Screen (default state)

**Layout:** `max-w-md mx-auto py-24` — centred, vertically generous, single column.

**Elements (top to bottom):**
1. **Heading:** `"Generating your meal plan"` — `text-2xl font-heading font-extrabold`
2. **Subheading:** `"This usually takes 1–2 minutes. Don't close this tab."` — `text-sm text-text-secondary`
3. **Progress bar:** Full-width rounded bar. Track: `bg-surface border border-border`. Fill: `bg-primary` transitioning width from `0%` to `100%` based on `jobs.progress`. Includes `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`.
4. **Progress percentage:** `"{progress}%"` — `text-sm text-text-secondary text-right`
5. **Status message:** A single line of descriptive text below the bar, keyed to progress ranges (see Business Logic).

### Error State

Replaces the progress UI when `jobs.status = 'failed'`.

**Elements:**
1. **Heading:** `"Something went wrong"` — `text-2xl font-heading font-extrabold`
2. **Body:** `"We couldn't generate your meal plan. This can happen occasionally — please try again."` — `text-sm text-text-secondary`
3. **CTA:** `<Button asChild>` wrapping `<Link href="/app/generate">Try again</Link>` — full-width on mobile, auto width on desktop.

### Completed State

Not rendered — the page redirects immediately when `status = 'completed'`. No flash of a "done" state is shown; the redirect is the completion signal.

---

## Data Requirements

### Read

| Table | Columns | Method | When |
|-------|---------|--------|------|
| `jobs` | `id`, `user_id`, `status`, `progress` | `getJob(jobId)` server-side | Initial page load (guard + seed value) |
| `jobs` | `id`, `status`, `progress` | Supabase Realtime subscription | Live updates after mount |
| `meal_plans` | `id` | `getMealPlanByJobId(jobId)` | On `status = 'completed'` to get plan ID for redirect |

### New DB helper needed

`getMealPlanByJobId(jobId: string): Promise<{ id: string } | null>` — queries `meal_plans` where `job_id = jobId` using `createSupabaseServerClient()` (called from a client-side fetch after Realtime fires completion, so a route handler or inline client call is needed).

---

## Business Logic

### Guard (server-side, in page)

1. Read `jobId` from `searchParams`. If missing, `redirect('/app')`.
2. Call `requireUser()`.
3. Call `getJob(jobId)`. If null or `job.user_id !== user.id`, `redirect('/app')`.
4. Pass `job.progress` and `job.status` as initial props to the client component.
5. If `job.status === 'completed'` on the initial load (user revisits the page after the job finished), fetch `meal_plans` and redirect immediately server-side.
6. If `job.status === 'failed'` on initial load, render the error state immediately without mounting the Realtime subscription.

### Realtime subscription (client-side)

- Use `createSupabaseBrowserClient()` from `src/lib/supabase/client.ts`.
- Subscribe to the `postgres_changes` event on the `jobs` table with filter `id=eq.<jobId>`.
- On each update event: update local `progress` and `status` state.
- On `status = 'completed'`: call `GET /api/meal-plan-by-job?jobId=<id>` (or a client-side Supabase query) to retrieve the `meal_plans.id`, then `router.push('/app/plan/<id>')`.
- On `status = 'failed'`: update local state to show the error UI.
- Unsubscribe from the channel on component unmount.

### Status messages

| `jobs.progress` range | Message |
|-----------------------|---------|
| 0–10 | `"Getting started…"` |
| 11–29 | `"Crafting your personalised meal plan…"` |
| 30–49 | `"Writing your meals for the week…"` |
| 50–79 | `"Generating meal images…"` |
| 80–94 | `"Almost there…"` |
| 95–100 | `"Finishing up…"` |

### Completed redirect

On `status = 'completed'`, the client component needs to retrieve the meal plan ID. The cleanest approach is a client-side Supabase query: `supabase.from('meal_plans').select('id').eq('job_id', jobId).maybeSingle()` — this is safe because RLS on `meal_plans` restricts reads to the row owner.

---

## Existing Boilerplate Infrastructure Used

| Resource | Location | Usage |
|----------|----------|-------|
| `requireUser()` | `src/lib/auth/require-user.ts` | Guard on page load |
| `getJob()` | `src/lib/db/jobs.ts` | Initial job fetch for guard and seed value |
| `createSupabaseBrowserClient()` | `src/lib/supabase/client.ts` | Realtime subscription in client component |
| `createSupabaseServerClient()` | `src/lib/supabase/server.ts` | New `getMealPlanByJobId` helper |
| `jobs` table | Supabase | Real-time source of truth for progress |
| `meal_plans` table | Supabase | Looked up on completion to get plan ID for redirect |
| Supabase Realtime | Supabase | `postgres_changes` subscription on `jobs` |
| Authenticated layout | `src/app/(protected)/layout.tsx` | Wraps the page automatically |

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| User navigates directly to the URL without a valid `jobId` | `redirect('/app')` from the server page |
| Job belongs to a different user | `redirect('/app')` — `user_id` check in the page guard |
| User arrives after the job already completed | Server-side guard detects `status = 'completed'`, fetches meal plan, and `redirect`s immediately |
| User arrives after the job already failed | Server-side guard detects `status = 'failed'`, renders error state immediately without mounting Realtime |
| Realtime update is delayed or slow | Progress bar reflects the last known value; no timeout or error is shown — the bar simply does not move until the next update arrives |
| `meal_plans` row not found after job completes | Log the error; show an inline message `"Your plan is ready — go to the dashboard"` with a link to `/app` rather than throwing |
| User closes the tab mid-generation | Generation continues in the background. On return, the page guard handles the `completed` or `failed` state based on current DB state |
| User refreshes mid-generation | Page re-renders server-side with the latest `progress` value as the seed; Realtime subscription picks up from there |

---

## Acceptance Criteria

1. Navigating to `/app/generate/progress` without a `jobId` redirects to `/app`.
2. Navigating to `/app/generate/progress?jobId=<id-belonging-to-another-user>` redirects to `/app`.
3. When the page loads with a valid `jobId`, the progress bar renders with the current `jobs.progress` value.
4. As `jobs.progress` updates (via the background job), the progress bar and status message update in real-time without a page refresh.
5. The status message changes as `jobs.progress` crosses each threshold defined in the Business Logic table.
6. When `jobs.status` transitions to `'completed'`, the browser navigates automatically to `/app/plan/<meal_plan_id>`.
7. When `jobs.status` transitions to `'failed'`, the progress UI is replaced by the error state with the heading `"Something went wrong"` and a `"Try again"` link to `/app/generate`.
8. If the job is already `completed` when the page loads, the server redirects immediately to `/app/plan/<meal_plan_id>` without rendering the progress UI.
9. If the job is already `failed` when the page loads, the error state is rendered immediately without mounting a Realtime subscription.
10. The progress bar has the correct ARIA attributes: `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`.
