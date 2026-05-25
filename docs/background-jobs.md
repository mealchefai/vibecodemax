# Background Jobs

This project uses Trigger.dev for background jobs.

## Which command should I use?

- `npm run dev`: run the app only
- `npm run dev:all`: normal local development with the app, Trigger.dev, and any local webhook listeners configured for this project
- `npm run trigger:dev`: run the Trigger.dev jobs runtime directly when you want focused jobs debugging
- `npm run trigger:deploy`: deploy Trigger.dev jobs separately from local bootstrap

For most local work, use `npm run dev:all`.

## Local Setup

Before local Trigger.dev jobs can run, add these values to `.env.local`:

- `TRIGGER_PROJECT_REF`
- `TRIGGER_SECRET_KEY`

Where to find them:

- `TRIGGER_PROJECT_REF`: Trigger.dev project settings
- `TRIGGER_SECRET_KEY`: Trigger.dev dashboard API Keys page for the development environment

The local `TRIGGER_SECRET_KEY` should be a development key and start with `tr_dev_`.

After adding those values to `.env.local`, run:

```bash
npx trigger.dev@latest login
```

If a terminal assistant is helping and has TTY access, it can launch that login command after your approval. You can always run it yourself instead.

## Non-Interactive Setup

If setup is running in a non-interactive environment, use one of these options:

1. Run `npx trigger.dev@latest login` yourself in Terminal or PowerShell, then return to the bootstrap flow.
2. Add `TRIGGER_ACCESS_TOKEN` to `.env.bootstrap.local` for bootstrap-only Trigger CLI auth.

`TRIGGER_ACCESS_TOKEN` in `.env.bootstrap.local` is separate from the runtime Trigger values in `.env.local`.

## Local Readiness Checklist

- `.env.local` exists
- `TRIGGER_PROJECT_REF` is set
- `TRIGGER_SECRET_KEY` is set and is a development key
- `trigger.config.ts` exists
- `package.json` includes `trigger:dev`
- `package.json` includes `dev:all`
- Trigger.dev CLI auth is satisfied by either a completed login or `TRIGGER_ACCESS_TOKEN` in `.env.bootstrap.local`

## Expected Local Files

- `trigger.config.ts`
- `trigger/`
- `src/lib/jobs/`

## Common Local Issues

- App runs but jobs do not:
  use `npm run dev:all` instead of `npm run dev`
- Trigger.dev runtime asks for missing env:
  check `.env.local`, not `.env`
- Trigger verification fails:
  check `TRIGGER_PROJECT_REF`, `TRIGGER_SECRET_KEY`, Trigger CLI auth, and `trigger.config.ts`
- Jobs runtime needs focused debugging:
  use `npm run trigger:dev`

## Local Vs Deploy

Local bootstrap only covers local Trigger.dev readiness.

`npm run trigger:deploy` is a deployment command. It is not required for local development.

## Do Not Do This

- do not create a duplicate `.env` just to run Trigger.dev locally
- do not paste Trigger.dev secret keys into chat or prompts
- do not move `TRIGGER_ACCESS_TOKEN` into `.env.local`; keep it in `.env.bootstrap.local` when you need the non-interactive bootstrap path
