-- Project database migration
-- Created: 2026-05-19T12:38:38.996Z
-- Name: 20260519123838_base_core_init

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Authentication tables
-- Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- Auto-populate profiles on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS policies for profiles table
alter table public.profiles enable row level security;

-- Users can view their own profile
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

-- Users can update their own profile
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Profiles are created via trigger only
-- No INSERT policy for users

-- Explicit grants (RLS still enforced)
grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;

-- Admin users table
create table if not exists public.admin_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'super',
  created_at timestamptz not null default now()
);

-- RLS policies for admin_users table
alter table public.admin_users enable row level security;

-- Allow users to read their own admin status
create policy "admin_users_select_own"
on public.admin_users
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Explicit grants (RLS still enforced)
grant select on public.admin_users to authenticated;

-- Payments tables
-- Payments catalog
create table if not exists public.products (
  id text primary key,
  provider_product_id text,
  name text not null,
  description text,
  provider_description text,
  use_provider_description boolean not null default false,
  badge text,
  sort_order integer not null default 0,
  type text not null check (type in ('subscription','one_time')),
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  provider text not null,
  provider_price_id text not null,
  amount_cents integer not null,
  currency text not null,
  interval text check (interval in ('month','year')),
  trial_days integer,
  is_default boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists product_prices_provider_unique
on public.product_prices(provider, provider_price_id);

create index if not exists product_prices_product_id_idx
on public.product_prices(product_id);

-- Access ledger
create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null references public.products(id) on delete restrict,
  status text not null check (status in ('active','trialing','expired','revoked')),
  source text not null check (source in ('subscription','one_time','manual')),
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  trial_ends_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index if not exists entitlements_user_product_unique
on public.entitlements(user_id, product_id)
where status in ('active','trialing');

create index if not exists entitlements_product_id_idx
on public.entitlements(product_id);

-- Subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null references public.products(id) on delete restrict,
  product_price_id uuid not null references public.product_prices(id) on delete restrict,
  provider text not null,
  provider_customer_id text not null,
  provider_subscription_id text not null,
  status text not null check (status in ('trialing','active','past_due','canceled','unpaid')),
  provider_status text,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriptions_provider_unique
on public.subscriptions(provider, provider_subscription_id);

create index if not exists subscriptions_user_id_idx
on public.subscriptions(user_id);

create index if not exists subscriptions_product_id_idx
on public.subscriptions(product_id);

create index if not exists subscriptions_product_price_id_idx
on public.subscriptions(product_price_id);

-- Purchase transactions
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null references public.products(id) on delete restrict,
  product_price_id uuid not null references public.product_prices(id) on delete restrict,
  provider text not null,
  provider_payment_id text not null,
  provider_event_id text,
  amount_cents integer not null,
  currency text not null,
  purchase_type text not null default 'one_time'
    check (purchase_type in ('one_time','subscription_initial','subscription_renewal')),
  status text not null check (status in ('paid','refunded','failed')),
  provider_status text,
  raw_payload jsonb,
  purchased_at timestamptz not null default now()
);

create unique index if not exists purchases_provider_unique
on public.purchases(provider, provider_payment_id);

create index if not exists purchases_user_id_idx
on public.purchases(user_id);

create index if not exists purchases_product_id_idx
on public.purchases(product_id);

create index if not exists purchases_product_price_id_idx
on public.purchases(product_price_id);

-- Trial eligibility tracking
create table if not exists public.trial_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null references public.products(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists trial_history_user_id_idx
on public.trial_history(user_id);

create index if not exists trial_history_product_id_idx
on public.trial_history(product_id);

-- Webhook idempotency ledger
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  status text not null default 'dispatched'
    check (status in ('received','dispatch_failed','dispatched')),
  raw_payload jsonb,
  dispatch_error text,
  dispatch_claim_token text,
  dispatch_claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  dispatched_at timestamptz
);

create unique index if not exists webhook_events_provider_unique
on public.webhook_events(provider, event_id);

create or replace function public.set_webhook_events_updated_at()
returns trigger
language plpgsql
set search_path = 'public'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists webhook_events_set_updated_at on public.webhook_events;
create trigger webhook_events_set_updated_at
before update on public.webhook_events
for each row
execute function public.set_webhook_events_updated_at();


-- Background jobs table
-- Background job tracking
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  progress integer default 0
    check (progress >= 0 and progress <= 100),
  input jsonb,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_user_id_idx on public.jobs(user_id);
create index if not exists jobs_status_idx on public.jobs(status);

create or replace function public.set_jobs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
before update on public.jobs
for each row
execute function public.set_jobs_updated_at();

create table if not exists public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  email_type text not null,
  provider text,
  provider_event_id text,
  job_id uuid not null references public.jobs(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  sent_email_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists email_deliveries_job_id_idx
on public.email_deliveries(job_id);

create or replace function public.set_email_deliveries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists email_deliveries_set_updated_at on public.email_deliveries;
create trigger email_deliveries_set_updated_at
before update on public.email_deliveries
for each row
execute function public.set_email_deliveries_updated_at();

-- Row Level Security policies
-- RLS policies for payments tables
alter table public.products enable row level security;
alter table public.product_prices enable row level security;
alter table public.entitlements enable row level security;
alter table public.subscriptions enable row level security;
alter table public.purchases enable row level security;
alter table public.trial_history enable row level security;
alter table public.webhook_events enable row level security;

-- Public read for products and prices
create policy "products_select_public"
on public.products
for select
to anon, authenticated
using (active = true);

create policy "product_prices_select_public"
on public.product_prices
for select
to anon, authenticated
using (active = true);

-- Explicit grants for public read access (required alongside RLS policies)
grant select on public.products to anon, authenticated;
grant select on public.product_prices to anon, authenticated;

-- Authenticated users can read their own billing data
create policy "entitlements_select_own"
on public.entitlements
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "subscriptions_select_own"
on public.subscriptions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "purchases_select_own"
on public.purchases
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Trial history is service-only by default (no client policies)
-- Webhook events are service-only by default (no client policies)

alter table public.jobs enable row level security;
alter table public.email_deliveries enable row level security;

create policy "jobs_select_own"
on public.jobs
for select
to authenticated
using (auth.uid() = user_id);

create policy "jobs_insert_own"
on public.jobs
for insert
to authenticated
with check (auth.uid() = user_id);

-- Admin access is stored in public.admin_users.
