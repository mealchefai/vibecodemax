# PRD-01 — User Health Profile Setup

**Version:** 1.0
**Date:** May 2026
**Status:** Ready for Development
**Priority:** Must-have

---

## Feature Summary

After signing up and verifying their account, a user must complete a one-time health profile before they can generate a meal plan. The profile captures the biometric data needed to calculate the user's Basal Metabolic Rate (BMR), Total Daily Energy Expenditure (TDEE), and daily calorie target. Without this data, personalised meal plan generation cannot run.

This feature covers the setup form, server-side persistence, and the redirect behaviour that follows. It does not cover BMR calculation (that runs at generation time in PRD-04) or meal plan generation itself.

---

## User Problem

When a new user signs up, the app has no information about their body or health goal. A generic meal plan would be meaningless. The user needs a fast, clear way to provide their basic biometrics once so every meal plan generated after that is built specifically for them.

---

## User Goal

Enter my age, gender, weight, height, activity level, and health goal so the app can build a meal plan that actually fits my body and what I am trying to achieve.

---

## MVP Scope

- A single-page health profile form shown to authenticated users who have not yet completed their profile
- Fields: age, gender, weight, height, activity level, goal, dietary preferences (optional)
- Server action that validates and saves the data to `user_health_profiles`
- On success, redirect the user to the dashboard
- If the profile already exists (returning user who somehow lands here again), pre-fill the form with existing values and allow resubmission as an update

---

## Out of Scope

- BMR or calorie target calculation (happens at generation time in PRD-04)
- Editing an existing profile from account settings (covered in PRD-08)
- Unit toggling (imperial/metric) — metric only for MVP
- Profile photo or avatar upload
- Any onboarding tour, tooltips, or coach marks beyond field-level helper text
- Email confirmation or follow-up after profile completion

---

## User Flow

```
User signs in
  │
  ├── Has existing health profile?
  │     └── Yes → redirect to dashboard (this feature does not apply)
  │
  └── No → show health profile setup page
        │
        ├── User fills in form fields
        │
        ├── User submits form
        │     │
        │     ├── Validation fails → show inline field errors, stay on page
        │     │
        │     └── Validation passes → server action runs
        │           │
        │           ├── Insert succeeds → redirect to dashboard
        │           │
        │           └── Insert fails (unexpected) → show generic error, stay on page
        │
        └── User navigates away without submitting → no data saved
```

---

## Screens and UI Requirements

### Screen: Health Profile Setup Page

**Route:** `/onboarding/profile` (authenticated, redirects to `/dashboard` if profile already exists)

**Layout:** Centred single-column form. No sidebar or navigation chrome beyond the app logo. This should feel like a focused onboarding step, not a settings page.

**Heading:** "Tell us about yourself"
**Subheading:** "We use this to calculate your personal calorie target and build a meal plan that fits your body and goal."

---

### Form Fields

#### Age
- Input type: number
- Label: "Age"
- Placeholder: "e.g. 32"
- Validation: integer, min 16, max 100
- Helper text: none

#### Gender
- Input type: segmented control or radio group (not a dropdown)
- Label: "Biological sex"
- Options: "Male" / "Female"
- Helper text: "Used for BMR calculation. Select the option that matches your biological sex."
- Validation: required

#### Weight
- Input type: number with unit label
- Label: "Weight"
- Unit suffix: "kg"
- Placeholder: "e.g. 75"
- Validation: numeric, min 30, max 300, up to 1 decimal place
- Helper text: none

#### Height
- Input type: number with unit label
- Label: "Height"
- Unit suffix: "cm"
- Placeholder: "e.g. 170"
- Validation: numeric, min 100, max 250, up to 1 decimal place
- Helper text: none

#### Activity Level
- Input type: radio group or card selector (not a dropdown — options need context)
- Label: "How active are you day to day?"
- Options (value → label → description):
  - `sedentary` → "Sedentary" → "Little or no exercise, desk job"
  - `light` → "Lightly active" → "Light exercise 1–3 days per week"
  - `moderate` → "Moderately active" → "Moderate exercise 3–5 days per week"
  - `active` → "Active" → "Hard exercise 6–7 days per week"
  - `very_active` → "Very active" → "Hard daily exercise or physical job"
- Validation: required

#### Goal
- Input type: card selector (3 options, visually distinct)
- Label: "What is your goal?"
- Options (value → label → description):
  - `lose` → "Lose weight" → "Reduce body fat with a calorie deficit"
  - `maintain` → "Maintain weight" → "Eat to sustain your current weight"
  - `gain` → "Gain muscle" → "Build muscle with a calorie surplus"
- Validation: required

#### Dietary Preferences
- Input type: multi-select chip/tag group
- Label: "Any dietary preferences?" 
- Sub-label: "Optional — select all that apply"
- Options: "Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Halal", "Kosher", "No pork", "No shellfish"
- Validation: optional, no minimum selection required

---

### Submit Button
- Label: "Save and continue"
- State: disabled until all required fields are filled
- Loading state: show spinner and "Saving…" while server action is running

### Error State
- Inline validation errors appear beneath each field on blur and on submit attempt
- If the server action returns an unexpected error: show a non-blocking banner at the top of the form — "Something went wrong. Please try again."

### Success State
- No success screen — redirect immediately to `/dashboard` on save

---

## Data Requirements

