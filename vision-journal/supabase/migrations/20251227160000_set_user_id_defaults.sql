-- Ensure inserts pass RLS by defaulting user_id to auth.uid()
alter table public.habits
  alter column user_id set default auth.uid();

alter table public.habit_logs
  alter column user_id set default auth.uid();

alter table public.vision_items
  alter column user_id set default auth.uid();

alter table public.vision_habit_maps
  alter column user_id set default auth.uid();

alter table public.journal_entries
  alter column user_id set default auth.uid();

alter table public.journal_entry_links
  alter column user_id set default auth.uid();

alter table public.monthly_summaries
  alter column user_id set default auth.uid();
