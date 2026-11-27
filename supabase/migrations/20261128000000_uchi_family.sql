-- Uchibatake: managing who's in a shared field (owner only).
--
-- uchi_set_role: the owner changes a joined member's role (editor or
-- helper); the server's permissions follow (uchi_can_write reads it).
-- uchi_remove_member: the owner takes someone off the shared field; they
-- keep what's already on their phone, but can't read or write the share.

create or replace function public.uchi_set_role(p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  h text;
begin
  if p_role not in ('editor', 'helper') then raise exception 'bad role'; end if;
  select m.household_id into h from public.uchi_members m where m.user_id = uid and m.role = 'owner';
  if h is null then raise exception 'not allowed'; end if;
  if p_user = uid then raise exception 'the owner stays the owner'; end if;
  update public.uchi_members m set role = p_role where m.household_id = h and m.user_id = p_user;
  if not found then raise exception 'not in this field'; end if;
end;
$$;

create or replace function public.uchi_remove_member(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  h text;
begin
  select m.household_id into h from public.uchi_members m where m.user_id = uid and m.role = 'owner';
  if h is null then raise exception 'not allowed'; end if;
  if p_user = uid then raise exception 'use leave instead'; end if;
  delete from public.uchi_members m where m.household_id = h and m.user_id = p_user;
  if not found then raise exception 'not in this field'; end if;
end;
$$;

revoke all on function public.uchi_set_role(uuid, text), public.uchi_remove_member(uuid) from public, anon;
grant execute on function public.uchi_set_role(uuid, text), public.uchi_remove_member(uuid) to authenticated;
