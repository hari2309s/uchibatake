-- Uchibatake: sharing one family field between phones (opt-in).
--
-- The app is local-first: each phone keeps its field in IndexedDB. When a
-- signed-in family turns on sharing, rows are copied here and back.
--
--   uchi_households  one per shared field (id = the field's id on the phone)
--   uchi_members     who may open it, with a role; one shared field per account
--   uchi_rows        every shared row as jsonb; last-write-wins on updated_at
--                    (client ms); deletes are tombstones; server_updated_at
--                    (set here) is the pull cursor
--   uchi_invites     "Send a link": a long random code, 14 days, used once
--
-- Not stored here: photos (they stay on each phone) and the street address
-- (the phone strips it before upload). Everything goes when the last member
-- leaves or deletes their account.

-- Tables ---------------------------------------------------------------------

create table if not exists public.uchi_households (
  id         text        primary key check (char_length(id) between 1 and 80),
  created_at timestamptz not null default now()
);

create table if not exists public.uchi_members (
  household_id text        not null references public.uchi_households (id) on delete cascade,
  user_id      uuid        not null unique references auth.users (id) on delete cascade,
  role         text        not null check (role in ('owner', 'editor', 'helper')),
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.uchi_rows (
  household_id      text        not null references public.uchi_households (id) on delete cascade,
  tbl               text        not null check (tbl in ('households', 'members', 'spaces', 'plantings', 'tasks', 'harvests', 'journal_entries', 'seeds', 'reminders', 'notices')),
  id                text        not null check (char_length(id) between 1 and 200),
  data              jsonb       not null check (octet_length(data::text) < 100000),
  updated_at        bigint      not null,
  deleted           boolean     not null default false,
  updated_by        uuid,
  server_updated_at timestamptz not null default clock_timestamp(),
  primary key (household_id, tbl, id)
);

create index if not exists uchi_rows_pull on public.uchi_rows (household_id, server_updated_at, id);

create table if not exists public.uchi_invites (
  code         text        primary key check (char_length(code) between 32 and 80),
  household_id text        not null references public.uchi_households (id) on delete cascade,
  role         text        not null check (role in ('editor', 'helper')),
  -- The family member this invite is for ("Rosie"): joining links them to the account.
  member_id    text        not null check (char_length(member_id) between 1 and 200),
  invited_by   uuid        not null references auth.users (id) on delete cascade,
  inviter_name text        check (char_length(inviter_name) <= 60),
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '14 days',
  used_by      uuid        references auth.users (id) on delete set null,
  used_at      timestamptz
);

-- Helpers --------------------------------------------------------------------

-- This account's role in a field, or null.
create or replace function public.uchi_role(h text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.uchi_members where household_id = h and user_id = auth.uid()
$$;

-- What a role may write: owners and editors everything; helpers the day's work
-- (jobs, harvests, the journal, notices, reminders, and plants: ticking "Sow peas" starts them).
-- The phone only pushes these.
create or replace function public.uchi_can_write(h text, t text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select role in ('owner', 'editor')
         or (role = 'helper' and t in ('tasks', 'harvests', 'journal_entries', 'notices', 'reminders', 'plantings'))
       from public.uchi_members where household_id = h and user_id = auth.uid()),
    false)
$$;

-- Last write wins; rows never move between fields or tables; the server stamps the cursor.
create or replace function public.uchi_rows_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.updated_at < old.updated_at then
      return null; -- stale: the phone pulls the newer row next time
    end if;
    new.household_id := old.household_id;
    new.tbl := old.tbl;
  end if;
  new.updated_by := auth.uid();
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists uchi_rows_guard on public.uchi_rows;
create trigger uchi_rows_guard before insert or update on public.uchi_rows
  for each row execute function public.uchi_rows_guard();

-- Row level security ---------------------------------------------------------

alter table public.uchi_households enable row level security;
alter table public.uchi_members enable row level security;
alter table public.uchi_rows enable row level security;
alter table public.uchi_invites enable row level security;

drop policy if exists "members see their field" on public.uchi_households;
create policy "members see their field" on public.uchi_households
  for select to authenticated using (public.uchi_role(id) is not null);

drop policy if exists "members see each other" on public.uchi_members;
create policy "members see each other" on public.uchi_members
  for select to authenticated using (public.uchi_role(household_id) is not null);

drop policy if exists "members read rows" on public.uchi_rows;
create policy "members read rows" on public.uchi_rows
  for select to authenticated using (public.uchi_role(household_id) is not null);

drop policy if exists "members write rows" on public.uchi_rows;
create policy "members write rows" on public.uchi_rows
  for insert to authenticated with check (public.uchi_can_write(household_id, tbl));

drop policy if exists "members update rows" on public.uchi_rows;
create policy "members update rows" on public.uchi_rows
  for update to authenticated
  using (public.uchi_can_write(household_id, tbl))
  with check (public.uchi_can_write(household_id, tbl));

-- Invites are only read and used through the functions below.

revoke all on public.uchi_households, public.uchi_members, public.uchi_rows, public.uchi_invites from anon, authenticated;
grant select on public.uchi_households, public.uchi_members to authenticated;
grant select, insert, update on public.uchi_rows to authenticated;

-- Functions the app calls ----------------------------------------------------

-- Turns sharing on for this phone's field. If the account already shares a
-- field (another phone, or a family they joined), that one is returned instead
-- and nothing is created; the phone decides what to do.
create or replace function public.uchi_share(p_id text)
returns table (household_id text, role text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  if char_length(p_id) not between 1 and 80 then raise exception 'bad field id'; end if;
  if not exists (select 1 from public.uchi_members m where m.user_id = uid) then
    if exists (select 1 from public.uchi_households h where h.id = p_id) then
      -- Someone else's field id: never take it over.
      raise exception 'field id in use';
    end if;
    insert into public.uchi_households (id) values (p_id);
    insert into public.uchi_members (household_id, user_id, role) values (p_id, uid, 'owner');
  end if;
  return query select m.household_id, m.role from public.uchi_members m where m.user_id = uid;
end;
$$;

-- The account's shared field, if any (a new phone signing in).
create or replace function public.uchi_my_field()
returns table (household_id text, role text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.household_id, m.role from public.uchi_members m where m.user_id = auth.uid()
$$;

-- "Send a link": owners and editors make an invite. Returns the code.
create or replace function public.uchi_invite(p_role text, p_member_id text, p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  h text;
  c text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  select m.household_id into h from public.uchi_members m where m.user_id = uid and m.role in ('owner', 'editor');
  if h is null then raise exception 'not allowed'; end if;
  if p_role not in ('editor', 'helper') then raise exception 'bad role'; end if;
  if not exists (select 1 from public.uchi_rows r where r.household_id = h and r.tbl = 'members' and r.id = p_member_id and not r.deleted) then
    raise exception 'no such member';
  end if;
  if (select count(*) from public.uchi_invites i where i.household_id = h and i.used_at is null and i.expires_at > now()) >= 20 then
    raise exception 'too many open invites';
  end if;
  insert into public.uchi_invites (code, household_id, role, member_id, invited_by, inviter_name)
  values (c, h, p_role, p_member_id, uid, nullif(left(p_name, 60), ''));
  return c;
end;
$$;

-- M13: what the invite is for (who asked, where, which spaces, the role), for a
-- signed-in person holding a valid code. Null when it's used, expired or unknown.
create or replace function public.uchi_invite_preview(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'inviter', i.inviter_name,
    'role', i.role,
    'member_id', i.member_id,
    'place', (select r.data->>'place' from public.uchi_rows r where r.household_id = i.household_id and r.tbl = 'households' and not r.deleted limit 1),
    'members', coalesce((select jsonb_agg(jsonb_build_object('name', r.data->>'name', 'mark', r.data->'mark') order by (r.data->>'sort')::int)
                         from public.uchi_rows r where r.household_id = i.household_id and r.tbl = 'members' and not r.deleted), '[]'::jsonb),
    'spaces', coalesce((select jsonb_agg(jsonb_build_object('name', s.data->>'name', 'type', s.data->>'type', 'facing', s.data->>'facing',
                         'crops', (select coalesce(jsonb_agg(distinct p.data->>'crop_id'), '[]'::jsonb) from public.uchi_rows p
                                    where p.household_id = i.household_id and p.tbl = 'plantings' and not p.deleted
                                      and p.data->>'space_id' = s.id and p.data->>'status' = 'growing' and p.data->>'crop_id' is not null))
                         order by (s.data->>'sort')::int)
                         from public.uchi_rows s where s.household_id = i.household_id and s.tbl = 'spaces' and not s.deleted), '[]'::jsonb),
    'already', exists (select 1 from public.uchi_members m where m.user_id = auth.uid() and m.household_id = i.household_id),
    'elsewhere', exists (select 1 from public.uchi_members m where m.user_id = auth.uid() and m.household_id <> i.household_id)
  )
  from public.uchi_invites i
  -- The person who used it can still open it (to bring the field to another phone, or after a join that didn't finish).
  where i.code = p_code and auth.uid() is not null
    and ((i.used_at is null and i.expires_at > now()) or i.used_by = auth.uid())
$$;

-- Leaves the account's shared field; the field goes when its last member leaves.
create or replace function public.uchi_leave()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  h text;
begin
  select m.household_id into h from public.uchi_members m where m.user_id = uid;
  if h is null then return; end if;
  delete from public.uchi_members m where m.user_id = uid;
  if not exists (select 1 from public.uchi_members m where m.household_id = h) then
    delete from public.uchi_households where id = h;
  elsif not exists (select 1 from public.uchi_members m where m.household_id = h and m.role = 'owner') then
    -- Someone must still be able to look after it all: whoever joined first.
    update public.uchi_members m set role = 'owner'
     where m.household_id = h
       and m.user_id = (select m2.user_id from public.uchi_members m2 where m2.household_id = h order by m2.joined_at, m2.user_id limit 1);
  end if;
end;
$$;

-- Joins with an invite (leaving any other shared field first). Returns the field, role and member.
create or replace function public.uchi_join(p_code text)
returns table (household_id text, role text, member_id text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  inv public.uchi_invites;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select * into inv from public.uchi_invites i where i.code = p_code and i.used_at is null and i.expires_at > now() for update;
  if inv.code is null then raise exception 'invite not valid'; end if;
  if not exists (select 1 from public.uchi_members m where m.user_id = uid and m.household_id = inv.household_id) then
    perform public.uchi_leave();
    insert into public.uchi_members (household_id, user_id, role) values (inv.household_id, uid, inv.role);
  end if;
  -- The family member the invite was for is now this account (and has its role), on every phone.
  update public.uchi_rows r
     set data = r.data || jsonb_build_object('user_id', uid::text, 'role', inv.role,
                 'updated_at', greatest(r.updated_at + 1, (extract(epoch from clock_timestamp()) * 1000)::bigint)),
         updated_at = greatest(r.updated_at + 1, (extract(epoch from clock_timestamp()) * 1000)::bigint)
   where r.household_id = inv.household_id and r.tbl = 'members' and r.id = inv.member_id;
  update public.uchi_invites i set used_by = uid, used_at = now() where i.code = p_code;
  return query select m.household_id, m.role, inv.member_id from public.uchi_members m where m.user_id = uid;
end;
$$;

-- M17b: deletes the account. Its shared field goes too if no one else is in it.
create or replace function public.uchi_delete_me()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  perform public.uchi_leave();
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.uchi_role(text), public.uchi_can_write(text, text), public.uchi_share(text), public.uchi_my_field(),
  public.uchi_invite(text, text, text), public.uchi_invite_preview(text), public.uchi_leave(), public.uchi_join(text), public.uchi_delete_me()
  from public, anon;
grant execute on function public.uchi_role(text), public.uchi_can_write(text, text), public.uchi_share(text), public.uchi_my_field(),
  public.uchi_invite(text, text, text), public.uchi_invite_preview(text), public.uchi_leave(), public.uchi_join(text), public.uchi_delete_me()
  to authenticated;
