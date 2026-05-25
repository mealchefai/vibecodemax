# Environment Variables Documentation

This file documents all environment variables used by this application.

## Public Environment Variables

These variables are exposed to the browser and should not contain secrets:

### `NEXT_PUBLIC_SITE_URL`

**Description:** Public base URL of the app used for auth callbacks and redirect links
**Required:** Yes
**Example:** `http://localhost:3000`

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Description:** Supabase anonymous/public key
**Required:** Yes
**Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### `NEXT_PUBLIC_SUPABASE_URL`

**Description:** Supabase project URL
**Required:** Yes
**Example:** `https://your-project.supabase.co`

## Server Environment Variables

These variables are only available on the server and can contain secrets:

### `EMAIL_DELIVERY_MODE`

**Description:** Optional explicit mock email mode for local development
**Required:** No
**Example:** `mock`

### `EMAIL_REPLY_TO`

**Description:** Optional reply-to address for outbound emails
**Required:** No
**Example:** `support@yourdomain.com`

### `EMAIL_SUPPORT`

**Description:** Optional recipient address for contact form submissions
**Required:** No
**Example:** `support@yourdomain.com`

### `MAIL_FROM`

**Description:** Default From address for outbound emails
**Required:** Yes
**Example:** `Support <support@yourdomain.com>`

### `RESEND_API_KEY`

**Description:** Resend API key
**Required:** Yes
**Example:** `re_your-resend-api-key`

### `STRIPE_LOCAL_APP_URL`

**Description:** Optional local app URL override for the Stripe CLI webhook listener
**Required:** No
**Example:** `http://localhost:3000`

### `STRIPE_SECRET_KEY`

**Description:** Stripe secret key
**Required:** Yes
**Example:** `sk_test_123`

### `STRIPE_WEBHOOK_SECRET`

**Description:** Stripe webhook signing secret
**Required:** Yes
**Example:** `whsec_123`

### `SUPABASE_PRIVATE_BUCKET`

**Description:** Supabase private bucket name for user uploads
**Required:** Yes
**Example:** `private-uploads`

### `SUPABASE_PUBLIC_BUCKET`

**Description:** Supabase public bucket name for avatar/blog assets
**Required:** Yes
**Example:** `public-assets`

### `SUPABASE_SERVICE_ROLE_KEY`

**Description:** Supabase service role key for privileged server-side operations
**Required:** Yes
**Example:** `your-supabase-service-role-key`

### `TRIGGER_API_URL`

**Description:** Optional Trigger.dev API base URL for self-hosted or custom environments
**Required:** No
**Example:** `https://api.trigger.dev`

### `TRIGGER_PREVIEW_BRANCH`

**Description:** Optional preview branch name used when deploying preview environments
**Required:** No
**Example:** `preview-feature-branch`

### `TRIGGER_PROJECT_REF`

**Description:** Trigger.dev project reference used by trigger.config.ts
**Required:** Yes
**Example:** `proj_xxxxx`

### `TRIGGER_SECRET_KEY`

**Description:** Trigger.dev secret API key used to trigger tasks from the app
**Required:** Yes
**Example:** `tr_dev_xxxxx`

### `UPSTASH_REDIS_REST_URL`

**Description:** Upstash Redis REST URL for public route rate limiting.

**Scope:** Server only

**Required:** Yes

**Example:** `https://example.upstash.io`

### `UPSTASH_REDIS_REST_TOKEN`

**Description:** Upstash Redis REST token for public route rate limiting.

**Scope:** Server only

**Required:** Yes

**Example:** `your-upstash-rest-token`

### `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

**Description:** Cloudflare Turnstile site key for public forms.

**Scope:** Public

**Required:** Yes

**Example:** `1x00000000000000000000AA`

### `TURNSTILE_SECRET_KEY`

**Description:** Cloudflare Turnstile secret key for server-side verification.

**Scope:** Server only

**Required:** Yes

**Example:** `1x0000000000000000000000000000000AA`
