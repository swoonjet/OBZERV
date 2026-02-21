-- ─── OBZERV: profiles + subscriptions ────────────────────────────────────────

-- User handles (public display name, used for subscribe links)
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  handle     text unique not null check (handle ~ '^[a-z0-9_]{3,20}$'),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_public_read"
  on public.profiles for select using (true);

create policy "profiles_own_write"
  on public.profiles for all using (auth.uid() = id);

-- Subscription relationships between users
create table if not exists public.subscriptions (
  id            uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references auth.users(id) on delete cascade,
  publisher_id  uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz default now(),
  unique (subscriber_id, publisher_id)
);

alter table public.subscriptions enable row level security;

create policy "subscriptions_own"
  on public.subscriptions for all using (auth.uid() = subscriber_id);

create policy "subscriptions_publisher_read"
  on public.subscriptions for select using (auth.uid() = publisher_id);
