# Feature PRD — PRD-07: Meal Plan View

**Version:** 1.0
**Date:** May 2026
**Status:** Ready for Implementation

---

## Feature Summary

A private, authenticated page at `/app/plan/[id]` that displays the user's completed weekly meal plan. The page renders all 21 meals across 7 days, grouped by day, with each meal showing its AI-generated image, name, description, and macro summary. Day navigation is handled via tabs. Images are served as short-lived signed URLs generated server-side from Supabase Storage.

---

## User Problem

After generation completes, the user is redirected to `/app/plan/<id>` but the route does not exist yet. The user has no way to see the meal plan they just paid for and waited 1–2 minutes to generate.

---

## User Goal

See my complete weekly meal plan — all 7 days, all 3 meals per day — with the AI-generated image, meal name, description, and calorie/macro breakdown for each meal.

---

## MVP Scope

- Server-rendered page at `/app/plan/[id]`
- Server-side ownership guard: redirect to `/app` if the plan does not exist or does not belong to the authenticated user
- Day navigation via 7 tabs (Day 1 → Day 7, labelled Mon → Sun)
- Three meal cards per day: Breakfast, Lunch, Dinner — in that order
- Each meal card displays:
  - AI-generated image (signed URL, fallback placeholder if image is absent)
  - Meal name
  - Description
  - Calorie count and macro summary (protein, carbs, fat)
- One-line macro disclaimer beneath the plan
- A storage RLS migration so the `meal-plans/` path prefix is readable by the authenticated owner

---

## Out of Scope

- Editing or regenerating individual meals
- Downloading or exporting the plan
- Sharing the plan with other users
- Grocery list or shopping list generation
- Nutritional accuracy verification against a real food database
- Pagination or history of multiple past plans
- Printing or PDF export

---

## User Flow

1. User completes generation → PRD-06 progress screen auto-redirects to `/app/plan/<id>`
2. Page loads server-side: ownership is verified, meal data and signed image URLs are fetched
3. User lands on Day 1 (Monday) tab by default
4. User sees three meal cards — Breakfast, Lunch, Dinner — each with image, name, description, and macros
5. User clicks any day tab (Day 2–7) to view that day's meals
6. User reads the macro disclaimer at the bottom of the plan

---

## Screens and UI Requirements

### Page Layout

- Route: `/app/plan/[id]` — protected route inside `(protected)/app/`
- Outer wrapper: `container mx-auto px-container-mobile md:px-container max-w-page`
- Page heading: `"Your Meal Plan"` — `text-2xl font-heading font-extrabold text-text-primary`
- Subheading: daily calorie target — `"Targeting {daily_calories} kcal per day"` — `text-sm text-text-secondary mt-1`

### Day Tab Navigation

- Seven tabs labelled **Mon, Tue, Wed, Thu, Fri, Sat, Sun** (mapped from `day` values 1–7)
- Use `<Tabs>` from shadcn/ui (`@/components/ui/tabs`)
- Default active tab: Day 1 (Monday)
- Tab list sits below the page heading with `mt-6`

### Meal Card

One card per meal, rendered inside the active day's tab panel. Three cards per day stacked vertically with `space-y-4`.

Each card layout (top to bottom):

1. **Image** — full-width, aspect ratio 16/9, `object-cover rounded-t-xl`. If `image_file_id` is null or signed URL generation fails, render a neutral placeholder div with `bg-muted` and a fork-and-knife icon centred.
2. **Card body** — `p-4 space-y-1`
   - Meal type badge: `"Breakfast"` / `"Lunch"` / `"Dinner"` — `text-xs font-medium uppercase tracking-wide text-text-secondary`
   - Meal name — `text-base font-semibold text-text-primary`
   - Description — `text-sm text-text-secondary`
3. **Macro row** — `flex gap-4 pt-2 border-t border-border mt-2`
   - Four inline stats: **Calories**, **Protein**, **Carbs**, **Fat**
   - Each stat: label `text-xs text-text-secondary` above value `text-sm font-semibold text-text-primary`
   - Format: `{calories} kcal`, `{protein_g}g`, `{carbs_g}g`, `{fat_g}g`

### Macro Disclaimer

Rendered below the tab panel, full width:

```
* Calorie and macro values are AI estimates. They are intended as a guide only and may vary based on portion sizes and preparation methods.
```

Style: `text-xs text-text-secondary mt-8`

---

## Data Requirements

