-- Meal plans migration
-- Created: 2026-05-26
-- Name: 20260526000100_meal_plans

create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  bmr numeric(7,2) not null,
  tdee numeric(7,2) not null,
  daily_calories integer not null,
  status text not null check (status in ('generating', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meal_plans_user_id_created_at_idx
on public.meal_plans(user_id, created_at desc);

-- Auto-update updated_at on row change
create or replace function public.set_meal_plans_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists meal_plans_set_updated_at on public.meal_plans;
create trigger meal_plans_set_updated_at
before update on public.meal_plans
for each row
execute function public.set_meal_plans_updated_at();

-- RLS
alter table public.meal_plans enable row level security;

-- Authenticated users can read their own rows
create policy "meal_plans_select_own"
on public.meal_plans
for select
to authenticated
using ((select auth.uid()) = user_id);

-- No direct client INSERT or UPDATE policy — writes are via service role from background jobs

-- Explicit grants (RLS still enforced)
grant select on public.meal_plans to authenticated;
