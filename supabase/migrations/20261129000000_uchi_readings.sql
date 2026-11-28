-- Uchibatake: thermometer (and later sensor) readings are shared with the
-- field, like its other rows. Helpers may add them too (a child reading the
-- thermometer is a family job).

alter table public.uchi_rows drop constraint if exists uchi_rows_tbl_check;
alter table public.uchi_rows add constraint uchi_rows_tbl_check
  check (tbl in ('households', 'members', 'spaces', 'plantings', 'tasks', 'harvests', 'journal_entries', 'seeds', 'reminders', 'notices', 'readings'));

create or replace function public.uchi_can_write(h text, t text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select role in ('owner', 'editor')
         or (role = 'helper' and t in ('tasks', 'harvests', 'journal_entries', 'notices', 'reminders', 'plantings', 'readings'))
       from public.uchi_members where household_id = h and user_id = auth.uid()),
    false)
$$;
