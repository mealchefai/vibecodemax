-- Meals migration
-- Created: 2026-05-26
-- Name: 20260526000200_meals

create table if not exists public.meals (
  id            uuid primary key default gen_random_uuid(),
  meal_plan_id  uuid not null references public.meal_plans(id) on delete cascade,
  day           smallint not null check (day between 1 and 7),
  meal_type     text not null check (meal_type in ('breakfast', 'lunch', 'dinner')),
  name          text not null,
  description   text not null,
  ingredients   jsonb not null default '[]',
  calories      integer not null,
  protein_g     numeric(6,1) not null,
  carbs_g       numeric(6,1) not null,
  fat_g         numeric(6,1) not null,
  image_file_id uuid references public.files(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists meals_meal_plan_id_idx
on public.meals(meal_plan_id);

-- RLS
alter table public.meals enable row level security;

-- Users can read meals that belong to their own meal plans
create policy "meals_select_own"
on public.meals
for select
to authenticated
using (
  exists (
    select 1 from public.meal_plans mp
    where mp.id = meals.meal_plan_id
      and mp.user_id = (select auth.uid())
  )
);

-- No direct client INSERT or UPDATE — writes are via service role from background jobs

grant select on public.meals to authenticated;
