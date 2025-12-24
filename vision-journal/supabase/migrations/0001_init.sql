create extension if not exists "pgcrypto";

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  frequency text not null default 'daily',
  start_date date not null default current_date,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  log_date date not null,
  completed boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.vision_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  target_date date,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vision_habit_map (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vision_item_id uuid not null references public.vision_items(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (vision_item_id, habit_id)
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  mood text,
  content text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_entry_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  vision_item_id uuid references public.vision_items(id) on delete set null,
  habit_id uuid references public.habits(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.monthly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_date date not null,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_date)
);

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.vision_items enable row level security;
alter table public.vision_habit_map enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_entry_links enable row level security;
alter table public.monthly_summaries enable row level security;

create policy "habits_owner_all" on public.habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "habit_logs_owner_all" on public.habit_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "vision_items_owner_all" on public.vision_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "vision_habit_map_owner_all" on public.vision_habit_map
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "journal_entries_owner_all" on public.journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "journal_entry_links_owner_all" on public.journal_entry_links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "monthly_summaries_owner_all" on public.monthly_summaries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
