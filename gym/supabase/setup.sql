-- LiftLog cloud storage: one row per user holding all their LiftLog data.
-- Paste this whole file into Supabase → SQL Editor → New query, then click "Run".

create table if not exists public.liftlog_data (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security: each person can only see and change their own row.
alter table public.liftlog_data enable row level security;

drop policy if exists "Users read own data" on public.liftlog_data;
create policy "Users read own data" on public.liftlog_data
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users insert own data" on public.liftlog_data;
create policy "Users insert own data" on public.liftlog_data
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users update own data" on public.liftlog_data;
create policy "Users update own data" on public.liftlog_data
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
