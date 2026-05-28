# Feature Plan: Generation Progress Screen

> A server-guarded page at `/app/generate/progress?jobId=<id>` that shows a live progress bar while a meal plan is being generated. The page seeds itself server-side with the current job state, then mounts a client component that subscribes to the `jobs` row via Supabase Realtime and updates the progress bar in real-time. When the job completes, the user is automatically redirected to `/app/plan/<meal_plan_id>`. When the job fails, an error state is shown with a link back to `/app/generate`.

---

## Tasks

### Server Logic — DB Helper

- [x] Read `src/lib/db/meal-plans.ts` to confirm the `createSupabaseServerClient()` query pattern before writing the new helper
- [x] Add `getMealPlanByJobId(jobId: string): Promise<{ id: string } | null>` to `src/lib/db/meal-plans.ts` — queries `meal_plans` where `job_id = jobId` using `createSupabaseServerClient()`, selects `id` only, returns the row or null

### UI — Progress Client Component

- [x] Read `src/components/app/generating-card.tsx` to confirm the existing progress bar markup (`role="progressbar"`, `aria-valuenow`, fill div with inline `width` style, `transition-all`) before building the progress screen component
- [x] Read `src/components/forms/generate-meal-plan-form.tsx` to confirm the `"use client"` component structure and import style before writing the new component
- [x] Create `src/components/app/generation-progress.tsx` as a `"use client"` component accepting props `{ jobId: string; initialProgress: number; initialStatus: string }`:
  - Initialise `progress` and `status` state from the props
  - On mount, open a Supabase Realtime `postgres_changes` subscription on the `jobs` table filtered by `id=eq.<jobId>` using `createSupabaseBrowserClient()` from `src/lib/supabase/client.ts`
  - On each Realtime update event: update `progress` and `status` state from `new.progress` and `new.status`
  - When `status === 'completed'`: query `supabase.from('meal_plans').select('id').eq('job_id', jobId).maybeSingle()` to get the plan ID, then call `router.push('/app/plan/<id>')`. If the plan row is not found, fall back to `router.push('/app')`
  - When `status === 'failed'`: update state to render the error UI
  - Unsubscribe from the Realtime channel on component unmount via the `useEffect` cleanup function
  - Render the **progress UI** when `status !== 'failed'`:
    - Heading: `"Generating your meal plan"` — `text-2xl font-heading font-extrabold`
    - Subheading: `"This usually takes 1–2 minutes. Don't close this tab."` — `text-sm text-text-secondary mt-2`
    - Progress bar: full-width track div `h-2 w-full overflow-hidden rounded-full bg-muted` with `role="progressbar"` `aria-valuenow={progress}` `aria-valuemin={0}` `aria-valuemax={100}`; inner fill div `h-full rounded-full bg-primary transition-all duration-500` with `style={{ width: \`${progress}%\` }}`
    - Progress percentage: `"{progress}%"` — `text-sm text-text-secondary text-right mt-1`
    - Status message: `text-sm text-text-secondary mt-2` — mapped from `progress` using the thresholds: 0–10 → `"Getting started…"`, 11–29 → `"Crafting your personalised meal plan…"`, 30–49 → `"Writing your meals for the week…"`, 50–79 → `"Generating meal images…"`, 80–94 → `"Almost there…"`, 95–100 → `"Finishing up…"`
  - Render the **error UI** when `status === 'failed'`:
    - Heading: `"Something went wrong"` — `text-2xl font-heading font-extrabold`
    - Body: `"We couldn't generate your meal plan. This can happen occasionally — please try again."` — `text-sm text-text-secondary mt-2`
    - CTA: `<Button asChild className="mt-6 w-full sm:w-auto"><Link href="/app/generate">Try again</Link></Button>`

### UI — Page

- [x] Read `src/app/(public)/checkout/return/page.tsx` to confirm the `searchParams` async prop typing pattern (`type SearchParams = Promise<{ key?: string }>`) before writing the progress page
- [x] Create `src/app/(protected)/app/generate/progress/page.tsx` as an `async` Server Component:
  - Add `export const dynamic = "force-dynamic"` at the top
  - Type `searchParams` as `Promise<{ jobId?: string }>` and await it
  - Call `requireUser()`
  - If `jobId` is missing, call `redirect('/app')`
  - Call `getJob(jobId)` — if null or `job.user_id !== user.id`, call `redirect('/app')`
  - If `job.status === 'completed'`: call `getMealPlanByJobId(jobId)` — if plan found, `redirect('/app/plan/' + plan.id)`, else `redirect('/app')`
  - If `job.status === 'failed'`: render the page passing `initialStatus="failed"` and `initialProgress={0}` so the error UI is shown immediately without mounting Realtime
  - For all other statuses: render `<GenerationProgress jobId={jobId} initialProgress={job.progress ?? 0} initialStatus={job.status} />`
  - Wrap the component in the standard page layout: `<div className="container mx-auto px-container-mobile md:px-container max-w-page"><div className="mx-auto max-w-md py-24">...</div></div>`

### Verification

- [x] Run `npm run typecheck` — fix any type errors before proceeding
- [x] Run `npm run lint` — fix any lint errors before proceeding

---

## Smoke Tests

1. **Guard — missing jobId redirects to dashboard**
   Navigate directly to `/app/generate/progress` with no query string while signed in. You should be immediately redirected to `/app`.

2. **Progress screen renders on valid jobId**
   Submit the generation form from `/app/generate`. You should be redirected to `/app/generate/progress?jobId=...` and see the heading `"Generating your meal plan"`, a progress bar at its initial value, and a status message.

3. **Progress bar and status message update in real-time**
   While on the progress screen with a job running (requires `npm run trigger:dev` active and valid `OPENAI_API_KEY` / `REPLICATE_API_TOKEN` set), watch the progress bar. It should advance without a page refresh, and the status message should change as it crosses the 30%, 50%, and 80% thresholds.

4. **Auto-redirect to meal plan on completion**
   With a running generation job, stay on the progress screen. When the job finishes, the browser should automatically navigate to `/app/plan/<id>` without any user action. (This route will 404 until PRD-07 is built — the redirect itself is the success condition.)

5. **Error state shown on failed job**
   With a `jobs` row in `status = 'failed'` for the current user's job ID, navigate to `/app/generate/progress?jobId=<that-id>`. You should see the heading `"Something went wrong"` and a `"Try again"` button linking to `/app/generate`.

---

## Notes

- **Realtime requires the `jobs` table to be in the Supabase Realtime publication.** If progress updates do not appear in the browser without a page refresh, open the Supabase Studio → Database → Replication and confirm the `jobs` table is enabled. This is a one-time local setup step; the existing boilerplate migrations do not include a Realtime publication statement for `jobs`.
- **`trigger:dev` must be running for smoke tests 3 and 4.** Without it, the job stays `queued` and the progress bar will not advance. Start it with `npm run trigger:dev` in a separate terminal alongside `npm run dev`.
- **The `job.user_id` guard in the page** is critical — without it, any authenticated user who knows a `jobId` UUID could view another user's progress screen. The `jobs` table RLS SELECT policy must permit the user to read their own row for `getJob()` to return data at all; the `user_id` check in the page is a defence-in-depth layer on top of that.
