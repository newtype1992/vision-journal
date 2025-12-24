-- Optional seed data for local development.
-- Inserts sample rows for the first auth user if one exists.
do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users limit 1;
  if v_user_id is null then
    return;
  end if;

  insert into public.habits (user_id, name, type, unit, target_value)
  values (v_user_id, 'Read 10 pages', 'NUMERIC', 'pages', 10)
  on conflict do nothing;

  insert into public.vision_items (user_id, title, type, description)
  values (v_user_id, 'Build a daily journaling habit', 'SHORT_TERM', 'Stay consistent for 30 days')
  on conflict do nothing;
end $$;
