alter table public.world_boss_events
  add column if not exists balance_season text;

update public.world_boss_events
set balance_season = coalesce(nullif(reward_config ->> 'balanceSeason', ''), 'legacy-v1')
where balance_season is null;

alter table public.world_boss_events
  alter column balance_season set default 'legacy-v1',
  alter column balance_season set not null;

alter table public.world_boss_events
  drop constraint if exists world_boss_events_balance_season_check;

alter table public.world_boss_events
  add constraint world_boss_events_balance_season_check
  check (balance_season ~ '^[a-z0-9][a-z0-9._-]{2,47}$');

create index if not exists world_boss_events_season_status_starts_idx
  on public.world_boss_events (balance_season, status, starts_at desc);

comment on column public.world_boss_events.balance_season is
  'Separates leaderboard and damage eras. equipment-v4-s1 must never share an event id with legacy balance contributions.';

update public.world_boss_events
set status = 'expired',
    updated_at = clock_timestamp()
where balance_season <> 'equipment-v4-s1'
  and status in ('active', 'scheduled');

insert into public.world_boss_events (
  slug,
  name,
  status,
  max_hp,
  current_hp,
  starts_at,
  ends_at,
  reward_config,
  balance_season
)
select
  'aschenkoenig-equipment-v4-s1-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS'),
  'Der Aschenkönig',
  'active',
  500000,
  500000,
  clock_timestamp(),
  clock_timestamp() + interval '7 days',
  jsonb_build_object(
    'balanceSeason', 'equipment-v4-s1',
    'Teilnahme', jsonb_build_object('Gold', 500, 'Staub', 75),
    'Sieg', jsonb_build_object('Gold', 1200, 'Staub', 150, 'Titel', 'Aschenbezwinger'),
    'Top 10', jsonb_build_object('Gold', 2500, 'Staub', 300)
  ),
  'equipment-v4-s1'
where not exists (
  select 1
  from public.world_boss_events
  where balance_season = 'equipment-v4-s1'
    and status in ('active', 'scheduled')
    and ends_at > clock_timestamp()
);

create or replace function public.get_world_boss_attempt_status(p_event_id uuid)
returns table (
  can_attack boolean,
  can_resume boolean,
  active_attempt_id uuid,
  fight_expires_at timestamptz,
  next_available_at timestamptz,
  server_now timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_event public.world_boss_events%rowtype;
  v_latest public.world_boss_attempts%rowtype;
  v_resume boolean := false;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_event_id is null then raise exception 'world boss event missing'; end if;

  select * into v_event
  from public.world_boss_events
  where id = p_event_id;

  if not found then raise exception 'world boss event not found'; end if;
  if v_event.balance_season <> 'equipment-v4-s1' then raise exception 'world boss balance season mismatch'; end if;

  select * into v_latest
  from public.world_boss_attempts
  where user_id = v_user_id
    and event_id = p_event_id
  order by started_at desc
  limit 1;

  if v_latest.id is not null then
    v_resume := v_latest.submitted_at is null
      and v_latest.fight_expires_at > v_now;
  end if;

  return query select
    case
      when v_latest.id is null then true
      when v_resume then false
      else v_latest.next_available_at <= v_now
    end,
    v_resume,
    case when v_resume then v_latest.id else null end,
    case when v_resume then v_latest.fight_expires_at else null end,
    v_latest.next_available_at,
    v_now;
end;
$$;

create or replace function public.start_world_boss_attempt(p_event_id uuid)
returns table (
  attempt_id uuid,
  started_at timestamptz,
  fight_expires_at timestamptz,
  next_available_at timestamptz,
  server_now timestamptz,
  resumed boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_event public.world_boss_events%rowtype;
  v_latest public.world_boss_attempts%rowtype;
  v_attempt public.world_boss_attempts%rowtype;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_event_id is null then raise exception 'world boss event missing'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_event_id::text, 0));

  select * into v_event
  from public.world_boss_events
  where id = p_event_id
  for update;

  if not found then raise exception 'world boss event not found'; end if;
  if v_event.balance_season <> 'equipment-v4-s1' then raise exception 'world boss balance season mismatch'; end if;
  if v_event.status <> 'active'
    or v_now < v_event.starts_at
    or v_now >= v_event.ends_at
    or v_event.current_hp <= 0 then
    raise exception 'world boss event is not active';
  end if;

  select * into v_latest
  from public.world_boss_attempts
  where user_id = v_user_id
    and event_id = p_event_id
  order by started_at desc
  limit 1;

  if v_latest.id is not null
    and v_latest.submitted_at is null
    and v_latest.fight_expires_at > v_now then
    return query select v_latest.id, v_latest.started_at, v_latest.fight_expires_at, v_latest.next_available_at, v_now, true;
    return;
  end if;

  if v_latest.id is not null and v_latest.next_available_at > v_now then
    raise exception 'world boss cooldown active until %', v_latest.next_available_at;
  end if;

  insert into public.world_boss_attempts (
    event_id,
    user_id,
    started_at,
    fight_expires_at,
    next_available_at
  ) values (
    p_event_id,
    v_user_id,
    v_now,
    v_now + interval '5 minutes',
    v_now + interval '24 hours'
  )
  returning * into v_attempt;

  return query select v_attempt.id, v_attempt.started_at, v_attempt.fight_expires_at, v_attempt.next_available_at, v_now, false;
