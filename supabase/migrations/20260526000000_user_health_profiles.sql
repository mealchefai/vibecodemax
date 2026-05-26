-- User health profiles migration
-- Created: 2026-05-26
-- Name: 20260526000000_user_health_profiles

create table if not exists public.user_health_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  age integer not null check (age >= 16 and age <= 100),
  gender text not null check (gender in ('male', 'female')),
  weight_kg numeric(5,2) not null check (weight_kg >= 30 and weight_kg <= 300),
  height_cm numeric(5,2) not null check (height_cm >= 100 and height_cm <= 250),
  activity_level text not null check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal text not null check (goal in ('lose', 'maintain', 'gain')),
  dietary_preferences text[] null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_health_profiles_user_id_idx
on public.user_health_profiles(user_id);

-- Auto-update updated_at on row change
create or replace function public.set_user_health_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_health_profiles_set_updated_at on public.user_health_profiles;
create trigger user_health_profiles_set_updated_at
before update on public.user_health_profiles
for each row
execute function public.set_user_health_profiles_updated_at();

-- RLS
alter table public.user_health_profiles enable row level security;

-- Authenticated users can read their own row
create policy "user_health_profiles_select_own"
on public.user_health_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Authenticated users can update their own row
create policy "user_health_profiles_update_own"
on public.user_health_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- No direct client INSERT policy — inserts are performed via service role in server actions

-- Explicit grants (RLS still enforced)
grant select, update on public.user_health_profiles to authenticated;