### Query: Meal Plan + Meals

Fetched server-side using `createSupabaseServerClient()` (respects RLS).

```
meal_plans
  id, user_id, daily_calories, status
  → meals (all 21 rows)
      id, day, meal_type, name, description,
      ingredients, calories, protein_g, carbs_g, fat_g,
      image_file_id
```

RLS on `meals` already enforces that only meals belonging to the authenticated user's plans are returned.

### Signed URLs

For each meal with a non-null `image_file_id`:

1. Look up the `files` row to get `bucket` and `key`
2. Call `supabase.storage.from(bucket).createSignedUrl(key, 3600)` — 1-hour expiry
3. Pass the resulting URL as a prop to the image component
4. If the call errors or returns null, fall back to the placeholder

Signed URL generation runs server-side inside the page's async Server Component — no client-side fetching needed.

### Storage RLS

The existing `private_uploads_select_own` policy on `storage.objects` only permits paths under `uploads/<uid>/`. Meal images are stored under `meal-plans/<uid>/<meal_plan_id>/`. A new migration must add a SELECT policy for this prefix pattern.

---

## Business Logic

### Ownership Guard

On every request to `/app/plan/[id]`:

1. Call `requireUser()` — redirects to sign-in if unauthenticated
2. Query `meal_plans` for the given `id`
3. If the row does not exist or `meal_plan.user_id !== user.id` → `redirect('/app')`
4. If `meal_plan.status === 'generating'` → `redirect('/app/generate/progress?jobId=' + meal_plan.job_id)` (user navigated back before generation finished)
5. If `meal_plan.status === 'failed'` → render an error state with a link to `/app/generate`

### Day Ordering

Meals are ordered by `day ASC`, then by `meal_type` in the fixed sequence: breakfast → lunch → dinner. Group into a `Map<number, Meal[]>` (keys 1–7) before rendering.

### Partial Image State

`image_file_id` is null if image generation failed for that meal (non-fatal partial failure from PRD-05). The image slot renders the placeholder silently — no error message is shown to the user for individual missing images.

---

## Existing Boilerplate Infrastructure Used

| Infrastructure | Usage |
|---|---|
| `createSupabaseServerClient()` | Server-side data fetch with RLS |
| `requireUser()` | Authentication guard |
| Supabase Storage signed URLs | Serve private meal images |
| `private-uploads` bucket | Already created — images stored here by PRD-05 |
| `files` table | Look up `bucket` + `key` for each image |
| shadcn/ui `<Tabs>` | Day navigation |
| shadcn/ui `<Card>` | Meal card wrapper |
| Authenticated route layout | `(protected)/app/` layout wraps the page |

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Plan belongs to a different user | `redirect('/app')` server-side |
| Plan does not exist (invalid ID) | `redirect('/app')` server-side |
| Plan is still generating | `redirect('/app/generate/progress?jobId=...')` |
| Plan has `status = 'failed'` | Render error state with "Try again" link to `/app/generate` |
| A meal has no image (`image_file_id` is null) | Render neutral placeholder — no error shown |
| Signed URL generation fails for an image | Fall back to placeholder silently |
| All 21 meals missing (shouldn't happen — guard upstream) | Same error state as `failed` plan |

---

## Acceptance Criteria

1. **Guard — unauthenticated access** — Visiting `/app/plan/<any-id>` while signed out redirects to the sign-in page.
2. **Guard — wrong user** — Visiting `/app/plan/<id>` for a plan owned by a different user redirects to `/app`.
3. **Guard — invalid ID** — Visiting `/app/plan/<non-existent-uuid>` redirects to `/app`.
4. **Guard — still generating** — Visiting the plan page while the job is in progress redirects to the progress screen for that job.
5. **Plan renders** — After successful generation, the page loads and displays the heading `"Your Meal Plan"` and the daily calorie target.
6. **Day tabs** — Seven tabs labelled Mon–Sun are visible. Clicking each tab shows only that day's three meals.
7. **Meal cards** — Each meal card shows the meal name, description, meal type badge, and macro row (calories, protein, carbs, fat).
8. **Images** — Meals with a generated image display it. Meals without an image display the placeholder — no error or broken image tag is shown.
9. **Macro disclaimer** — The disclaimer text appears below the day tabs.
10. **Auto-redirect from progress screen** — Completing smoke test 4 from PRD-06 (job finishes, browser auto-redirects) lands on this page and renders the plan correctly.
