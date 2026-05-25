# Feature PRD List — Meal Chef AI MVP

**Version:** 1.0  
**Date:** May 2026  
**Status:** Proposed — Pending Review

---

## Overview

The MVP is broken into 8 buildable feature PRDs, ordered by dependency and priority. Each PRD represents one vertical, user-facing feature or workflow. Full PRDs are written separately once this list is approved.

---

## PRD-01 — User Health Profile Setup

**User goal:** Enter my biometric details and health goal so the app can calculate my calorie targets.

**Why it matters for the MVP:** This is the first product-specific action a user takes after signing up. Without it, meal plan generation cannot be personalised. Every downstream feature depends on this data being present.

**Main user flow:** User logs in → is prompted to complete their health profile → fills in age, gender, weight, height, activity level, goal, and optional dietary preferences → submits → profile is saved.

**Required screens or UI areas:**
- Health profile setup page (onboarding step)
- Form with biometric fields and goal selector
- Dietary preferences selector (optional multi-select)
- Success state / redirect to dashboard

**Data needed:** `user_health_profiles` table (new) — age, gender, weight_kg, height_cm, activity_level, goal, dietary_preferences

**Existing boilerplate infrastructure used:** Supabase database, RLS, authenticated session, server actions

**Product-specific logic needed:**
- Form validation (e.g. age range, weight/height bounds)
- Server action to insert or upsert `user_health_profiles` row
- Redirect logic: if profile already exists, pre-fill form for editing

**Dependencies:** Authentication (already provided by boilerplate)

**MVP priority:** Must-have

---

## PRD-02 — Subscription Checkout & Entitlement Gate

**User goal:** Subscribe to Meal Chef so I can access meal plan generation.

**Why it matters for the MVP:** There is no free tier. All meal plan generation is gated behind an active paid subscription. Users who are not subscribed must be blocked from generating a plan and directed to the pricing page.

**Main user flow:** Unauthenticated or unsubscribed user visits the app → sees pricing page → clicks subscribe → redirected to Stripe Checkout → payment succeeds → webhook creates entitlement → user is redirected to the app with active access.

**Required screens or UI areas:**
- Pricing page (already partially exists in boilerplate — needs product-specific copy and one plan)
- Stripe Checkout (hosted by Stripe — no custom screen needed)
- Post-checkout success redirect page
- Subscription gate component (blocks generation UI for non-subscribers, shows upgrade prompt)

**Data needed:** `products`, `product_prices`, `subscriptions`, `entitlements` (all existing boilerplate tables)

**Existing boilerplate infrastructure used:** Stripe, Stripe webhook handler, `entitlements` table, `subscriptions` table, Trigger.dev webhook job

**Product-specific logic needed:**
- Configure one subscription product in Stripe and seed it into `products` / `product_prices`
- Server-side entitlement check function used by the generation server action
- Gate component that checks entitlement status and renders upgrade CTA or blocks UI

**Dependencies:** Authentication (boilerplate)

**MVP priority:** Must-have

---

## PRD-03 — User Dashboard

**User goal:** See my current state when I log in — either start creating my first meal plan or view my existing one.

**Why it matters for the MVP:** This is the post-login home screen. Without it, authenticated users have no clear starting point. It connects all other features into a coherent journey.

**Main user flow:** User logs in → lands on dashboard → if no health profile: prompt to complete profile → if no meal plan: show "Generate your first meal plan" CTA → if meal plan exists: show plan summary with link to full view → if plan is generating: show progress indicator.

**Required screens or UI areas:**
- Dashboard page (authenticated route)
- Empty state: no profile completed
- Empty state: profile complete, no meal plan yet
- Active state: meal plan ready (summary card + link)
- Generating state: job in progress (progress indicator)

**Data needed:** `user_health_profiles`, `meal_plans`, `jobs`

**Existing boilerplate infrastructure used:** Authenticated layout, Supabase queries, RLS

**Product-specific logic needed:**
- Query to determine user's current state (no profile / no plan / generating / ready)
- Conditional rendering based on state
- Link to generation form or meal plan view

**Dependencies:** PRD-01 (health profile), PRD-02 (subscription), PRD-06 (generation progress), PRD-07 (meal plan view)

**MVP priority:** Must-have

---

## PRD-04 — Meal Plan Generation Form

**User goal:** Trigger the generation of my personalised weekly meal plan.

**Why it matters for the MVP:** This is the core product action. It is the moment the user's biometric data, goal, and food preferences are turned into an AI generation request. It must be simple — one form, one submit.

