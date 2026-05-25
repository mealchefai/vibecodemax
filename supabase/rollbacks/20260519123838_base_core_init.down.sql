-- Rollback migration for 20260519123838_base_core_init
-- Created: 2026-05-19T12:38:38.997Z

-- Drop payments tables
DROP TRIGGER IF EXISTS webhook_events_set_updated_at ON public.webhook_events;
DROP FUNCTION IF EXISTS public.set_webhook_events_updated_at();
DROP TABLE IF EXISTS public.webhook_events;
DROP TABLE IF EXISTS public.trial_history;
DROP TABLE IF EXISTS public.purchases;
DROP TABLE IF EXISTS public.subscriptions;
DROP TABLE IF EXISTS public.entitlements;
DROP TABLE IF EXISTS public.product_prices;
DROP TABLE IF EXISTS public.products;

-- Drop background jobs table
DROP TRIGGER IF EXISTS email_deliveries_set_updated_at ON public.email_deliveries;
DROP FUNCTION IF EXISTS public.set_email_deliveries_updated_at();
DROP TABLE IF EXISTS public.email_deliveries;
DROP TRIGGER IF EXISTS jobs_set_updated_at ON public.jobs;
DROP FUNCTION IF EXISTS public.set_jobs_updated_at();
DROP TABLE IF EXISTS public.jobs;

-- Drop reserved tables
DROP TABLE IF EXISTS public.admin_users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.profiles;