end;
$$;

create or replace function public.record_world_boss_hit(
  p_user_id uuid,
  p_event_id uuid,
  p_hit_token text,
  p_damage integer
)
returns table (
  remaining_hp bigint,
  accepted_damage integer,
  defeated boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event public.world_boss_events%rowtype;
  v_attempt public.world_boss_attempts%rowtype;
  v_inserted integer;
  v_accepted integer;
  v_remaining bigint;
  v_recent_hits integer;
  v_now timestamptz := clock_timestamp();
begin
  if p_user_id is null or p_event_id is null then raise exception 'missing identity or event'; end if;
  if p_damage is null or p_damage <= 0 or p_damage > 50000 then raise exception 'invalid damage'; end if;
  if p_hit_token is null or char_length(p_hit_token) < 16 or char_length(p_hit_token) > 128 then raise exception 'invalid hit token'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_event_id::text, 0));

  select * into v_attempt
  from public.world_boss_attempts
  where user_id = p_user_id
    and event_id = p_event_id
  order by started_at desc
  limit 1
  for update;

  if not found then raise exception 'world boss attempt required'; end if;

  if v_attempt.submitted_at is not null then
    if v_attempt.hit_token = p_hit_token then
      return query select v_attempt.remaining_hp, coalesce(v_attempt.accepted_damage, 0), coalesce(v_attempt.defeated, false);
      return;
    end if;
    raise exception 'world boss attempt already submitted';
  end if;

  if v_attempt.fight_expires_at <= v_now then raise exception 'world boss attempt expired'; end if;

  select * into v_event
  from public.world_boss_events
  where id = p_event_id
  for update;

  if not found then raise exception 'world boss event not found'; end if;
  if v_event.balance_season <> 'equipment-v4-s1' then raise exception 'world boss balance season mismatch'; end if;
  if v_event.status <> 'active'
    or v_now < v_event.starts_at
    or v_now >= v_event.ends_at
    or v_event.current_hp <= 0 then
    raise exception 'world boss event is not active';
  end if;

  select count(*) into v_recent_hits
  from public.world_boss_hits
  where event_id = p_event_id
    and user_id = p_user_id
    and created_at > v_now - interval '1 second';

  if v_recent_hits >= 20 then raise exception 'hit rate limit exceeded'; end if;

  insert into public.world_boss_hits (hit_token, event_id, user_id, damage)
  values (p_hit_token, p_event_id, p_user_id, p_damage)
  on conflict (hit_token) do nothing
  returning 1 into v_inserted;

  if v_inserted is null then raise exception 'duplicate world boss hit token'; end if;

  v_accepted := least(p_damage, v_event.current_hp::integer);

  update public.world_boss_events
  set current_hp = greatest(0, current_hp - v_accepted),
      status = case when current_hp - v_accepted <= 0 then 'defeated' else status end,
      updated_at = v_now
  where id = p_event_id
  returning current_hp into v_remaining;

  insert into public.world_boss_contributions (event_id, user_id, damage, hits)
  values (p_event_id, p_user_id, v_accepted, 1)
  on conflict (event_id, user_id)
  do update set
    damage = public.world_boss_contributions.damage + excluded.damage,
    hits = public.world_boss_contributions.hits + 1,
    updated_at = v_now;

  update public.world_boss_attempts
  set submitted_at = v_now,
      hit_token = p_hit_token,
      accepted_damage = v_accepted,
      remaining_hp = v_remaining,
      defeated = (v_remaining = 0)
  where id = v_attempt.id;

  return query select v_remaining, v_accepted, (v_remaining = 0);
end;
$$;

revoke all on function public.get_world_boss_attempt_status(uuid) from public, anon;
revoke all on function public.start_world_boss_attempt(uuid) from public, anon;
revoke all on function public.record_world_boss_hit(uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.get_world_boss_attempt_status(uuid) to authenticated;
grant execute on function public.start_world_boss_attempt(uuid) to authenticated;
grant execute on function public.record_world_boss_hit(uuid, uuid, text, integer) to service_role;
