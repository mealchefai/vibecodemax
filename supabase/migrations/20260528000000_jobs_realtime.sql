-- Jobs Realtime migration
-- Created: 2026-05-28
-- Enable REPLICA IDENTITY FULL so Supabase Realtime can evaluate RLS policies
-- on UPDATE events (user_id must be present in the WAL old row).
-- Add jobs to the supabase_realtime publication so the Realtime service
-- streams WAL events for this table to subscribers.

alter table public.jobs replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'jobs'
  ) then
    alter publication supabase_realtime add table public.jobs;
  end if;
end $$;
