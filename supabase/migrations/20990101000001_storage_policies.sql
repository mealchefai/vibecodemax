-- Storage setup for two-bucket setup:
--   public-assets   (public bucket): avatars/<uid>/..., blog/<uid>/...
--   private-uploads (private bucket): uploads/<uid>/...
--
-- NOTE:
-- - Storage metadata, buckets, and policies are provisioned here so local and hosted storage setup can both apply one SQL-owned migration.
-- - Public bucket objects are publicly readable by URL; these policies mainly protect write/manage/list.
-- - Authenticated storage policies assume upload wrappers generate keys with expected prefixes and uid in segment 2.

begin;

-- Files metadata
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete cascade,
  bucket text not null,
  key text not null,
  mime_type text not null,
  size_bytes bigint not null,
  visibility text not null check (visibility in ('public','private')),
  status text not null check (status in ('uploading','ready','failed','deleted')),
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(bucket, key)
);

create index if not exists files_owner_user_id_idx
on public.files(owner_user_id);



-- Avatar file reference
alter table public.profiles
add column if not exists avatar_file_id uuid references public.files(id);

create index if not exists profiles_avatar_file_id_idx
on public.profiles(avatar_file_id);


-- RLS policies for files
alter table public.files enable row level security;

-- Authenticated users can read their own files and any public file
create policy "files_select_authenticated"
on public.files
for select
to authenticated
using (owner_user_id = (select auth.uid()) or visibility = 'public');

-- Public files can be read by anonymous users
create policy "files_select_public"
on public.files
for select
to anon
using (visibility = 'public');

-- Users can update their own files
create policy "files_update_own"
on public.files
for update
to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

-- Users can delete their own files
create policy "files_delete_own"
on public.files
for delete
to authenticated
using ((select auth.uid()) = owner_user_id);

-- Explicit grants (RLS still enforced)
grant select on public.files to anon, authenticated;
grant update, delete on public.files to authenticated;


insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-assets', 'public-assets', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]),
  ('private-uploads', 'private-uploads', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[])
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- RLS policies for Supabase storage.objects
drop policy if exists "public_assets_select_own" on storage.objects;
create policy "public_assets_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'public-assets'
  and (storage.foldername(name))[1] in ('avatars', 'blog')
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

drop policy if exists "public_assets_insert_own" on storage.objects;
create policy "public_assets_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'public-assets'
  and (storage.foldername(name))[1] in ('avatars', 'blog')
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

drop policy if exists "public_assets_update_own" on storage.objects;
create policy "public_assets_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'public-assets'
  and (storage.foldername(name))[1] in ('avatars', 'blog')
  and (storage.foldername(name))[2] = (select auth.uid())::text
)
with check (
  bucket_id = 'public-assets'
  and (storage.foldername(name))[1] in ('avatars', 'blog')
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

drop policy if exists "public_assets_delete_own" on storage.objects;
create policy "public_assets_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'public-assets'
  and (storage.foldername(name))[1] in ('avatars', 'blog')
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

drop policy if exists "private_uploads_select_own" on storage.objects;
create policy "private_uploads_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'private-uploads'
  and (storage.foldername(name))[1] = 'uploads'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

drop policy if exists "private_uploads_insert_own" on storage.objects;
create policy "private_uploads_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'private-uploads'
  and (storage.foldername(name))[1] = 'uploads'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

drop policy if exists "private_uploads_update_own" on storage.objects;
create policy "private_uploads_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'private-uploads'
  and (storage.foldername(name))[1] = 'uploads'
  and (storage.foldername(name))[2] = (select auth.uid())::text
)
with check (
  bucket_id = 'private-uploads'
  and (storage.foldername(name))[1] = 'uploads'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

drop policy if exists "private_uploads_delete_own" on storage.objects;
create policy "private_uploads_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'private-uploads'
  and (storage.foldername(name))[1] = 'uploads'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);


commit;
