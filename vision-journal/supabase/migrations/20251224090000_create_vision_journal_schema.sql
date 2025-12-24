create extension if not exists "pgcrypto";

drop function if exists public.handle_new_user cascade;
drop function if exists public.set_updated_at cascade;
drop function if exists public.enforce_habit_log cascade;
drop function if exists public.enforce_vision_habit_map cascade;
drop function if exists public.enforce_journal_entry_link cascade;

drop table if exists public.journal_entry_links cascade;
drop table if exists public.journal_entries cascade;
drop table if exists public.vision_habit_maps cascade;
drop table if exists public.vision_habit_map cascade;
drop table if exists public.vision_items cascade;
drop table if exists public.habit_logs cascade;
drop table if exists public.habits cascade;
drop table if exists public.monthly_summaries cascade;
drop table if exists public.profiles cascade;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'America/Toronto',
  week_start_day int not null default 0 check (week_start_day between 0 and 6),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null check (char_length(name) <= 60),
  type text not null check (type in ('BINARY', 'NUMERIC')),
  unit text null,
  target_value numeric null check (target_value is null or target_value > 0),
  is_archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  habit_id uuid not null references public.habits(id),
  date date not null,
  value numeric not null check (value >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (habit_id, date)
);

create table public.vision_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  title text not null check (char_length(title) <= 80),
  type text not null check (type in ('SHORT_TERM', 'LONG_TERM')),
  description text null,
  is_archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.vision_habit_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  vision_item_id uuid not null references public.vision_items(id),
  habit_id uuid not null references public.habits(id),
  weight int null check (weight between 1 and 5),
  created_at timestamptz not null default timezone('utc', now()),
  unique (vision_item_id, habit_id)
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  date date not null,
  content text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, date)
);

create table public.journal_entry_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  journal_entry_id uuid not null references public.journal_entries(id),
  entity_type text not null check (entity_type in ('HABIT', 'VISION_ITEM')),
  entity_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (journal_entry_id, entity_type, entity_id)
);

create table public.monthly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  reflection text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, month)
);

