create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.world_boss_definitions (
  rotation_index smallint primary key,
  boss_key text not null unique,
  name_de text not null,
  name_en text not null,
  max_hp bigint not null check (max_hp > 0),
  mechanics jsonb not null,
  presentation jsonb not null,
  reward_config jsonb not null,
  balance_season text not null,
  constraint world_boss_definitions_rotation_index_check check (rotation_index between 0 and 2)
);

revoke all on table private.world_boss_definitions from public, anon, authenticated;

insert into private.world_boss_definitions (
  rotation_index, boss_key, name_de, name_en, max_hp,
  mechanics, presentation, reward_config, balance_season
) values
(
  0,
  'ash-king',
  'Der Aschenkönig',
  'The Ash King',
  500000,
  '{"archetype":"fire","attacks":[{"key":"ember-zones","telegraph":"safe-zones","pressure":"area"},{"key":"brand-burst","telegraph":"expanding-ring","pressure":"burst"},{"key":"cinder-rush","telegraph":"lane","pressure":"movement"}]}'::jsonb,
  '{"theme":"ash","accent":"ember","title":{"de":"König der verbrannten Krone","en":"King of the Burned Crown"},"rewardText":{"de":"Asche, Gold und der Titel Aschenbezwinger","en":"Ash, gold, and the Ashbreaker title"}}'::jsonb,
  '{"participation":{"gold":500,"dust":75},"top10":{"gold":2500,"dust":300},"victory":{"gold":1200,"dust":150,"titleKey":"ashbreaker","title":{"de":"Aschenbezwinger","en":"Ashbreaker"}}}'::jsonb,
  'worldboss-rotation-v1'
),
(
  1,
  'veil-dragon',
  'Der Schleierdrache',
  'The Veil Dragon',
  575000,
  '{"archetype":"shadow-poison","attacks":[{"key":"veil-breath","telegraph":"three-lanes","pressure":"ranged"},{"key":"sky-dive","telegraph":"impact-zone","pressure":"position"},{"key":"venom-mark","telegraph":"target-mark","pressure":"single-target"}]}'::jsonb,
  '{"theme":"veil","accent":"venom","title":{"de":"Drache zwischen den Welten","en":"Dragon Between Worlds"},"rewardText":{"de":"Schleierstaub, Gold und der Titel Schleierbrecher","en":"Veil dust, gold, and the Veilbreaker title"}}'::jsonb,
  '{"participation":{"gold":550,"dust":85},"top10":{"gold":2700,"dust":325},"victory":{"gold":1350,"dust":175,"titleKey":"veilbreaker","title":{"de":"Schleierbrecher","en":"Veilbreaker"}}}'::jsonb,
  'worldboss-rotation-v1'
),
(
  2,
  'deep-warden',
  'Der Tiefenwächter',
  'The Deep Warden',
  650000,
  '{"archetype":"armored-summoner","attacks":[{"key":"iron-guard","telegraph":"shield-phase","pressure":"defense"},{"key":"depth-call","telegraph":"summon-rifts","pressure":"adds"},{"key":"warden-slam","telegraph":"target-swap-ring","pressure":"control"}]}'::jsonb,
  '{"theme":"depth","accent":"aqua","title":{"de":"Wächter der versunkenen Schwelle","en":"Warden of the Sunken Threshold"},"rewardText":{"de":"Tiefenstaub, Gold und der Titel Tiefenbezwinger","en":"Depth dust, gold, and the Depthbreaker title"}}'::jsonb,
  '{"participation":{"gold":600,"dust":95},"top10":{"gold":2900,"dust":350},"victory":{"gold":1500,"dust":200,"titleKey":"depthbreaker","title":{"de":"Tiefenbezwinger","en":"Depthbreaker"}}}'::jsonb,
  'worldboss-rotation-v1'
)
on conflict (rotation_index) do update set
  boss_key = excluded.boss_key,
  name_de = excluded.name_de,
  name_en = excluded.name_en,
  max_hp = excluded.max_hp,
  mechanics = excluded.mechanics,
  presentation = excluded.presentation,
  reward_config = excluded.reward_config,
  balance_season = excluded.balance_season;

alter table public.world_boss_events
  add column if not exists rotation_key text,
  add column if not exists rotation_index smallint,
  add column if not exists boss_key text,
  add column if not exists mechanics jsonb not null default '{}'::jsonb,
  add column if not exists presentation jsonb not null default '{}'::jsonb;

alter table public.world_boss_events
  drop constraint if exists world_boss_events_rotation_index_check;
alter table public.world_boss_events
  add constraint world_boss_events_rotation_index_check
  check (rotation_index is null or rotation_index between 0 and 2);