**Main user flow:** Subscribed user with a completed health profile navigates to the generate page → sees their pre-filled biometric summary (read-only) and food category preferences → confirms and submits → generation job is queued → user is redirected to the progress screen.

**Required screens or UI areas:**
- Generate meal plan page (authenticated + subscription-gated)
- Read-only biometric summary pulled from health profile
- Food category preference selector (e.g. chicken, fish, vegetarian, dairy-free)
- Submit / Generate button
- Server-side entitlement check before job is queued

**Data needed:** `user_health_profiles` (read), `meal_plans` (insert), `jobs` (insert)

**Existing boilerplate infrastructure used:** Server actions, Supabase, Trigger.dev job dispatch, Upstash rate limiting

**Product-specific logic needed:**
- Read health profile and calculate BMR, TDEE, and daily calorie target server-side (Mifflin-St Jeor)
- Server-side entitlement check — reject with 403 if no active subscription
- Create `meal_plans` row with status `generating`
- Create `jobs` row with type `generate-meal-plan` and calculated inputs
- Dispatch Trigger.dev job
- Rate limit: prevent duplicate in-flight generation jobs per user

**Dependencies:** PRD-01 (health profile must exist), PRD-02 (subscription must be active), PRD-05 (job hands off to generation), PRD-06 (redirects to progress screen)

**MVP priority:** Must-have

---

## PRD-05 — AI Meal Plan & Image Generation Jobs

**User goal:** Receive a complete, personalised weekly meal plan with an image for every meal.

**Why it matters for the MVP:** This is the core product value. Without this working reliably, there is no product. It must produce structured, valid meal data and a matching image for all 21 meals.

**Main user flow:** (Background — no direct user interaction) Job is queued → GPT-4o is called with nutrition targets and preferences → structured JSON response is validated → 21 meal rows are written to the database → image generation job begins → Replicate generates images in batches of 4–5 → each image is uploaded to Supabase Storage → `meals.image_file_id` is updated → `meal_plans.status` is set to `ready` → `jobs.progress` reaches 100.

**Required screens or UI areas:** None (background job). Progress is surfaced to the user via PRD-06.

**Data needed:**
- Input: `user_health_profiles`, `meal_plans`, `jobs`
- Output: `meals` (21 rows), `files` (21 image records), Supabase Storage (`private-uploads/meal-plans/<user_id>/<meal_plan_id>/`)

**Existing boilerplate infrastructure used:** Trigger.dev, Supabase Storage, `jobs` table, `files` table, `private-uploads` bucket

**Product-specific logic needed:**
- GPT-4o prompt engineering to produce strict JSON matching the `meals` schema
- JSON schema validation with retry logic (up to 2 retries on malformed output)
- BMR/TDEE/calorie values passed into prompt
- Replicate API call per meal using meal name + ingredients as prompt
- Batch image generation (4–5 concurrent)
- Image download → upload to Supabase Storage → insert `files` row → update `meals.image_file_id`
- `jobs.progress` incremented as images complete (50% after text, 100% after all images)
- Error handling: mark job and meal plan as `failed` if text generation fails; mark plan `ready` with partial images if some image generation fails

**Dependencies:** PRD-04 (job is dispatched from generation form), PRD-06 (progress surfaced via jobs table), PRD-07 (meal plan view reads output)

**MVP priority:** Must-have

---

## PRD-06 — Generation Progress Screen

**User goal:** Know that my meal plan is being generated and see when it is ready.

**Why it matters for the MVP:** Generation takes 1–3 minutes. Without a progress screen, users will think the app is broken and abandon or refresh. This screen is the bridge between submitting the form and viewing the completed plan.

**Main user flow:** User submits generation form → is immediately redirected to the progress screen → screen subscribes to the `jobs` row via Supabase Realtime → progress bar updates as `jobs.progress` increments → when `jobs.status = completed`, user is automatically redirected to the meal plan view → if `jobs.status = failed`, an error state is shown with a retry option.

**Required screens or UI areas:**
- Progress screen (authenticated route, tied to a specific job ID)
- Progress bar or step indicator reflecting `jobs.progress` (0 → 50 → 100)
- Status messages for each phase ("Crafting your meal plan…", "Generating meal images…", "Your plan is ready!")
- Error state with retry CTA
- Auto-redirect on completion

**Data needed:** `jobs` (real-time subscription by job ID), `meal_plans` (to get the plan ID for redirect)

