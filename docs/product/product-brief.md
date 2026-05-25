# Product Brief — Meal Chef AI

**Version:** 1.0  
**Date:** May 2026  
**Status:** MVP Scope Confirmed

---

## 1. Product Overview

Meal Chef AI is a web-based AI meal planner that generates personalised weekly meal plans based on a user's biometric data and health goal. It removes the daily decision of what to eat for busy adults who want to eat healthily but lack the time or knowledge to plan meals properly.

The product is built on an existing Next.js boilerplate that provides authentication, database, file storage, subscription billing, background job processing, email, rate limiting, and deploy infrastructure. This brief covers only the product-specific layer built on top of that foundation.

---

## 2. Problem Statement

Busy adults who want to eat well have no fast, personalised way to plan their meals. Without a plan, they default to takeout or whatever is quickest — not what is healthiest. Existing solutions are either too generic, too expensive (dietitians), or too time-consuming (calorie counting apps that require manual logging).

---

## 3. Target User

Adults who:

- Want to eat healthily but are too busy to plan meals
- Have basic awareness of health goals (lose weight, maintain, or gain muscle) but lack the nutritional knowledge to act on them
- Are willing to pay a monthly fee for a solution that removes the planning effort entirely

---

## 4. Core Value Proposition

A meal plan built specifically around your body and your goal — generated instantly, without appointments or manual tracking.

---

## 5. MVP Goal

A paid-only web app where authenticated subscribers can:

1. Enter their biometric details (age, gender, weight, height, activity level, goal)
2. Select from common food categories
3. Receive a fully generated private weekly meal plan with AI-generated images for each meal

No free tier. No sharing. One active subscription product.

---

## 6. MVP Feature Set

| Feature | Description |
|---|---|
| Health profile form | Collects age, gender, weight, height, activity level, dietary goal |
| BMR & TDEE calculation | Server-side calculation using Mifflin-St Jeor equation |
| AI meal plan generation | GPT-4o generates a structured 7-day, 3-meals-per-day plan |
| AI meal images | Replicate generates one image per meal (21 per plan) |
| Async generation with progress | Background job via Trigger.dev; UI polls via Supabase Realtime |
| Private meal plan view | Meal plans are only accessible to the user who created them |
| Subscription gate | Only users with an active paid entitlement can generate a plan |

---

## 7. What the Boilerplate Already Provides

The following infrastructure is already in place and requires no additional work:

| Capability | Provider | Relevant Tables |
|---|---|---|
| Authentication & sessions | Supabase Auth | `auth.users`, `profiles` |
| Database with RLS | Supabase | All existing tables |
| File storage | Supabase Storage | `files`, `public-assets` bucket, `private-uploads` bucket |
| Subscription billing | Stripe | `products`, `product_prices`, `subscriptions`, `entitlements`, `purchases` |
| Entitlement checking | Boilerplate logic | `entitlements` |
| Background job tracking | Trigger.dev + `jobs` table | `jobs` |
| Transactional email | Resend | `email_deliveries` |
| Rate limiting | Upstash | — |
| Deploy pipeline | Vercel + GitHub | — |

---

## 8. Existing Database Schema (Relevant to This Product)

### `profiles`
Already exists. Linked 1:1 to `auth.users`. Contains `display_name` and `avatar_file_id`.  
**No changes needed.** Health data is stored in a separate `user_health_profiles` table.

### `entitlements`
Already exists. Tracks active subscriptions per user per product.  
**Used as-is** for the subscription gate — check for a row with `status = 'active'` before allowing meal plan generation.

### `jobs`
Already exists. Tracks background job status with `type`, `status` (`queued` → `processing` → `completed` → `failed`), `progress` (0–100), `input` (jsonb), `result` (jsonb), and `error`.  
**Used as-is** for tracking the meal plan generation job. Supabase Realtime on this table drives the UI progress indicator.

### `files`
Already exists. Tracks uploaded/generated files with `bucket`, `key`, `mime_type`, `size_bytes`, `visibility`, and `status`.  
**Used as-is** for storing AI-generated meal images. Images will be stored in the `private-uploads` bucket under the path `meal-plans/<user_id>/<meal_plan_id>/<meal_id>.webp`.

---

## 9. New Database Tables Required

### `user_health_profiles`

