# Security Setup

This project can protect public forms with Redis-backed rate limiting and Cloudflare Turnstile.

## Upstash Redis Rate Limiting

Set these environment variables before running the app:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

If Redis is unavailable at runtime, protected routes fail closed instead of accepting unthrottled requests.

## Cloudflare Turnstile

Set these environment variables before running the app:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

Cloudflare test keys work for local development:

- Site key: `1x00000000000000000000AA`
- Secret key: `1x0000000000000000000000000000000AA`

Local bootstrap does not require a Cloudflare account or hostname.
New projects already include these test keys in `.env.local` by default.

When verification fails, the form stays on the page, shows an inline error, and allows retry.

## Protected Routes

- email/password sign-in
- email/password sign-up
- magic-link sign-in
- contact form
