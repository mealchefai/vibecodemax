# Feature Plan: Meal Plan View

> A server-rendered page at `/app/plan/[id]` that displays the authenticated user's completed weekly meal plan. The user arrives here automatically after generation completes and sees 7 days of meals navigated by tabs, each with an AI-generated image, name, description, and macro breakdown.

---

## Prerequisites

None — all required infrastructure (Supabase, Storage, `files` table, authenticated routes) is already in place.

---

## Tasks

### Storage — RLS Migration

- [x] Create `supabase/migrations/20260529000000_meal_plan_images_storage_policy.sql` — add a `SELECT` policy on `storage.objects` for `private-uploads` covering the `meal-plans/<uid>/` prefix, mirroring the pattern of the existing `private_uploads_select_own` policy in `20990101000001_storage_policies.sql`
- [x] Run `npx supabase migration up --include-all` to apply the migration to the local database

### UI — Tabs Component

- [x] Run `npm install @radix-ui/react-tabs` to install the Radix UI tabs primitive
- [x] Read `src/components/ui/card.tsx` to confirm the existing component structure (forwardRef, `cn()`, named exports) before writing the tabs component
- [x] Create `src/components/ui/tabs.tsx` — export `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` built on `@radix-ui/react-tabs`, following the same pattern as existing shadcn/ui components in the project
- [x] Add `export * from "./tabs"` to `src/components/ui/index.ts`

### Configuration — Next.js Image Remote Patterns

- [x] Read `next.config.ts` to confirm the current config shape before editing
- [x] Add `images.remotePatterns` to `next.config.ts` — derive the hostname from `process.env.NEXT_PUBLIC_SUPABASE_URL` so that both local (`127.0.0.1`) and production Supabase storage signed URLs are served through `<Image>`

### Server Logic — DB Helper

- [x] Read `src/lib/db/meal-plans.ts` to confirm the existing query pattern (`createSupabaseServerClient`, column selection) before writing the new helper
- [x] Add `getMealPlanWithMeals(planId: string)` to `src/lib/db/meal-plans.ts` — queries `meal_plans` by `id` using `createSupabaseServerClient()`, selects `id`, `user_id`, `job_id`, `daily_calories`, `status`, and a nested select of all `meals` rows (`id`, `day`, `meal_type`, `name`, `description`, `calories`, `protein_g`, `carbs_g`, `fat_g`, `image_file_id`) ordered by `day asc`, returns the combined object or null

### Server Logic — Signed URL Helper

- [x] Read `src/lib/storage/file-urls.ts` to confirm `getFileUrl()` accepts `{ bucket, key, visibility }` and uses `supabaseAdmin()` for private files — use this function directly in the page rather than duplicating logic

### UI — Meal Card Component

- [x] Create `src/components/app/meal-card.tsx` — a presentational component (no `"use client"` directive) accepting props: `mealType`, `name`, `description`, `calories`, `proteinG`, `carbsG`, `fatG`, `imageUrl: string | null`:
  - Outer wrapper: `<div className="overflow-hidden rounded-xl border bg-card shadow">`
  - **Image slot**: if `imageUrl` is non-null render `<Image src={imageUrl} alt={name} fill className="object-cover" />` inside a `relative w-full aspect-video` container; if null render a `relative w-full aspect-video bg-muted flex items-center justify-center` div with a `<UtensilsCrossed className="h-8 w-8 text-muted-foreground" />` icon from `lucide-react`
  - **Body**: `<div className="p-4 space-y-1">` containing:
    - Meal type badge: `<span className="text-xs font-medium uppercase tracking-wide text-text-secondary">{mealType}</span>`
    - Name: `<p className="text-base font-semibold text-text-primary">{name}</p>`
    - Description: `<p className="text-sm text-text-secondary">{description}</p>`
  - **Macro row**: `<div className="flex gap-4 pt-2 mt-2 border-t border-border">` with four stat blocks (Calories, Protein, Carbs, Fat), each `<div className="flex flex-col"><span className="text-xs text-text-secondary">{label}</span><span className="text-sm font-semibold text-text-primary">{value}</span></div>`, formatted as `{calories} kcal`, `{proteinG}g`, `{carbsG}g`, `{fatG}g`

### UI — Meal Plan Tabs Component

- [x] Create `src/components/app/meal-plan-tabs.tsx` as a `"use client"` component accepting props: `days: { dayNumber: number; label: string; meals: MealWithImageUrl[] }[]` where `MealWithImageUrl` extends the meal fields with `imageUrl: string | null`:
  - Render `<Tabs defaultValue="1">` wrapping a `<TabsList>` with one `<TabsTrigger value={String(d.dayNumber)}>` per day using the short label (Mon–Sun)
  - For each day render a `<TabsContent value={String(d.dayNumber)}>` containing `<div className="space-y-4 mt-4">` with one `<MealCard>` per meal, passed all required props
  - Export the `MealWithImageUrl` type from this file for use in the page