**Existing boilerplate infrastructure used:** Supabase Realtime, `jobs` table, authenticated layout

**Product-specific logic needed:**
- Supabase Realtime subscription on `jobs` filtered by `id = <job_id>`
- Map `jobs.progress` values to human-readable status messages
- Auto-redirect when `status = completed`
- Error state rendering when `status = failed`
- Guard: if user navigates directly to this URL without a valid job, redirect to dashboard

**Dependencies:** PRD-04 (job ID comes from generation form), PRD-05 (job status is updated by background job)

**MVP priority:** Must-have

---

## PRD-07 — Meal Plan View

**User goal:** See my complete weekly meal plan with all meals, macros, and images.

**Why it matters for the MVP:** This is the primary deliverable of the product. Every other feature exists to produce this screen. It must be clear, visually appealing, and easy to navigate across 7 days and 3 meals per day.

**Main user flow:** User is redirected here after generation completes (or navigates from dashboard) → sees their weekly plan laid out by day → each day shows breakfast, lunch, and dinner → each meal shows its AI-generated image, name, description, and calorie/macro summary → user can browse all 7 days.

**Required screens or UI areas:**
- Meal plan page (authenticated, private — user can only view their own plan)
- 7-day layout (tab or scroll navigation by day)
- Meal card per meal: AI image, meal name, description, calories, protein, carbs, fat
- Macro disclaimer (brief note that values are AI estimates)
- Empty/loading state for any meals still awaiting image generation

**Data needed:** `meal_plans`, `meals`, `files` (for image signed URLs)

**Existing boilerplate infrastructure used:** Supabase queries, RLS, Supabase Storage signed URLs, authenticated layout

**Product-specific logic needed:**
- Server-side query: fetch meal plan + all meals + file records for the authenticated user only (RLS enforces privacy)
- Generate Supabase Storage signed URLs for each `image_file_id`
- Handle partial image state (some images may still be generating)
- Redirect to dashboard if meal plan does not belong to the authenticated user or does not exist

**Dependencies:** PRD-05 (meal and image data must exist), PRD-06 (user arrives here from progress screen)

**MVP priority:** Must-have

---

## PRD-08 — Health Profile Edit

**User goal:** Update my biometric details or goal after my initial setup.

**Why it matters for the MVP:** Users' weight, activity level, or goals change. Without the ability to update their profile, they are permanently locked to their initial inputs. This also enables them to generate a new plan that reflects their current stats.

**Main user flow:** User navigates to account settings → selects "Update health profile" → sees their current data pre-filled → edits any fields → submits → profile is updated → user is prompted to generate a new meal plan based on the updated data.

**Required screens or UI areas:**
- Health profile edit page (reuses the setup form from PRD-01 with pre-filled values)
- Save confirmation state
- Optional prompt to re-generate meal plan

**Data needed:** `user_health_profiles` (read + update)

**Existing boilerplate infrastructure used:** Supabase, server actions, authenticated layout

**Product-specific logic needed:**
- Upsert server action (shared with PRD-01 setup form)
- Pre-fill form from existing `user_health_profiles` row

**Dependencies:** PRD-01 (profile must exist to edit), PRD-04 (edit may trigger a new generation)

**MVP priority:** Should-have

---

## Priority Summary

| # | Feature | Priority |
|---|---|---|
| PRD-01 | User Health Profile Setup | Must-have |
| PRD-02 | Subscription Checkout & Entitlement Gate | Must-have |
| PRD-03 | User Dashboard | Must-have |
| PRD-04 | Meal Plan Generation Form | Must-have |
| PRD-05 | AI Meal Plan & Image Generation Jobs | Must-have |
| PRD-06 | Generation Progress Screen | Must-have |
| PRD-07 | Meal Plan View | Must-have |
| PRD-08 | Health Profile Edit | Should-have |

---

## Build Order

Dependencies determine the following recommended build sequence:

```
PRD-01 (Health Profile Setup)
  └── PRD-02 (Subscription & Entitlement Gate)
        └── PRD-03 (Dashboard)
              └── PRD-04 (Generation Form)
                    └── PRD-05 (AI Generation Jobs)
                          ├── PRD-06 (Progress Screen)
                          └── PRD-07 (Meal Plan View)

PRD-08 (Health Profile Edit) — parallel to any of the above, after PRD-01
```

---

*Feature PRD list derived from the Meal Chef AI Product Brief v1.0. Full PRDs to be written per feature once this list is approved.*
