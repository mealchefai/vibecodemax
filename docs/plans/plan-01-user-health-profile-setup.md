# Feature Plan: User Health Profile Setup

> Adds a one-time onboarding form at `/app/onboarding/profile` where a new authenticated user enters their biometric data and health goal. The data is saved to a new `user_health_profiles` table. Users with no health profile are redirected here automatically before accessing any other protected route. Users who already have a profile are redirected away to `/app`.

---

## Tasks

### Database

- [x] Create migration file `supabase/migrations/20260526000000_user_health_profiles.sql`
- [x] In the migration, create the `user_health_profiles` table with columns: `user_id uuid PK` (references `profiles(id)` on delete cascade), `age integer`, `gender text`, `weight_kg numeric(5,2)`, `height_cm numeric(5,2)`, `activity_level text`, `goal text`, `dietary_preferences text[]` (nullable), `created_at timestamptz`, `updated_at timestamptz`
- [x] Add `check` constraints in the migration: age 16–100, gender in `('male','female')`, weight_kg 30–300, height_cm 100–250, activity_level in `('sedentary','light','moderate','active','very_active')`, goal in `('lose','maintain','gain')`
- [x] Add `updated_at` auto-update trigger in the migration (follow the same pattern as `set_jobs_updated_at` in `20260519123838_base_core_init.sql`)
- [x] Add RLS: enable row level security, add `SELECT` policy for authenticated users scoped to `user_id = auth.uid()`, add `UPDATE` policy scoped to `user_id = auth.uid()` — no direct client `INSERT` policy
- [x] Add `grant select, update on public.user_health_profiles to authenticated;` in the migration
- [x] Apply the migration locally: `npx supabase db reset` or `npx supabase migration up`

### Server Data Layer

- [x] Read `src/lib/db/profiles.ts` to understand the existing DB query pattern before writing the health profile equivalent
- [x] Create `src/lib/db/health-profiles.ts` exporting `getHealthProfile(userId: string)` — queries `user_health_profiles` where `user_id = userId`, returns the row or `null`
- [x] Add `upsertHealthProfile(userId: string, data: HealthProfileInput)` to `src/lib/db/health-profiles.ts` — uses `INSERT ... ON CONFLICT (user_id) DO UPDATE SET ...` via the Supabase service role client (same pattern as existing mutations in the codebase)
- [x] Define and export the `HealthProfileInput` type in `src/lib/db/health-profiles.ts` matching the table columns (excluding `user_id`, `created_at`, `updated_at`)

### Server Action

- [x] Create `src/app/(protected)/app/onboarding/actions.ts`
- [x] In `actions.ts`, write `saveHealthProfile(formData: FormData)` as a Next.js server action (`"use server"`)
- [x] In the action: call `requireUser()` to get the authenticated user — redirect to `/login` if not authenticated
- [x] In the action: parse and validate all fields server-side against the rules in the PRD (required fields, numeric ranges, allowed enum values, max 1 decimal place for weight and height)
- [x] In the action: on validation failure, return a typed error object with field-level messages — do not throw
- [x] In the action: on validation success, call `upsertHealthProfile(user.id, validatedData)`
- [x] In the action: on upsert success, call `redirect("/app")` 
- [x] In the action: on unexpected DB error, return a generic `_root` error message — do not expose the raw Supabase error to the client

### Routing & Redirect Logic

- [x] Read `src/app/(protected)/layout.tsx` to understand how `requireUser()` is used before adding redirect logic
- [x] Create `src/app/(protected)/app/onboarding/profile/page.tsx` as an `async` Server Component
- [x] In the onboarding page, call `requireUser()` and `getHealthProfile(user.id)` at the top
- [x] If a health profile already exists, call `redirect("/app")` before rendering anything
- [x] Update `src/app/(protected)/app/page.tsx`: call `getHealthProfile(user.id)` at the top — if no profile exists, call `redirect("/app/onboarding/profile")`

### UI — Form Component