### UI — Page

- [x] Read `src/app/(protected)/app/generate/progress/page.tsx` to confirm the `async` Server Component structure, `requireUser()` call, `redirect()` guard pattern, and page wrapper classes before writing the plan page
- [x] Create `src/app/(protected)/app/plan/[id]/page.tsx` as an `async` Server Component:
  - Add `export const dynamic = "force-dynamic"` at the top
  - Type params as `Promise<{ id: string }>` and await them
  - Call `requireUser()`
  - Call `getMealPlanWithMeals(id)` — if null or `plan.user_id !== user.id` → `redirect('/app')`
  - If `plan.status === 'generating'` and `plan.job_id` → `redirect('/app/generate/progress?jobId=' + plan.job_id)`; if `plan.job_id` is null → `redirect('/app')`
  - If `plan.status === 'failed'` → render the error state (see below)
  - For `status === 'ready'`: resolve signed URLs — for each meal with a non-null `image_file_id`, call `getFileUrl({ bucket: 'private-uploads', key: file.key, visibility: 'private' })` after looking up the `files` row; pass `null` for meals without an image or where URL resolution fails
  - Build the `days` array: group meals by `day` (1–7), map day numbers to labels `['Mon','Tue','Wed','Thu','Fri','Sat','Sun']`, sort meals within each day in the fixed order breakfast → lunch → dinner
  - Render page wrapper: `<div className="container mx-auto px-container-mobile md:px-container max-w-page"><div className="py-12">`
  - Inside wrapper: heading `<h1 className="text-2xl font-heading font-extrabold text-text-primary">Your Meal Plan</h1>`, subheading `<p className="text-sm text-text-secondary mt-1">Targeting {plan.daily_calories} kcal per day</p>`, then `<MealPlanTabs days={days} className="mt-6" />`
  - Below tabs: disclaimer `<p className="text-xs text-text-secondary mt-8">* Calorie and macro values are AI estimates. They are intended as a guide only and may vary based on portion sizes and preparation methods.</p>`
  - **Error state** (failed plan): heading `"Something went wrong"`, body `"Your meal plan could not be generated. Please try again."`, `<Button asChild><Link href="/app/generate">Try again</Link></Button>`

### Verification

- [x] Run `npm run typecheck` — fix any type errors before proceeding
- [x] Run `npm run lint` — fix any lint errors before proceeding

---

## Smoke Tests

1. **Guard — invalid plan ID redirects to dashboard**
   Navigate to `/app/plan/00000000-0000-0000-0000-000000000000` while signed in. You should be redirected to `/app`.

2. **Auto-redirect from progress screen reaches the plan page**
   Submit a new generation from `/app/generate` with `npm run trigger:dev` running. Stay on the progress screen. When generation completes, the browser should automatically redirect to `/app/plan/<id>` and render the page heading `"Your Meal Plan"`.

3. **Daily calorie target is shown**
   The plan page subheading should read `"Targeting <n> kcal per day"` with the number matching the user's calculated target from their health profile.

4. **Day tabs are present and interactive**
   Seven tabs labelled Mon through Sun are visible below the heading. Clicking each tab swaps the visible meal cards without a page reload.

5. **Meal cards render correctly**
   On any day tab, three cards are visible — one each for Breakfast, Lunch, and Dinner — each showing the meal name, description, and a macro row with Calories, Protein, Carbs, and Fat values.

6. **Images load**
   Meals with generated images display the food photograph. Meals without an image (if any) show the placeholder icon — no broken image or error is visible.

7. **Macro disclaimer is visible**
   Below the tab panel, the disclaimer text beginning `"* Calorie and macro values are AI estimates"` is visible.

---

## Notes

- **Signed URL generation uses `supabaseAdmin()`** via the existing `getFileUrl()` helper — this bypasses storage RLS, so the `meal-plans/` storage policy migration is a defence-in-depth measure rather than a functional requirement for this page. It is still included to keep the access model consistent with the rest of the storage configuration.
- **`files` rows must be fetched to get `bucket` and `key`** — `meals.image_file_id` is a foreign key to `files.id`; the page needs to query `files` for each non-null `image_file_id` to get the path needed for `getFileUrl()`. This can be done as a single `IN` query rather than one query per meal.
- **`next/image` requires the Supabase storage hostname to be declared in `next.config.ts`** — without this, Next.js will throw an error at runtime when it encounters a signed URL from a remote host not in `remotePatterns`. The config reads the hostname from `NEXT_PUBLIC_SUPABASE_URL` which is already set in `.env.local`.