create index habits_user_archived_idx on public.habits (user_id, is_archived);
create index habit_logs_user_date_idx on public.habit_logs (user_id, date);
create index habit_logs_habit_date_idx on public.habit_logs (habit_id, date);
create index vision_items_user_archived_idx on public.vision_items (user_id, is_archived);
create index journal_entries_user_date_idx on public.journal_entries (user_id, date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.enforce_habit_log()
returns trigger
language plpgsql
as $$
declare
  v_type text;
  v_archived boolean;
  v_user_id uuid;
begin
  select type, is_archived, user_id
    into v_type, v_archived, v_user_id
  from public.habits
  where id = new.habit_id;

  if v_type is null then
    raise exception 'Habit not found';
  end if;

  if v_user_id <> new.user_id then
    raise exception 'Habit user mismatch';
  end if;

  if v_archived then
    raise exception 'Cannot log archived habit';
  end if;

  if v_type = 'BINARY' then
    if new.value not in (0, 1) then
      raise exception 'Binary habit value must be 0 or 1';
    end if;
  elsif v_type = 'NUMERIC' then
    if new.value < 0 then
      raise exception 'Numeric habit value must be >= 0';
    end if;
  else
    raise exception 'Invalid habit type';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_vision_habit_map()
returns trigger
language plpgsql
as $$
declare
  v_habit_archived boolean;
  v_vision_archived boolean;
  v_habit_user uuid;
  v_vision_user uuid;
begin
  select is_archived, user_id
    into v_habit_archived, v_habit_user
  from public.habits
  where id = new.habit_id;

  if v_habit_user is null then
    raise exception 'Habit not found';
  end if;

  select is_archived, user_id
    into v_vision_archived, v_vision_user
  from public.vision_items
  where id = new.vision_item_id;

  if v_vision_user is null then
    raise exception 'Vision item not found';
  end if;

  if v_habit_user <> new.user_id or v_vision_user <> new.user_id then
    raise exception 'User mismatch';
  end if;

  if v_habit_archived or v_vision_archived then
    raise exception 'Cannot map archived items';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_journal_entry_link()
returns trigger
language plpgsql
as $$
declare
  v_entry_user uuid;
  v_ok boolean;
begin
  select user_id into v_entry_user
  from public.journal_entries
  where id = new.journal_entry_id;

  if v_entry_user is null then
    raise exception 'Journal entry not found';
  end if;

  if v_entry_user <> new.user_id then
    raise exception 'Journal entry user mismatch';
  end if;

  if new.entity_type = 'HABIT' then
    select true into v_ok
    from public.habits
    where id = new.entity_id
      and user_id = new.user_id
      and is_archived = false;
  elsif new.entity_type = 'VISION_ITEM' then
    select true into v_ok
    from public.vision_items
    where id = new.entity_id
      and user_id = new.user_id
      and is_archived = false;
  else
    raise exception 'Invalid entity type';
  end if;

  if v_ok is null then
    raise exception 'Linked entity is invalid or archived';
  end if;

  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger habits_set_updated_at
before update on public.habits
for each row execute function public.set_updated_at();

create trigger habit_logs_set_updated_at
before update on public.habit_logs
for each row execute function public.set_updated_at();

create trigger vision_items_set_updated_at
before update on public.vision_items
for each row execute function public.set_updated_at();

create trigger journal_entries_set_updated_at
before update on public.journal_entries
for each row execute function public.set_updated_at();

create trigger monthly_summaries_set_updated_at
before update on public.monthly_summaries
for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create trigger habit_logs_enforce_rules
before insert or update on public.habit_logs
for each row execute function public.enforce_habit_log();

create trigger vision_habit_maps_enforce_rules
before insert or update on public.vision_habit_maps
for each row execute function public.enforce_vision_habit_map();

create trigger journal_entry_links_enforce_rules
before insert or update on public.journal_entry_links
for each row execute function public.enforce_journal_entry_link();

alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.vision_items enable row level security;
alter table public.vision_habit_maps enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_entry_links enable row level security;
alter table public.monthly_summaries enable row level security;

create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy habits_select_own on public.habits
  for select using (user_id = auth.uid());
create policy habits_insert_own on public.habits
  for insert with check (user_id = auth.uid());
create policy habits_update_own on public.habits
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy habit_logs_select_own on public.habit_logs
  for select using (user_id = auth.uid());
create policy habit_logs_insert_own on public.habit_logs
  for insert with check (user_id = auth.uid());
create policy habit_logs_update_own on public.habit_logs
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy vision_items_select_own on public.vision_items
  for select using (user_id = auth.uid());
create policy vision_items_insert_own on public.vision_items
  for insert with check (user_id = auth.uid());
create policy vision_items_update_own on public.vision_items
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy vision_habit_maps_select_own on public.vision_habit_maps
  for select using (user_id = auth.uid());
create policy vision_habit_maps_insert_own on public.vision_habit_maps
  for insert with check (user_id = auth.uid());
create policy vision_habit_maps_update_own on public.vision_habit_maps
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy journal_entries_select_own on public.journal_entries
  for select using (user_id = auth.uid());
create policy journal_entries_insert_own on public.journal_entries
  for insert with check (user_id = auth.uid());
create policy journal_entries_update_own on public.journal_entries
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy journal_entry_links_select_own on public.journal_entry_links
  for select using (user_id = auth.uid());
create policy journal_entry_links_insert_own on public.journal_entry_links
  for insert with check (user_id = auth.uid());
create policy journal_entry_links_update_own on public.journal_entry_links
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy monthly_summaries_select_own on public.monthly_summaries
  for select using (user_id = auth.uid());
create policy monthly_summaries_insert_own on public.monthly_summaries
  for insert with check (user_id = auth.uid());
create policy monthly_summaries_update_own on public.monthly_summaries
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