- [x] Read `src/components/forms/profile-form.tsx` to understand the existing form pattern (client component, `useState` for errors and loading, `onSave` prop) before building the health profile form
- [x] Create `src/components/forms/health-profile-form.tsx` as a `"use client"` component
- [x] In the form component, accept a `saveAction` prop (the server action) and an optional `defaultValues` prop for pre-filling
- [x] Implement the Age field: `<Input type="number">` with label "Age", placeholder "e.g. 32", inline error display below the field
- [x] Implement the Biological Sex field: two-option radio group (not a dropdown) with values `male` / `female`, label "Biological sex", helper text "Used for BMR calculation. Select the option that matches your biological sex."
- [x] Implement the Weight field: `<Input type="number">` with label "Weight" and a `kg` unit suffix, placeholder "e.g. 75"
- [x] Implement the Height field: `<Input type="number">` with label "Height" and a `cm` unit suffix, placeholder "e.g. 170"
- [x] Implement the Activity Level field: vertical radio group with 5 options — each option renders its label and description text beneath it (not a dropdown)
- [x] Implement the Goal field: 3-option card selector — each card shows the goal label and one-line description; selected card has a visible active state using `border-primary` and `bg-primary/10`
- [x] Implement the Dietary Preferences field: multi-select chip/tag group with 8 options ("Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Halal", "Kosher", "No pork", "No shellfish") — labelled as optional
- [x] Wire inline field-level errors: display a `<p className="text-danger text-xs">` beneath each field when its error key is present in the error state
- [x] Implement the submit button with label "Save and continue", disabled state when required fields are empty, and "Saving…" loading state while the action is pending
- [x] Display a top-of-form error banner when `errors._root` is set: "Something went wrong. Please try again."
- [x] Use `useActionState` (or `useFormState`) to wire the server action to the form — do not use a manual `fetch` call

### Onboarding Page Assembly

- [x] In `src/app/(protected)/app/onboarding/profile/page.tsx`, render the page heading "Tell us about yourself" and subheading from the PRD
- [x] Render `<HealthProfileForm saveAction={saveHealthProfile} />` in the page — pass `defaultValues` from the existing profile if one is found (upsert path)
- [x] Apply a centred single-column layout with no sidebar — use `max-w-xl mx-auto` or equivalent from the existing spacing scale

### Verification

- [x] Run `npm run typecheck` — fix any type errors before proceeding
- [x] Run `npm run lint` — fix any lint errors before proceeding

---

## Smoke Tests

1. **New user sees onboarding form**
   Sign in with a fresh account that has no health profile. Navigate to `/app`. You should be automatically redirected to `/app/onboarding/profile`. The heading "Tell us about yourself" should be visible and the form should be empty.

2. **Validation blocks submission**
   On the onboarding form, click "Save and continue" without filling in any fields. The button should remain disabled (or show inline errors if client validation runs on attempt). No redirect should occur.

3. **Invalid age shows inline error**
   Enter `12` in the Age field and tab away. An error message should appear beneath the field (e.g. "Age must be between 16 and 100"). The form should not submit.

4. **Valid submission saves and redirects**
   Fill in all required fields with valid values (e.g. age 28, male, 75kg, 175cm, moderately active, lose weight). Click "Save and continue". A loading state should appear on the button. After a moment, you should be redirected to `/app` with no errors.

5. **Returning to onboarding after completion redirects away**
   After completing the profile, navigate directly to `/app/onboarding/profile`. You should be immediately redirected to `/app` without seeing the form.

6. **Dashboard redirects incomplete user**
   Sign in as the same user, navigate to `/app`. You should land on `/app` normally (profile already exists). Sign in as a second fresh account with no profile and navigate to `/app` — you should be redirected to `/app/onboarding/profile`.

---

## Notes

- There is no `RadioGroup` component in `src/components/ui/`. The Biological Sex and Activity Level fields need a radio group. Build a minimal, unstyled-then-styled radio group inline in `health-profile-form.tsx` using native `<input type="radio">` elements wrapped with the existing `Label` component. Do not add a new shared UI component unless it is also needed elsewhere.
- The existing `select.tsx` UI component is a dropdown — do not use it for Activity Level or Biological Sex. The PRD explicitly requires radio/card selectors for these fields so users can read the descriptions.
- `upsertHealthProfile` must use the Supabase server client (session-aware), not the service role admin client, since the `UPDATE` RLS policy allows authenticated users to update their own row. The `INSERT` requires bypassing RLS — use `.from('user_health_profiles').upsert(...)` with the server client; Supabase `upsert` will use the `INSERT ... ON CONFLICT DO UPDATE` path which the server action's authenticated session covers for the update leg, but the initial insert requires the service role. Check existing patterns in the codebase for how service role inserts are handled if needed.
