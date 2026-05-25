# AGENTS.md

## Project Snapshot

This project currently includes:

- Pages: landing, user accounts, admin
- Auth: Supabase (email/password, Google OAuth, magic links), used for app sign-in, session cookies, protected routes, and admin access checks.
- Database: Supabase, used for app data, profiles, admin users, payment catalog, purchases, and webhook event records.
- Storage: Supabase, used for user-uploaded files and app media.
- Email: Resend, used for transactional app email. Supabase may also use the configured SMTP sender for auth emails.
- Payments: Stripe, used for checkout, subscriptions, payment catalog sync, purchases, entitlements, and webhooks.
- Background jobs: Trigger.dev, used for long-running or queued work such as payment webhook follow-up and transactional email tasks.
- Rate limiting: Upstash, used to protect sensitive API routes from abuse.
- Captcha: Turnstile, used to reduce automated abuse on exposed auth or form flows.
- Deploy: Vercel via GitHub, used for publishing this app and applying hosted env values.

## Env Files

- `.env.local`: local runtime values.
- `.env.bootstrap.local`: setup-only credentials used by bootstrap/setup steps.
- `.env.production.local`: hosted runtime values used for deploy and hosted services.
- See `docs/ENV.md` for the full variable list.

## Prerequisites

- Node.js 20+ and npm are required to install dependencies, run checks, and start the app.
- Supabase CLI is required for local Supabase setup and local database/auth/storage workflows.
- Stripe CLI is required to test Stripe webhooks locally.
- Git is required for source control and deploy flows that use GitHub.
- GitHub CLI is required only when using the Git/GitHub setup flow.

## Permission Policy

If your runtime is sandboxed, commands that may read or write outside the workspace must request escalated or unsandboxed execution before first attempt.

This includes tools that use home-directory config, credentials, local daemons, or tool-managed state:

- docker
- gh
- stripe
- supabase

Examples of paths or resources these tools may touch:

- /opt/homebrew
- /usr/local
- the Docker daemon
- ~/.config
- ~/.config/gh
- ~/.config/stripe
- ~/.docker
- ~/.supabase

Do not first try these commands in a sandbox when the command is likely to access credentials, login state, local daemons, or tool-managed config. If your runtime has no sandbox restrictions, run the command normally.

## Setup, Bootstrap, Reset, And Deploy

VibeCodeMax MCP setup tools can configure provider settings such as auth URLs, webhook endpoints, API keys, hosted storage buckets, and database migrations. If MCP tools are not available, follow the project docs and provider docs manually.

### Terms

- `bootstrap`: local setup for development.
- `setup`: hosted setup for deployed services.
- `setup-git`: Git and GitHub setup only. It does not handle deploys or ongoing versioning.
- `deploy`: repeatable publishing flow for the selected deploy provider.

### MCP Tools

- Use `bootstrap.get` to start or resume a module.
- Use `bootstrap.input` to supply requested values or acknowledgments.
- Use `bootstrap.execute` to submit local command results from setup steps.
- Use `bootstrap.reset` to reset a local bootstrap or hosted setup module. Reset is an operator action, not a normal flow step; after reset, write the returned setup state locally and stop. Do not call `bootstrap.get` after reset unless the user explicitly asks to continue that module.
- The local VibeCodeMax CLI may be used by MCP setup steps to run checks or apply changes, but it is not the setup orchestrator. Do not invent standalone setup commands unless they are listed in `package.json` or explicitly documented.
- Deploy is repeatable. It does not configure Git or GitHub; if GitHub deploy is selected and no origin exists, use the Git/GitHub setup module first.

### Secrets

- Never echo secrets in chat or tool responses.
- Never paste API keys, access tokens, webhook secrets, SMTP passwords, service role keys, or private keys into chat.
- Do not log secret values. Redact them if output must be summarized.
- Keep secrets in the correct env file and do not hard-code them in source files.

## Testing And Production Assumptions

- Local testing uses `.env.local` values and local service setup. When Supabase is enabled, local testing is expected to use the local Supabase stack.
- Use test-mode provider keys in `.env.local` whenever the provider supports test mode.
- Hosted setup uses `.env.production.local` for production service values.
- Production provider keys belong in `.env.production.local`, not `.env.local`.
- Deploy uses `.env.production.local` as the source for hosted environment values.
- Do not mix local test keys and production keys in the same env file.

## Common Commands

- `npm run dev`: start local development.
- `npm run dev:all`: start the app plus local worker or webhook sidecars.
- `npm run trigger:dev`: run the Trigger.dev worker locally.
- `npm run trigger:deploy`: deploy Trigger.dev jobs.
- `npm run stripe:listen`: run the Stripe local webhook listener.
- `npm run lint`: run ESLint.
- `npm run typecheck`: run TypeScript checks.
- `npm run type-check`: run TypeScript checks.
- `npm run format:check`: verify formatting.
- `npm run format`: format the project.
- `npm run build`: create a production build.

## Placeholders

- `__VG_*__` values are VibeCodeMax project placeholders, not code to clean up.
- Do not remove or rename placeholders unless the task explicitly asks for it.
- Payment catalog placeholders can appear in SQL seed data before real products or prices are synced.
- Unfilled placeholders usually mean the relevant setup step has not run yet.

## Code Ownership

- Treat this as an end-user-owned application.
- Edit `src/app`, `src/components`, and `src/lib` directly when the task calls for it.

## Always-on Rules

Read these files before making changes:

1. docs/rules/workflow.md
2. docs/rules/architecture.md
3. docs/rules/coding-convention.md
4. docs/rules/styling-guide.md
5. docs/rules/security.md

## How to use the rules

- Follow the selected rules in the order listed above.
- Use `workflow.md` as the execution policy for each task.
- Use `architecture.md` for structure and boundary decisions.
- Use `coding-convention.md` for implementation and quality standards.
- Use `styling-guide.md` for UI and design-token consistency.
- Use `security.md` for secure defaults and risk-sensitive changes.
- If anything conflicts, resolve in this priority order:
  workflow -> architecture -> coding-convention -> styling-guide -> security
