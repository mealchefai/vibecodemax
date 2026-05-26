# Feature Plan: AI Meal Plan & Image Generation Jobs

> Two chained Trigger.dev background jobs that turn a `meal_plans` row with `status = 'generating'` into a complete 7-day meal plan. Job 1 (`generate-meal-plan`) calls GPT-4o to produce 21 structured meals and inserts them into the `meals` table. Job 2 (`generate-meal-images`) calls Replicate to generate a food photo for each meal, uploads it to Supabase Storage, records the file, and marks the plan `status = 'ready'`.

---

## Prerequisites

- [x] **OpenAI API key** — Log in to [platform.openai.com](https://platform.openai.com), go to API Keys, create a new secret key, and add it to `.env.local` as `OPENAI_API_KEY=<key>`.
- [x] **Replicate API token** — Log in to [replicate.com](https://replicate.com), go to Account → API Tokens, copy your token, and add it to `.env.local` as `REPLICATE_API_TOKEN=<token>`.

---

## Tasks

### Database — Migration

- [x] Create `supabase/migrations/20260526000200_meals.sql` — add the `meals` table with columns `id` (uuid PK), `meal_plan_id` (uuid FK → `meal_plans.id` ON DELETE CASCADE), `day` (smallint, check 1–7), `meal_type` (text, check 'breakfast'|'lunch'|'dinner'), `name` (text), `description` (text), `ingredients` (jsonb default '[]'), `calories` (integer), `protein_g` (numeric 6,1), `carbs_g` (numeric 6,1), `fat_g` (numeric 6,1), `image_file_id` (uuid nullable FK → `files.id` ON DELETE SET NULL), `created_at` (timestamptz default now()); add index `meals_meal_plan_id_idx` on `(meal_plan_id)`; enable RLS with a SELECT policy allowing reads where a matching `meal_plans` row has `user_id = auth.uid()`
- [x] Run `npx supabase migration up --include-all` to apply the migration locally

### Dependencies — Install Packages

- [x] Run `npm install openai replicate` to add the OpenAI and Replicate SDKs

### Server Logic — DB Helpers

- [x] Read `src/lib/db/meal-plans.ts` to confirm the `supabaseAdmin()` mutation pattern before writing new helpers
- [x] Create `src/lib/db/meals.ts` — export `insertMeals(meals: MealInsert[]): Promise<{ id: string }[]>` that batch-inserts all rows into `meals` using `supabaseAdmin()` and returns the inserted IDs; export `updateMealImageFileId(mealId: string, fileId: string): Promise<void>` that sets `image_file_id` on a single meal row using `supabaseAdmin()`
- [x] Add `updateMealPlanStatus(mealPlanId: string, status: 'ready' | 'failed'): Promise<void>` to `src/lib/db/meal-plans.ts` — updates `meal_plans.status` for the given row using `supabaseAdmin()`

### Server Logic — OpenAI Helper

- [x] Create `src/lib/ai/openai.ts` — initialise an `OpenAI` client using `process.env.OPENAI_API_KEY`; export `generateMealPlanText(params: { daily_calories: number; goal: string; dietary_preferences: string[]; food_categories: string[] }): Promise<GeneratedMeal[]>` where `GeneratedMeal` is `{ day: number; meal_type: 'breakfast'|'lunch'|'dinner'; name: string; description: string; ingredients: string[]; calories: number; protein_g: number; carbs_g: number; fat_g: number }`; build a system prompt instructing the model to return a JSON object with a `meals` array of exactly 21 items (day 1–7 × breakfast/lunch/dinner), distributed as ~25% breakfast / ~35% lunch / ~40% dinner of `daily_calories`; call `chat.completions.create` with `model: "gpt-5-mini"` and `response_format: { type: "json_object" }`; parse the response, validate that `meals.length === 21`, and throw a descriptive error if not

### Server Logic — Replicate Helper

- [x] Create `src/lib/ai/replicate.ts` — initialise a `Replicate` client using `process.env.REPLICATE_API_TOKEN`; export `generateMealImage(name: string, description: string): Promise<Buffer>` that runs `black-forest-labs/flux-schnell` with the prompt `"A professional overhead food photograph of {name}, {description}, on a clean white plate, natural lighting, restaurant quality"`; fetch the output URL with `fetch()`, convert the response to a `Buffer`, and return it

### Trigger.dev — Job 1: `generate-meal-plan`

- [x] Read `trigger/stripe-webhook.ts` to confirm the task export pattern (`task({ id, run })`) and how `jobId` is received from the payload before writing the new task
- [x] Create `trigger/generate-meal-plan.ts` — export a Trigger.dev `task` with `id: 'generate-meal-plan'` and `maxDuration: 300`; the `run` function receives `{ jobId, meal_plan_id, user_id, daily_calories, goal, dietary_preferences, food_categories }` as payload; implement the following steps in order:
  1. Call `updateJobProgress(jobId, 5)`
  2. Call `generateMealPlanText({ daily_calories, goal, dietary_preferences, food_categories })` — on error: call `failJob(jobId, error.message)`, call `updateMealPlanStatus(meal_plan_id, 'failed')`, then re-throw
  3. Call `updateJobProgress(jobId, 30)`
  4. Call `insertMeals(meals.map(m => ({ ...m, meal_plan_id })))` to get back an array of inserted IDs
  5. Call `updateJobProgress(jobId, 40)`
  6. Call `triggerJob({ type: 'generate-meal-images', userId: user_id, input: { meal_plan_id, user_id, meal_ids: <inserted ids> } })` — on error: call `failJob(jobId, error.message)`, call `updateMealPlanStatus(meal_plan_id, 'failed')`, then re-throw
  7. Call `updateJobProgress(jobId, 50)`
  8. Call `completeJob(jobId)`
  9. Wrap the entire body in try/catch — on unhandled error: call `failJob(jobId, error.message)`, call `updateMealPlanStatus(meal_plan_id, 'failed')`, re-throw

### Trigger.dev — Job 2: `generate-meal-images`

- [x] Create `trigger/generate-meal-images.ts` — export a Trigger.dev `task` with `id: 'generate-meal-images'` and `maxDuration: 300`; the `run` function receives `{ jobId, meal_plan_id, user_id, meal_ids }` as payload; implement the following steps in order:
  1. Fetch all 21 meal rows (`name`, `description`) in one query via `supabaseAdmin()` using `.in('id', meal_ids)`
  2. For each meal (index `i` of 21), inside an individual try/catch:
     a. Call `generateMealImage(meal.name, meal.description)` to get the image buffer
     b. Define the storage path as `meal-plans/${user_id}/${meal_plan_id}/${meal.id}.webp`
     c. Upload the buffer using `supabaseAdmin().storage.from('private-uploads').upload(path, buffer, { contentType: 'image/webp', upsert: true })`
     d. Insert a `files` row via `supabaseAdmin()`: `{ owner_user_id: user_id, bucket: 'private-uploads', key: path, mime_type: 'image/webp', size_bytes: buffer.length, visibility: 'private', status: 'ready', metadata: { meal_id: meal.id } }`
     e. Call `updateMealImageFileId(meal.id, fileId)`
     f. On error for a single meal: log the error and continue to the next meal
     g. Call `updateJobProgress(jobId, Math.round(50 + ((i + 1) / 21) * 45))`
  3. Call `updateMealPlanStatus(meal_plan_id, 'ready')`
  4. Call `updateJobProgress(jobId, 100)`
  5. Call `completeJob(jobId)`
  6. Wrap the entire body in try/catch — on unhandled error: call `failJob(jobId, error.message)`, call `updateMealPlanStatus(meal_plan_id, 'failed')`, re-throw

### Verification

- [x] Run `npm run typecheck` — fix any type errors before proceeding
- [x] Run `npm run lint` — fix any lint errors before proceeding

---

## Notes

- **No Smoke Tests.** This feature has no user-facing UI output. Observable state changes (meals rows, storage files, `meal_plans.status = 'ready'`) can only be verified via Supabase Studio or by building PRD-06.
- **Both env vars must be set before testing.** If `OPENAI_API_KEY` or `REPLICATE_API_TOKEN` are missing the job will fail at the helper call with an auth error. Add both to `.env.local` and restart `trigger:dev`.
- **`trigger:dev` must be running.** Start it with `npm run trigger:dev` in a separate terminal. Without it, `dispatchJob()` will fail and the `meal_plans` row will be stuck with `status = 'generating'`. Clear stuck rows via Supabase Studio (`DELETE FROM public.meal_plans WHERE status = 'generating'`) before retrying.
- **`triggerJob` in job 1 creates a second `jobs` row** for job 2 and then calls `dispatchJob` — this is the same pattern used by `transactional-email.ts`. The `jobId` in job 2's payload is the ID of that second row, not the first.
- **Replicate output format.** `flux-schnell` returns a URL string (or array of URLs) as its output. Fetch the first URL with `fetch()`, convert the `ArrayBuffer` to a Node `Buffer` via `Buffer.from(await res.arrayBuffer())`, and pass that to Storage upload.
- **`maxDuration: 300`** is set on both tasks (matching the global default in `trigger.config.ts`). Generating 21 images sequentially can take 2–4 minutes in practice.
