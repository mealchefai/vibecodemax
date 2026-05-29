# PRD-08 — Health Profile Edit

**Version:** 1.0
**Date:** May 2026
**Status:** Ready for implementation

---

## Feature Summary

A settings page at `/app/settings/health-profile` where an authenticated user can view and update their existing biometric details and goal. The page pre-fills the existing `HealthProfileForm` component with the user's current data, persists the changes via an upsert server action, and prompts the user to generate a new meal plan once their profile is updated.

---

## User Problem

Once a user completes the health profile setup during onboarding, they have no way to change their data. Weight, activity level, and goals change over time. A user who has lost weight, become more active, or changed their goal is permanently locked to the values they entered at signup, meaning every generated meal plan is based on stale information.

---

## User Goal

Update my biometric details or health goal so that any future meal plan is calculated from my current stats.

---

## MVP Scope

- A new page at `/app/settings/health-profile` for authenticated users
- The page loads the user's current `user_health_profiles` row and pre-fills the form
- The user edits any field(s) and submits
- On success: profile is updated in the database and the user sees a confirmation state with a prompt to generate a new meal plan
- On validation failure: inline field errors are shown, no data is saved
- Link to this page from the existing profile/settings navigation in the `SiteHeader`

---

## Out of Scope

- Deleting the health profile
- History or versioning of past profile values
- Automatic re-generation of the meal plan on profile save (user must manually trigger generation)
- Unit conversion (imperial / metric toggle) — metric only
- Changing email address or display name (handled by the existing `/app/profile` page)

---

## User Flow

1. User navigates to their account settings via the header dropdown or direct URL `/app/settings/health-profile`
2. Page loads with their current profile data pre-filled in all form fields
3. User edits one or more fields (e.g. updates weight, changes goal)
4. User clicks **Save changes**
5. Server action validates the submitted data
   - **Validation failure** → inline field errors displayed; no redirect; data not saved
   - **Validation success** → profile upserted; page shows a success banner and a "Generate a new meal plan" button linking to `/app/generate`
6. User optionally clicks "Generate a new meal plan" to kick off a new generation with the updated calorie targets

---

## Screens and UI Requirements

### Health Profile Edit Page — `/app/settings/health-profile`

**Header block**
- Page heading: `"Health Profile"`
- Subheading: `"Update your details to keep your calorie targets accurate."`

**Form**
- Reuse `<HealthProfileForm>` with `defaultValues` populated from the user's existing profile row
- Change the submit button label from `"Save and continue"` to `"Save changes"` — done by passing a `submitLabel` prop
- All existing field sections apply: Age, Biological sex, Weight, Height, Activity level, Goal, Dietary preferences

**Success state**
- After a successful save, render a success banner above the form:
  `"Your health profile has been updated."`
- Below the banner, render a `<Button asChild>` linking to `/app/generate`:
  `"Generate a new meal plan"`
- The form remains visible and pre-filled with the newly saved values (not replaced by the success state — banner + form coexist)

**Error state**
- Inline field errors are handled by the existing `HealthProfileForm` error rendering — no additional UI needed at the page level
- If the server action returns a `_root` error, the form's existing root error banner handles it

**Layout**
- Constrained width: `mx-auto max-w-xl`
- Page wrapper: `container mx-auto px-container-mobile md:px-container max-w-page`
- Top padding: `py-12`

---

## Data Requirements

**Read**
- `user_health_profiles` — all columns for the authenticated user's `user_id`, fetched with `getHealthProfile(user.id)` from `src/lib/db/health-profiles.ts`

**Write**
- `user_health_profiles` — upsert on `user_id` conflict via the existing `upsertHealthProfile()` function in `src/lib/db/health-profiles.ts`

No schema changes. No new tables. No migrations needed.

---

## Business Logic

1. **Profile must already exist.** If `getHealthProfile()` returns null (profile was never created), redirect to `/app/onboarding/profile` so the user completes the initial setup first.

2. **Upsert on save.** The `upsertHealthProfile()` function already performs an `INSERT ... ON CONFLICT (user_id) DO UPDATE`, so the same function serves both initial creation and subsequent edits.

3. **Calorie targets are not stored here.** BMR, TDEE, and `daily_calories` are calculated at generation time inside the generation server action (PRD-04). Saving an updated profile does not retroactively change existing meal plans — only future generations use the new values.

4. **No rate limiting** on the health profile edit action. It is a low-frequency, low-risk mutation per authenticated user.

---

## Existing Boilerplate Infrastructure Used

| Resource | Usage |
|---|---|
| `requireUser()` | Authenticate and get the current user in the server component and server action |
| `getHealthProfile(userId)` | Fetch the existing profile row to pre-fill the form |
| `upsertHealthProfile(userId, data)` | Persist the updated profile; already handles conflict resolution |
| `HealthProfileForm` component | Reused in full with `defaultValues` prop — no changes needed to the component |
| `saveHealthProfile` server action | Adapted: same validation logic, different post-save redirect/response |
| `HealthProfileFormState` type | Shared type for form state and error shape |
| Authenticated layout + `SiteHeader` | Wraps the page; navigation to this page added to the header dropdown |
| Supabase RLS | `user_health_profiles` is already RLS-protected by `user_id` |

---

## Edge Cases

| Case | Handling |
|---|---|
| User has no profile yet | `getHealthProfile()` returns null → redirect to `/app/onboarding/profile` |
| User navigates directly to `/app/settings/health-profile` without being signed in | `requireUser()` redirects to `/login` |
| Concurrent saves (double-click) | `useActionState`'s `isPending` flag disables the submit button while the action is in flight |
| Save fails due to a Supabase error | `upsertHealthProfile()` returns `{ success: false, error }` → server action returns `_root` error → form renders the root error banner |
| User saves identical values | Upsert is idempotent; no harm — success state is still shown |

---

## Acceptance Criteria

1. **Page loads with pre-filled data** — navigating to `/app/settings/health-profile` while authenticated shows all fields populated with the user's current profile values.

2. **Validation works** — submitting with an invalid age (e.g. 5) shows the age field error inline and does not persist any data.

3. **Save persists changes** — updating weight from 80 kg to 75 kg and submitting results in the `user_health_profiles` row reflecting `weight_kg = 75`.

4. **Success banner appears** — after a valid save, a success message and a "Generate a new meal plan" button are visible on the page.

5. **Generate link is correct** — clicking "Generate a new meal plan" navigates to `/app/generate`.

6. **No profile guard works** — a user who somehow has no profile row is redirected to `/app/onboarding/profile` rather than seeing a broken pre-filled form.

7. **Authentication guard works** — an unauthenticated request to `/app/settings/health-profile` redirects to `/login`.

8. **Form submit button is disabled while pending** — rapidly clicking "Save changes" does not dispatch the action twice.