Stores the user's biometric inputs and health goal. One row per user.

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid PK` | References `profiles(id)` on delete cascade |
| `age` | `integer` | Required |
| `gender` | `text` | `'male'` or `'female'` |
| `weight_kg` | `numeric(5,2)` | Required |
| `height_cm` | `numeric(5,2)` | Required |
| `activity_level` | `text` | `'sedentary'`, `'light'`, `'moderate'`, `'active'`, `'very_active'` |
| `goal` | `text` | `'lose'`, `'maintain'`, `'gain'` |
| `dietary_preferences` | `text[]` | e.g. `['vegetarian', 'gluten-free']`. Nullable. |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Auto-updated via trigger |

RLS: users can only select and update their own row. Insert is via server action only.

---

### `meal_plans`

One row per generated meal plan. Linked to the background job that created it.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | Default `gen_random_uuid()` |
| `user_id` | `uuid` | References `profiles(id)` on delete cascade |
| `job_id` | `uuid` | References `jobs(id)` on delete set null. Nullable after completion. |
| `bmr` | `numeric(7,2)` | Calculated BMR value in kcal |
| `tdee` | `numeric(7,2)` | Calculated TDEE value in kcal |
| `daily_calories` | `integer` | Target calories after goal adjustment |
| `status` | `text` | `'generating'`, `'ready'`, `'failed'` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Auto-updated via trigger |

RLS: users can only select their own rows. Insert and update via service role (background job).

---

### `meals`

One row per meal within a plan. 21 rows per complete meal plan (7 days × 3 meals).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | Default `gen_random_uuid()` |
| `meal_plan_id` | `uuid` | References `meal_plans(id)` on delete cascade |
| `day` | `integer` | 1–7 (Monday = 1, Sunday = 7) |
| `meal_type` | `text` | `'breakfast'`, `'lunch'`, `'dinner'` |
| `name` | `text` | Meal name e.g. "Grilled Chicken & Quinoa Bowl" |
| `description` | `text` | 1–2 sentence description |
| `ingredients` | `jsonb` | Array of ingredient strings |
| `calories` | `integer` | Estimated kcal for this meal |
| `protein_g` | `integer` | Estimated protein in grams |
| `carbs_g` | `integer` | Estimated carbohydrates in grams |
| `fat_g` | `integer` | Estimated fat in grams |
| `image_file_id` | `uuid` | References `files(id)` on delete set null. Nullable until image is generated. |
| `created_at` | `timestamptz` | Default `now()` |

RLS: users can only select meals belonging to their own meal plans (via join on `meal_plans.user_id`).

---

## 10. APIs and Integrations

### OpenAI — GPT-4o (Meal Plan Text Generation)

- **Purpose:** Generate the structured 7-day meal plan as JSON
- **Called from:** Trigger.dev background job (`generate-meal-plan`)
- **Input to prompt:** BMR, TDEE, daily calorie target, goal, dietary preferences, food category preferences
- **Expected output:** Strict JSON array of 21 meal objects matching the `meals` schema
- **Key requirement:** Output validation and retry logic must be implemented. A malformed JSON response must trigger a retry before marking the job as failed.
- **Environment variable:** `OPENAI_API_KEY`

### Replicate (Meal Image Generation)

- **Purpose:** Generate one food photography image per meal
- **Called from:** Trigger.dev background job (`generate-meal-images`), triggered after `generate-meal-plan` completes
- **Model:** Flux or Stable Diffusion (confirm model at implementation time based on cost and speed)
- **Input:** Meal name + short ingredient list as prompt
- **Output:** Image URL → downloaded and saved to Supabase Storage `private-uploads` bucket under `meal-plans/<user_id>/<meal_plan_id>/<meal_id>.webp`
- **Batching:** Generate in batches of 4–5 concurrently to balance speed and rate limits
- **Environment variable:** `REPLICATE_API_TOKEN`

### Supabase Realtime

- **Purpose:** Push live job status updates to the UI during generation so users see progress without polling
- **Implementation:** Subscribe to changes on the `jobs` table filtered by `id = <current_job_id>`
- **No additional setup required** — Supabase Realtime is available on the existing Supabase instance

---

## 11. Business Logic

### BMR Calculation (Mifflin-St Jeor Equation)

```
Male:   BMR = (10 × weight_kg) + (6.25 × height_cm) − (5 × age) + 5
Female: BMR = (10 × weight_kg) + (6.25 × height_cm) − (5 × age) − 161
```

### TDEE Calculation (Activity Multiplier)

| Activity Level | Multiplier |
|---|---|
| Sedentary | × 1.2 |
| Lightly active | × 1.375 |
| Moderately active | × 1.55 |
| Active | × 1.725 |
| Very active | × 1.9 |

### Daily Calorie Target (Goal Adjustment)

| Goal | Adjustment |
|---|---|
| Lose weight | TDEE − 500 kcal |
| Maintain | TDEE |
| Gain muscle | TDEE + 300 kcal |

This calculation runs server-side in a server action before the background job is queued. The calculated values are stored on the `meal_plans` row.

### Subscription Entitlement Check

Before queuing a generation job, a server action must:

1. Verify the user is authenticated
2. Query `entitlements` for a row where `user_id = auth.uid()` and `status IN ('active', 'trialing')`
3. If no active entitlement exists, return a `403` — do not queue the job

This check must happen server-side. The UI subscription gate is a secondary UX layer only.

---

## 12. Background Jobs

Both jobs run inside the existing **Trigger.dev** setup.

### `generate-meal-plan`

**Trigger:** User submits the meal plan form (server action)  
**Steps:**

1. Create a `meal_plans` row with `status = 'generating'`
2. Create a `jobs` row with `type = 'generate-meal-plan'`, `status = 'queued'`
3. Call GPT-4o with the user's calculated nutrition targets and preferences
4. Validate the JSON response matches the expected schema
5. If invalid: retry up to 2 times, then mark job as `failed` and meal plan as `failed`
6. On success: insert 21 rows into `meals`, update `jobs.status = 'completed'`, update `jobs.progress = 50`
7. Trigger `generate-meal-images` job

### `generate-meal-images`

**Trigger:** `generate-meal-plan` completion  
**Steps:**

1. Fetch all 21 meals for the meal plan
2. Generate images in batches of 4–5 using Replicate
3. For each image: download → upload to Supabase Storage → insert into `files` → update `meals.image_file_id`
4. Update `jobs.progress` incrementally (50 → 100 as images complete)
5. On all images complete: update `meal_plans.status = 'ready'`, `jobs.status = 'completed'`
6. On partial failure: mark failed meals individually, still mark plan as `ready` if majority succeeded

---

## 13. Storage

AI-generated meal images are stored in the existing **`private-uploads`** bucket.

**Key path pattern:** `meal-plans/<user_id>/<meal_plan_id>/<meal_id>.webp`

This fits within the existing RLS structure on `storage.objects` for the `private-uploads` bucket — a new storage policy will be needed to allow reads under the `meal-plans/` folder prefix in addition to the existing `uploads/` prefix.

Images are private by default. They are served via Supabase Storage signed URLs when the meal plan is rendered for the authenticated user.

---

## 14. UI Flow (MVP)

```
Landing page (public)
  → Sign up / Sign in
  → Pricing page → Stripe Checkout → Active subscription
  
