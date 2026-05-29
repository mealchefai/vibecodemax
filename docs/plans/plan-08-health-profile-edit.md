# Feature Plan: Health Profile Edit

> A settings page at `/app/settings/health-profile` where authenticated users can update their biometric details and goal. The page reuses the existing `HealthProfileForm` component pre-filled with current data, persists changes via a new server action, and surfaces a success banner with a prompt to re-generate their meal plan.

---

## Prerequisites

None — all required infrastructure (Supabase, `user_health_profiles` table, `upsertHealthProfile()`, `HealthProfileForm`, authenticated layout) is already in place.

---

## Tasks

### Component — HealthProfileForm Enhancements

- [x] Read `src/components/forms/health-profile-form.tsx` to confirm the submit button label is hardcoded and that `HealthProfileFormState` is imported from `src/app/(protected)/app/onboarding/actions.ts` before making changes
- [x] Move the `HealthProfileFormState` interface out of `src/app/(protected)/app/onboarding/actions.ts` and into `src/components/forms/health-profile-form.tsx` — add `success?: boolean` to the interface; update the import in `src/app/(protected)/app/onboarding/actions.ts` to `import type { HealthProfileFormState } from "@/components/forms/health-profile-form"`
- [x] Add a `submitLabel?: string` prop to `HealthProfileForm` — default to `"Save and continue"` so the existing onboarding page is unaffected; replace the hardcoded `"Save and continue"` button text with `{submitLabel ?? "Save and continue"}`
- [x] Add a `successContent?: React.ReactNode` prop to `HealthProfileForm` — render it between the root error banner and the first form field, wrapped in `{state?.success && successContent}`, so the settings page can inject a success banner without modifying the form internals

### Server Logic — Settings Action

- [x] Read `src/app/(protected)/app/onboarding/actions.ts` to confirm the full validation logic (`ALLOWED_*` constants, `hasMaxOneDecimalPlace`, field parsing) before writing the settings action — the new action replicates this logic exactly
- [x] Create `src/app/(protected)/app/settings/actions.ts` — a `"use server"` file exporting `updateHealthProfile(prevState: HealthProfileFormState, formData: FormData): Promise<HealthProfileFormState>`:
  - Copy the exact field validation from `saveHealthProfile` (age, gender, weight, height, activity level, goal, dietary preferences)
  - On validation failure: return `{ errors }` — same shape as the onboarding action
  - On validation success: call `upsertHealthProfile(user.id, { ... })` — if it fails, return `{ errors: { _root: "Something went wrong. Please try again." } }`
  - On upsert success: return `{ success: true }` — **do not call `redirect()`**; the success state is surfaced via the form's `successContent` prop

### UI — Settings Page

- [x] Read `src/app/(protected)/app/onboarding/profile/page.tsx` to confirm the `requireUser()` + `getHealthProfile()` call pattern and page wrapper classes before writing the settings page
- [x] Create `src/app/(protected)/app/settings/health-profile/page.tsx` as an `async` Server Component:
  - Call `requireUser()` and `getHealthProfile(user.id)`
  - If `getHealthProfile` returns null → `redirect('/app/onboarding/profile')`
  - Define an inline `successContent` node: a `<div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 space-y-3">` containing `<p className="text-sm text-success font-medium">Your health profile has been updated.</p>` and `<Button asChild size="sm"><Link href="/app/generate">Generate a new meal plan</Link></Button>`
  - Render page wrapper: `<div className="container mx-auto px-container-mobile md:px-container max-w-page"><div className="mx-auto max-w-xl py-12">`
  - Inside wrapper: heading `<h1 className="text-3xl font-heading font-extrabold tracking-tight text-text-primary">Health Profile</h1>`, subheading `<p className="mt-3 text-base text-text-secondary">Update your details to keep your calorie targets accurate.</p>`, then `<HealthProfileForm saveAction={updateHealthProfile} defaultValues={profile} submitLabel="Save changes" successContent={successContent} className="mt-8" />`

### Navigation — Header Link

- [x] Read `src/components/layout/site-header.tsx` to confirm the `accountDropdownItems` array shape (`{ label: string; href: string }[]`) and the admin filter logic before editing
- [x] Add `{ label: "Health Profile", href: "/app/settings/health-profile" }` to the `accountDropdownItems` array in `src/components/layout/site-header.tsx`, positioned between `"Profile"` and `"Admin"`

### Verification

- [x] Run `npm run typecheck` — fix any type errors before proceeding
- [x] Run `npm run lint` — fix any lint errors before proceeding

---

## Smoke Tests

1. **Page loads with pre-filled data**
   Navigate to `/app/settings/health-profile` while signed in with an account that has a completed health profile. All fields — age, biological sex, weight, height, activity level, goal, and any dietary preferences — should be pre-selected with the user's existing values.

2. **Header dropdown contains the link**
   Click the user avatar in the top-right header. The dropdown should include a "Health Profile" item that navigates to `/app/settings/health-profile`.

3. **Validation shows inline errors**
   Clear the age field, type `5`, and click "Save changes". The age field should show an inline error message. No success banner should appear.

4. **Save persists and shows success banner**
   Change any field (e.g. adjust weight by 1 kg) and click "Save changes". A success banner reading `"Your health profile has been updated."` and a "Generate a new meal plan" button should appear above the form. The form should remain visible and still reflect the updated values.

5. **Generate link navigates correctly**
   After a successful save, click "Generate a new meal plan". You should be taken to `/app/generate`.

6. **No-profile guard redirects to onboarding**
   If a test user account exists with no `user_health_profiles` row, navigating to `/app/settings/health-profile` should redirect to `/app/onboarding/profile`.

---

## Notes

- **`HealthProfileFormState` is being moved** from `src/app/(protected)/app/onboarding/actions.ts` to `src/components/forms/health-profile-form.tsx`. This is a safe refactor because the type is only consumed by the form component and both action files. Update the import in `onboarding/actions.ts` in the same step to avoid a broken build.
- **The `successContent` prop accepts `React.ReactNode`** — the page is a Server Component passing JSX to a Client Component, which is valid in Next.js App Router as long as the passed content is static (no event handlers, no `useState`). The success banner uses only `<Link>` and `<Button asChild>`, so this is safe.
- **The `success` flag on `HealthProfileFormState` is additive** — `useActionState` initialises with `initialState = { errors: {} }`, so `state.success` is `undefined` on first render, which is falsy. The `successContent` block only renders once a successful save returns `{ success: true }`.