create unique index if not exists world_boss_events_rotation_key_uidx
  on public.world_boss_events (rotation_key)
  where rotation_key is not null;

create unique index if not exists world_boss_events_single_active_uidx
  on public.world_boss_events ((status))
  where status = 'active';

create index if not exists world_boss_events_rotation_lookup_idx
  on public.world_boss_events (rotation_index, starts_at desc);

create or replace function private.world_boss_period(p_now timestamptz)
returns table (
  period_key text,
  rotation_index smallint,
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = pg_catalog
as $$
declare
  v_local_now timestamp := p_now at time zone 'Europe/Berlin';
  v_local_start timestamp;
  v_week bigint;
begin
  v_local_start := date_trunc('week', v_local_now) + interval '6 days 20 hours';
  if v_local_start > v_local_now then
    v_local_start := v_local_start - interval '7 days';
  end if;

  v_week := ((v_local_start::date - date '2026-07-26') / 7)::bigint;

  return query select
    to_char(v_local_start, 'YYYY-MM-DD') || '@20:00-Europe-Berlin',
    mod(mod(v_week, 3) + 3, 3)::smallint,
    v_local_start at time zone 'Europe/Berlin',
    (v_local_start + interval '7 days') at time zone 'Europe/Berlin';
end;
$$;

revoke all on function private.world_boss_period(timestamptz) from public, anon, authenticated;

create or replace function private.rotate_world_boss_at(p_now timestamptz default clock_timestamp())
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_period record;
  v_definition private.world_boss_definitions%rowtype;
  v_event_id uuid;
  v_slug text;
begin
  perform pg_advisory_xact_lock(hashtextextended('dungeon-veil-world-boss-weekly-rotation', 0));

  select * into strict v_period from private.world_boss_period(p_now);
  select * into strict v_definition
  from private.world_boss_definitions
  where rotation_index = v_period.rotation_index;

  update public.world_boss_events
  set status = case when current_hp <= 0 then 'defeated' else 'expired' end,
      updated_at = p_now
  where status = 'active'
    and rotation_key is distinct from v_period.period_key;

  select id into v_event_id
  from public.world_boss_events
  where rotation_key = v_period.period_key
  for update;

  if v_event_id is null then
    v_slug := v_definition.boss_key || '-' || replace(substring(v_period.period_key from 1 for 10), '-', '');

    insert into public.world_boss_events (
      slug, name, status, max_hp, current_hp, starts_at, ends_at,
      reward_config, balance_season, rotation_key, rotation_index,
      boss_key, mechanics, presentation
    ) values (
      v_slug,
      v_definition.name_de,
      'active',
      v_definition.max_hp,
      v_definition.max_hp,
      v_period.starts_at,
      v_period.ends_at,
      v_definition.reward_config,
      v_definition.balance_season,
      v_period.period_key,
      v_definition.rotation_index,
      v_definition.boss_key,
      v_definition.mechanics,
      v_definition.presentation || jsonb_build_object(
        'name', jsonb_build_object('de', v_definition.name_de, 'en', v_definition.name_en),
        'nextRotationAt', v_period.ends_at
      )
    )
    returning id into v_event_id;
  else
    update public.world_boss_events
    set status = case when current_hp <= 0 then 'defeated' else 'active' end,
        starts_at = v_period.starts_at,
        ends_at = v_period.ends_at,
        updated_at = p_now
    where id = v_event_id;
  end if;

  return v_event_id;
end;
$$;

revoke all on function private.rotate_world_boss_at(timestamptz) from public, anon, authenticated;
grant execute on function private.rotate_world_boss_at(timestamptz) to service_role;

create or replace function public.ensure_world_boss_rotation()
returns table (
  event_id uuid,
  rotation_key text,
  rotation_index smallint,
  boss_key text,
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_event_id uuid;
begin
  v_event_id := private.rotate_world_boss_at(clock_timestamp());

  return query
  select e.id, e.rotation_key, e.rotation_index, e.boss_key, e.starts_at, e.ends_at
  from public.world_boss_events e
  where e.id = v_event_id;
end;
$$;

revoke all on function public.ensure_world_boss_rotation() from public, anon;
grant execute on function public.ensure_world_boss_rotation() to authenticated, service_role;

create extension if not exists pg_cron;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'dungeon-veil-world-boss-rotation';

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'dungeon-veil-world-boss-rotation',
    '*/5 * * * *',
    'select private.rotate_world_boss_at(clock_timestamp());'
  );
end;
$$;

select private.rotate_world_boss_at(clock_timestamp());