Dashboard (authenticated + active subscription)
  → "Create Meal Plan" button
  → Health profile form (if not completed) OR pre-filled form
  → Submit → Server action queues job
  → Generation progress screen (Supabase Realtime on jobs table)
  → Meal plan view (7-day grid, 3 meals per day, each with image)
```

---

## 15. Scope: In vs Out

### In scope for MVP

- Health profile form with biometric inputs
- Server-side BMR/TDEE/calorie target calculation
- Subscription entitlement gate (server-side)
- AI meal plan generation via GPT-4o (structured JSON)
- AI image generation via Replicate (one image per meal)
- Async background job with real-time progress UI
- Private meal plan view (authenticated user only)
- Images stored in private Supabase Storage

### Out of scope for MVP

- Free tier or trial meal plan generation
- Sharing or exporting meal plans
- Editing or regenerating individual meals
- Multiple saved meal plan history
- Nutritional accuracy verification against a real food database
- Email notification when generation completes
- Grocery list or shopping list generation
- Mobile app

---

## 16. Open Decisions

| Decision | Options | Recommendation |
|---|---|---|
| How many meal plans can a subscriber generate? | Unlimited / monthly cap (e.g. 4/month) | **Decide before building** — directly affects cost model given Replicate image costs (~$0.84 per plan at 21 images) |
| What happens to meal plans when subscription lapses? | Read-only access / hidden / deleted | Recommend read-only — user keeps existing plans but cannot generate new ones |
| Should macros show a disclaimer? | Yes / No | **Yes** — AI macro estimates are approximate. Add a one-line disclaimer on the meal plan view. |
| Replicate model selection | Flux Pro / Flux Schnell / SDXL | Evaluate at implementation — Flux Schnell is fastest and cheapest, Flux Pro gives better food photography quality |

---

## 17. Environment Variables Required (New)

These are in addition to the variables already configured by the boilerplate.

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | GPT-4o meal plan text generation |
| `REPLICATE_API_TOKEN` | Meal image generation |

---

*Brief prepared based on confirmed product inputs and confirmed technical requirements. Last updated May 2026.*
