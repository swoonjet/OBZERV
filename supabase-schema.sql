-- Run this in your Supabase SQL editor
-- https://supabase.com/dashboard/project/hhahfydusomvbadddcek/sql

create table if not exists public.observations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  transcript   text not null,
  tags         text[] not null default '{}',
  duration     integer,
  latitude     double precision,
  longitude    double precision,
  address      text,
  created_at   timestamptz not null default now()
);

-- Row-level security: users can only see/edit their own observations
alter table public.observations enable row level security;

create policy "Users can read own observations"
  on public.observations for select
  using (auth.uid() = user_id);

create policy "Users can insert own observations"
  on public.observations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own observations"
  on public.observations for update
  using (auth.uid() = user_id);

create policy "Users can delete own observations"
  on public.observations for delete
  using (auth.uid() = user_id);

-- Index for fast user queries
create index observations_user_id_idx on public.observations(user_id);
create index observations_created_at_idx on public.observations(created_at desc);
