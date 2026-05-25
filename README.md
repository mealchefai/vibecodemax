# Meal Chef AI

Meal Chef AI is a meal planner app that helps people to get meal plans with the assistance of AI

Generated with VibeCodeMax.

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

   After the first install creates a lockfile, use `npm ci` in CI/deploy environments.

2. Set up environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Fill in values. See `docs/ENV.md` for details.

3. Start development server:
   ```bash
   npm run dev
   ```

## What's Included

- Landing page
- User accounts
- Admin dashboard
- Supabase authentication
- Supabase database integration
- Supabase file storage
- Stripe payments
- Resend email delivery
- Upstash Redis rate limiting
- Cloudflare Turnstile protection
- Privacy, Terms, Cookies, and GDPR pages
- Design system with Tailwind CSS
- TypeScript

## Project Structure

```text
src/
  app/
    (public)/          # Public pages
    (protected)/       # Signed-in pages
    (admin)/           # Admin pages
    api/               # API routes
  components/          # UI components
    layout/            # Header, footer, navigation
    ui/                # Base UI primitives
  lib/                 # Utilities and configuration
supabase/              # Database migrations
docs/                  # Project documentation
```

## Database Setup

See `docs/database-setup.md` for database setup and migration details.

## Security Setup

See `docs/security-setup.md` for rate limiting and form protection setup.

## Scripts

- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — Run linter
- `npm run typecheck` — Run TypeScript checks

## Deployment

This is a Next.js app. Deploy to Vercel, Netlify, or any platform that supports Next.js.