### New Table: `user_health_profiles`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `user_id` | `uuid` | PK, references `profiles(id)` on delete cascade | One row per user |
| `age` | `integer` | not null, check >= 16 and <= 100 | |
| `gender` | `text` | not null, check in ('male', 'female') | |
| `weight_kg` | `numeric(5,2)` | not null, check >= 30 and <= 300 | |
| `height_cm` | `numeric(5,2)` | not null, check >= 100 and <= 250 | |
| `activity_level` | `text` | not null, check in ('sedentary', 'light', 'moderate', 'active', 'very_active') | |
| `goal` | `text` | not null, check in ('lose', 'maintain', 'gain') | |
| `dietary_preferences` | `text[]` | nullable | e.g. `['vegetarian', 'gluten-free']` |
| `created_at` | `timestamptz` | not null, default `now()` | |
| `updated_at` | `timestamptz` | not null, default `now()` | Auto-updated via trigger |

### RLS Policies

- `SELECT`: authenticated user can only read their own row (`user_id = auth.uid()`)
- `UPDATE`: authenticated user can only update their own row (`user_id = auth.uid()`)
- `INSERT`: no direct client insert policy — insert is performed via service role in the server action
- No policy for `anon` role

### Grants

```sql
grant select, update on public.user_health_profiles to authenticated;
```

---

## Business Logic

### Profile Existence Check (Middleware or Layout)

Before rendering the health profile setup page, check whether a `user_health_profiles` row exists for `auth.uid()`:
- If a row exists: redirect to `/dashboard` — do not show the setup form again
- If no row exists: render the form

This check also runs in the authenticated dashboard layout to redirect users with no profile back to `/onboarding/profile` before they can access any other authenticated page.

### Server Action: `saveHealthProfile`

Runs on form submission. Must execute server-side only.

**Steps:**

1. Verify the user is authenticated — return `401` if not
2. Validate all fields against the constraints defined in the Data Requirements section
3. If validation fails: return field-level error messages to the form
4. Attempt to upsert into `user_health_profiles` using `user_id` as the conflict key:
   ```sql
   INSERT INTO user_health_profiles (...) VALUES (...)
   ON CONFLICT (user_id) DO UPDATE SET ...
   ```
5. If the upsert succeeds: redirect to `/dashboard`
6. If the upsert fails unexpectedly: return a generic error to the form — do not expose database error details to the client

### Field Validation Rules (Server-side — client mirrors these)

| Field | Rule |
|---|---|
| `age` | Required. Integer. Min 16, max 100. |
| `gender` | Required. Must be exactly `'male'` or `'female'`. |
| `weight_kg` | Required. Numeric. Min 30.0, max 300.0. Max 1 decimal place. |
| `height_cm` | Required. Numeric. Min 100.0, max 250.0. Max 1 decimal place. |
| `activity_level` | Required. Must be one of the five defined enum values. |
| `goal` | Required. Must be one of the three defined enum values. |
| `dietary_preferences` | Optional. If provided, each value must be from the defined options list. Max 8 selections. |

---

## Existing Boilerplate Infrastructure Used

| Infrastructure | How it is used |
|---|---|
| Supabase Auth | `auth.uid()` used to scope the upsert and RLS policies |
| Supabase database | `user_health_profiles` table created via new migration |
| Server actions | `saveHealthProfile` runs as a Next.js server action |
| Authenticated layout | Wraps the onboarding page; provides session context |
| Form components (`components/ui/*`) | Input, RadioGroup, Button, and error display primitives reused from boilerplate component library |

---

## Edge Cases

| Scenario | Expected behaviour |
|---|---|
| User navigates to `/onboarding/profile` after already completing their profile | Server-side redirect to `/dashboard` before the page renders |
| User submits the form with JavaScript disabled | Server action still runs — form uses a standard `<form>` action, not a client-side fetch |
| User enters a weight or height value with more than 1 decimal place (e.g. 72.567) | Validation error: "Please enter a value with at most one decimal place" |
| User selects no dietary preferences and submits | Accepted — `dietary_preferences` is stored as `null` or empty array |
| Network error or timeout during server action | Generic error banner shown; form data is preserved so the user does not need to re-enter everything |
| User lands on `/onboarding/profile` while not authenticated | Redirect to `/sign-in` |
| Two rapid form submissions (double-click) | Server action is idempotent (upsert) — second submission overwrites the first with the same data; no duplicate rows possible |

---

## Acceptance Criteria

- [ ] An authenticated user with no health profile is redirected to `/onboarding/profile` before accessing any other authenticated route
- [ ] An authenticated user with an existing health profile is redirected away from `/onboarding/profile` to `/dashboard`
- [ ] The form renders all required fields: age, gender, weight, height, activity level, and goal
- [ ] Dietary preferences field renders as an optional multi-select with all defined options
- [ ] Submitting the form with any required field empty shows an inline error for that field and does not submit
- [ ] Submitting an age below 16 or above 100 shows a validation error
- [ ] Submitting a weight below 30 or above 300 shows a validation error
- [ ] Submitting a height below 100 or above 250 shows a validation error
- [ ] A valid form submission saves a row to `user_health_profiles` in the database
- [ ] After a successful save, the user is redirected to `/dashboard`
- [ ] Submitting the form a second time (upsert path) updates the existing row and does not create a duplicate
- [ ] A user cannot read or modify another user's health profile row (RLS enforced)
- [ ] An unauthenticated user who navigates to `/onboarding/profile` is redirected to `/sign-in`
- [ ] The server action does not expose raw database error messages to the client on failure
