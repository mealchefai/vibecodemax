create table if not exists public.stripe_product_config (
  product_id text primary key references public.products(id) on delete cascade,
  tax_code text null,
  tax_behavior text null check (tax_behavior in ('exclusive', 'inclusive', 'unspecified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stripe_product_config enable row level security;
