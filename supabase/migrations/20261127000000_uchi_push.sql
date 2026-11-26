-- Uchibatake: the daily note while the app is closed (Web Push).
--
-- A row says only: the account, this browser's push address and keys, the local
-- time to wake it (a quarter hour), its time zone and the last day it was woken. Nothing from the field is stored or sent: the
-- push only wakes the phone, which writes the note from its own field (sw.js).

create table if not exists public.uchi_push (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Only the browsers' own push services: the tick posts to this URL, so it is never an arbitrary host.
  endpoint     text not null unique
    constraint uchi_push_host check (
      char_length(endpoint) between 1 and 2048
      and endpoint ~ '^https://(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/'
    ),
  p256dh       text not null check (char_length(p256dh) between 1 and 200),
  auth         text not null check (char_length(auth) between 1 and 100),
  hour         smallint not null check (hour between 0 and 23),
  minute       smallint not null default 0 check (minute in (0, 15, 30, 45)),
  tz           text not null default 'UTC' check (char_length(tz) between 1 and 64),
  last_sent_on date,
  created_at   timestamptz not null default now()
);

create index if not exists uchi_push_user on public.uchi_push (user_id);

alter table public.uchi_push enable row level security;
-- Phones manage their row only through the functions below; the tick uses the service key.
revoke all on public.uchi_push from anon, authenticated;

-- Turns on (or moves) the daily note for this browser. If another account left
-- a row for the same browser, it moves to the one signed in now. At most 10 per account.
create or replace function public.uchi_claim_push(p_endpoint text, p_p256dh text, p_auth text, p_hour integer, p_minute integer, p_tz text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  delete from public.uchi_push where endpoint = p_endpoint and user_id <> uid;
  if not exists (select 1 from public.uchi_push where endpoint = p_endpoint)
     and (select count(*) from public.uchi_push where user_id = uid) >= 10 then
    raise exception 'too many phones with the daily note';
  end if;
  insert into public.uchi_push as s (user_id, endpoint, p256dh, auth, hour, minute, tz)
  values (uid, p_endpoint, p_p256dh, p_auth, p_hour, p_minute, coalesce(nullif(p_tz, ''), 'UTC'))
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh, auth = excluded.auth, hour = excluded.hour, minute = excluded.minute, tz = excluded.tz,
        -- A new hour may still fall later today: let it send.
        last_sent_on = case when s.hour is distinct from excluded.hour or s.minute is distinct from excluded.minute or s.tz is distinct from excluded.tz then null else s.last_sent_on end;
end;
$$;

-- Turns it off for this browser.
create or replace function public.uchi_drop_push(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.uchi_push where endpoint = p_endpoint and user_id = auth.uid()
$$;

revoke all on function public.uchi_claim_push(text, text, text, integer, integer, text), public.uchi_drop_push(text) from public, anon;
grant execute on function public.uchi_claim_push(text, text, text, integer, integer, text), public.uchi_drop_push(text) to authenticated;

-- Every 15 minutes, wake the app's /api/push/tick (pg_cron + pg_net). Its URL and the
-- shared secret come from Supabase Vault each run; add them once:
--   select vault.create_secret('https://<your site>/api/push/tick', 'uchi_push_tick_url');
--   select vault.create_secret('<same as UCHI_CRON_SECRET>', 'uchi_cron_secret');
-- Until both exist the job does nothing. Without pg_cron/pg_net this only prints a notice.
do $migration$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_available_extensions where name = 'pg_net')
     or not exists (select 1 from pg_namespace where nspname = 'vault') then
    raise notice 'pg_cron, pg_net or Vault not available: the daily note tick is not scheduled';
    return;
  end if;
  create extension if not exists pg_cron with schema pg_catalog;
  create extension if not exists pg_net with schema extensions;
  perform cron.unschedule(jobid) from cron.job where jobname = 'uchi-push-tick';
  perform cron.schedule(
    'uchi-push-tick',
    '*/15 * * * *',
    $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'uchi_push_tick_url'),
        headers := jsonb_build_object('Content-Type', 'application/json',
          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'uchi_cron_secret')),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
      )
      where exists (select 1 from vault.decrypted_secrets where name = 'uchi_push_tick_url')
        and exists (select 1 from vault.decrypted_secrets where name = 'uchi_cron_secret')
    $job$
  );
end
$migration$;
