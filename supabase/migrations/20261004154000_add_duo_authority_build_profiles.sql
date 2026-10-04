-- #461 server-owned Duo build provenance prerequisite.
--
-- REPO ONLY. Do not apply this migration to production until the complete authority
-- rollout is independently accepted. Legacy browser/cloud inventory is deliberately
-- not imported: it has no reconstructible trusted acquisition provenance.

alter table public.coop_lobby_members
  drop constraint if exists coop_lobby_members_authority_class_key_check;
alter table public.coop_lobby_members
  add constraint coop_lobby_members_authority_class_key_check
  check (authority_class_key in ('warrior', 'mage', 'archer'));

alter table private.coop_authority_actors
  drop constraint if exists coop_authority_actors_class_key_check;
alter table private.coop_authority_actors
  add constraint coop_authority_actors_class_key_check
  check (class_key in ('warrior', 'mage', 'archer'));

create or replace function private.bootstrap_coop_authority_run(
  p_lobby_id uuid,
  p_run_attempt integer,
  p_run_seed bigint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lobby public.coop_lobbies%rowtype;
  v_member_count integer;
  v_existing private.coop_authority_runs%rowtype;
  v_encounter_id uuid;
begin
  select lobby.* into v_lobby
  from public.coop_lobbies as lobby
  where lobby.id = p_lobby_id
  for update;

  if v_lobby.id is null
     or v_lobby.status <> 'in_run'
     or v_lobby.run_attempt <> p_run_attempt
     or v_lobby.run_seed <> p_run_seed then
    raise exception 'exact active coop run required';
  end if;

  select count(*) into v_member_count
  from public.coop_lobby_members as member
  where member.lobby_id = v_lobby.id
    and member.left_at is null
    and member.ready
    and member.authority_class_key in ('warrior', 'mage', 'archer')
    and member.authority_loadout_key = 'canonical-base-v1';

  if v_member_count <> 2 then
    raise exception 'two trusted ready authority members required';
  end if;

  select authority_run.* into v_existing
  from private.coop_authority_runs as authority_run
  where authority_run.lobby_id = v_lobby.id
    and authority_run.run_attempt = v_lobby.run_attempt
  for update;

  if v_existing.lobby_id is not null then
    if v_existing.run_seed <> v_lobby.run_seed
       or v_existing.chapter <> 1
       or v_existing.room <> 1
       or v_existing.state_version <> 0
       or v_existing.status <> 'awaiting_canonical_state' then
      raise exception 'authority bootstrap conflict';
    end if;
    return v_existing.encounter_id;
  end if;

  update private.coop_authority_runs as prior
  set status = 'invalidated',
      updated_at = clock_timestamp()
  where prior.lobby_id = v_lobby.id
    and prior.run_attempt <> v_lobby.run_attempt
    and prior.status in ('awaiting_canonical_state', 'active');

  insert into private.coop_authority_runs (
    lobby_id, run_attempt, run_seed, chapter, room,
    state_version, authority_version, status
  ) values (
    v_lobby.id, v_lobby.run_attempt, v_lobby.run_seed, 1, 1,
    0, 'duo-authority-bootstrap-v1', 'awaiting_canonical_state'
  )
  returning encounter_id into v_encounter_id;

  insert into private.coop_authority_actors (
    lobby_id, run_attempt, user_id, role, actor_slot, class_key, loadout_key
  )
  select v_lobby.id,
         v_lobby.run_attempt,
         member.user_id,
         member.role,
         (row_number() over (
           order by case when member.role = 'host' then 0 else 1 end, member.joined_at, member.user_id
         ) - 1)::smallint,
         member.authority_class_key,
         member.authority_loadout_key
  from public.coop_lobby_members as member
  where member.lobby_id = v_lobby.id
    and member.left_at is null
    and member.ready;

  if (select count(*) from private.coop_authority_actors as actor
      where actor.lobby_id = v_lobby.id and actor.run_attempt = v_lobby.run_attempt) <> 2 then
    raise exception 'authority actor snapshot failed';
  end if;

  return v_encounter_id;
end;
$$;

revoke all on function private.bootstrap_coop_authority_run(uuid, integer, bigint)
  from public, anon, authenticated, service_role;

create table private.coop_authority_build_catalog (
  option_id text primary key,
  max_rank smallint not null check (max_rank between 1 and 3),
  attack_flat_by_rank integer[] not null default array[0,0,0],
  max_hp_flat_by_rank integer[] not null default array[0,0,0],
  speed_flat_by_rank integer[] not null default array[0,0,0],
  defense_flat_by_rank integer[] not null default array[0,0,0],
  attack_cooldown_bps_by_rank integer[] not null default array[10000,10000,10000],
  catalog_version text not null default 'duo-build-catalog-v1',
  check (cardinality(attack_flat_by_rank) = 3),
  check (cardinality(max_hp_flat_by_rank) = 3),
  check (cardinality(speed_flat_by_rank) = 3),
  check (cardinality(defense_flat_by_rank) = 3),
  check (cardinality(attack_cooldown_bps_by_rank) = 3)
);

insert into private.coop_authority_build_catalog (
  option_id, max_rank, attack_flat_by_rank, max_hp_flat_by_rank,
  speed_flat_by_rank, defense_flat_by_rank, attack_cooldown_bps_by_rank
) values
  ('attack', 3, array[2,4,6], array[0,0,0], array[0,0,0], array[0,0,0], array[10000,10000,10000]),
  ('maxHp', 3, array[0,0,0], array[20,45,75], array[0,0,0], array[0,0,0], array[10000,10000,10000]),
  ('speed', 3, array[0,0,0], array[0,0,0], array[12,22,30], array[0,0,0], array[10000,10000,10000]),
  ('defense', 3, array[0,0,0], array[0,0,0], array[0,0,0], array[1,3,5], array[10000,10000,10000]),
  ('attackSpeed', 3, array[0,0,0], array[0,0,0], array[0,0,0], array[0,0,0], array[8400,7000,5800]),
  ('multishot', 3, array[0,0,0], array[0,0,0], array[0,0,0], array[0,0,0], array[10000,10000,10000]),
  ('ricochet', 3, array[0,0,0], array[0,0,0], array[0,0,0], array[0,0,0], array[10000,10000,10000]),
  ('fireArrow', 3, array[0,0,0], array[0,0,0], array[0,0,0], array[0,0,0], array[10000,10000,10000]),
  ('iceArrow', 3, array[0,0,0], array[0,0,0], array[0,0,0], array[0,0,0], array[10000,10000,10000]),
  ('piercing', 3, array[0,0,0], array[0,0,0], array[0,0,0], array[0,0,0], array[10000,10000,10000])
on conflict (option_id) do update set
  max_rank = excluded.max_rank,
  attack_flat_by_rank = excluded.attack_flat_by_rank,
  max_hp_flat_by_rank = excluded.max_hp_flat_by_rank,
  speed_flat_by_rank = excluded.speed_flat_by_rank,
  defense_flat_by_rank = excluded.defense_flat_by_rank,
  attack_cooldown_bps_by_rank = excluded.attack_cooldown_bps_by_rank,
  catalog_version = excluded.catalog_version;

create or replace function private.canonical_duo_build_snapshot(
  p_class_key text,
  p_skill_ranks jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_base_attack integer;
  v_base_hp integer;
  v_base_defense integer;
  v_base_speed integer;
  v_attack_range integer;
  v_skill_range integer;
  v_base_attack_cooldown integer;
  v_skill_cooldown integer;
  v_attack_rank integer := greatest(0, least(3, coalesce((p_skill_ranks ->> 'attack')::integer, 0)));
  v_hp_rank integer := greatest(0, least(3, coalesce((p_skill_ranks ->> 'maxHp')::integer, 0)));
  v_speed_rank integer := greatest(0, least(3, coalesce((p_skill_ranks ->> 'speed')::integer, 0)));
  v_defense_rank integer := greatest(0, least(3, coalesce((p_skill_ranks ->> 'defense')::integer, 0)));
  v_attack_speed_rank integer := greatest(0, least(3, coalesce((p_skill_ranks ->> 'attackSpeed')::integer, 0)));
  v_attack_gains integer[] := array[0,2,4,6];
  v_hp_gains integer[] := array[0,20,45,75];
  v_speed_gains integer[] := array[0,12,22,30];
  v_defense_gains integer[] := array[0,1,3,5];
  v_cooldown_bps integer[] := array[10000,8400,7000,5800];
begin
  if p_skill_ranks is null or jsonb_typeof(p_skill_ranks) <> 'object' then
    raise exception 'server skill rank object required';
  end if;
  case p_class_key
    when 'warrior' then
      v_base_attack := 12; v_base_hp := 140; v_base_defense := 8; v_base_speed := 118;
      v_attack_range := 65; v_skill_range := 130; v_base_attack_cooldown := 350; v_skill_cooldown := 6000;
    when 'mage' then
      v_base_attack := 20; v_base_hp := 85; v_base_defense := 2; v_base_speed := 130;
      v_attack_range := 55; v_skill_range := 175; v_base_attack_cooldown := 550; v_skill_cooldown := 4000;
    when 'archer' then
      v_base_attack := 10; v_base_hp := 100; v_base_defense := 4; v_base_speed := 218;
      v_attack_range := 105; v_skill_range := 95; v_base_attack_cooldown := 270; v_skill_cooldown := 3000;
    else raise exception 'unsupported canonical class';
  end case;
  return jsonb_build_object(
    'profileVersion', 'duo-profile-v1',
    'catalogVersion', 'duo-build-catalog-v1',
    'classKey', p_class_key,
    'loadoutKey', 'canonical-base-v1',
    'skillRanks', p_skill_ranks,
    'maxHp', v_base_hp + v_hp_gains[v_hp_rank + 1],
    'attack', v_base_attack + v_attack_gains[v_attack_rank + 1],
    'defense', v_base_defense + v_defense_gains[v_defense_rank + 1],
    'speed', v_base_speed + v_speed_gains[v_speed_rank + 1],
    'attackRange', v_attack_range,
    'skillRange', v_skill_range,
    'attackCooldownMs', greatest(125, round(v_base_attack_cooldown * v_cooldown_bps[v_attack_speed_rank + 1] / 10000.0)),
    'skillCooldownMs', v_skill_cooldown
  );
end;
$$;

create table private.coop_authority_build_profiles (
  lobby_id uuid not null,
  run_attempt integer not null,
  user_id uuid not null,
  profile_version text not null default 'duo-profile-v1',
  catalog_version text not null default 'duo-build-catalog-v1',
  class_key text not null check (class_key in ('warrior', 'mage', 'archer')),
  loadout_key text not null default 'canonical-base-v1' check (loadout_key = 'canonical-base-v1'),
  build_revision bigint not null default 0 check (build_revision >= 0),
  choice_ordinal integer not null default 0 check (choice_ordinal >= 0),
  skill_ranks jsonb not null default '{}'::jsonb check (jsonb_typeof(skill_ranks) = 'object'),
  derived_snapshot jsonb not null check (jsonb_typeof(derived_snapshot) = 'object'),
  build_digest text not null check (build_digest ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (lobby_id, run_attempt, user_id),
  foreign key (lobby_id, run_attempt, user_id)
    references private.coop_authority_actors(lobby_id, run_attempt, user_id) on delete cascade
);

create table private.coop_authority_choice_offers (
  offer_id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null,
  run_attempt integer not null,
  user_id uuid not null,
  choice_ordinal integer not null check (choice_ordinal >= 1),
  progression_key text not null check (progression_key ~ '^[a-z0-9][a-z0-9:_-]{0,95}$'),
  catalog_version text not null check (catalog_version = 'duo-build-catalog-v1'),
  offered_options text[] not null check (cardinality(offered_options) = 3),
  offer_digest text not null check (offer_digest ~ '^[0-9a-f]{64}$'),
  selected_option text,
  selected_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  unique (lobby_id, run_attempt, user_id, choice_ordinal),
  unique (lobby_id, run_attempt, user_id, progression_key),
  foreign key (lobby_id, run_attempt, user_id)
    references private.coop_authority_build_profiles(lobby_id, run_attempt, user_id) on delete cascade,
  check ((selected_option is null) = (selected_at is null)),
  check (selected_option is null or selected_option = any(offered_options))
);

alter table private.coop_authority_build_catalog enable row level security;
alter table private.coop_authority_build_catalog force row level security;
alter table private.coop_authority_build_profiles enable row level security;
alter table private.coop_authority_build_profiles force row level security;
alter table private.coop_authority_choice_offers enable row level security;
alter table private.coop_authority_choice_offers force row level security;

revoke all on table private.coop_authority_build_catalog from public, anon, authenticated, service_role;
revoke all on table private.coop_authority_build_profiles from public, anon, authenticated, service_role;
revoke all on table private.coop_authority_choice_offers from public, anon, authenticated, service_role;

create or replace function private.seed_coop_authority_build_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_snapshot jsonb;
begin
  v_snapshot := private.canonical_duo_build_snapshot(new.class_key, '{}'::jsonb);
  insert into private.coop_authority_build_profiles (
    lobby_id, run_attempt, user_id, class_key, loadout_key,
    skill_ranks, derived_snapshot, build_digest
  ) values (
    new.lobby_id, new.run_attempt, new.user_id, new.class_key, new.loadout_key,
    '{}'::jsonb, v_snapshot, encode(extensions.digest(v_snapshot::text, 'sha256'), 'hex')
  ) on conflict (lobby_id, run_attempt, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists seed_coop_authority_build_profile on private.coop_authority_actors;
create trigger seed_coop_authority_build_profile
after insert on private.coop_authority_actors
for each row execute function private.seed_coop_authority_build_profile();

insert into private.coop_authority_build_profiles (
  lobby_id, run_attempt, user_id, class_key, loadout_key,
  skill_ranks, derived_snapshot, build_digest
)
select actor.lobby_id, actor.run_attempt, actor.user_id, actor.class_key, actor.loadout_key,
       '{}'::jsonb,
       private.canonical_duo_build_snapshot(actor.class_key, '{}'::jsonb),
       encode(extensions.digest(private.canonical_duo_build_snapshot(actor.class_key, '{}'::jsonb)::text, 'sha256'), 'hex')
from private.coop_authority_actors as actor
on conflict (lobby_id, run_attempt, user_id) do nothing;

create or replace function public.set_my_coop_authority_class(p_class_key text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_lobby public.coop_lobbies%rowtype;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_class_key not in ('warrior', 'mage', 'archer') then raise exception 'unsupported canonical class'; end if;

  select lobby.* into v_lobby
  from public.coop_lobbies as lobby
  join public.coop_lobby_members as member on member.lobby_id = lobby.id
  where member.user_id = v_user_id
    and member.left_at is null
    and lobby.status in ('waiting', 'ready')
    and lobby.started_at is null
    and lobby.expires_at > clock_timestamp()
  order by lobby.updated_at desc
  limit 1
  for update of lobby;

  if v_lobby.id is null then raise exception 'mutable pre-run lobby required'; end if;
  update public.coop_lobby_members
  set authority_class_key = p_class_key
  where lobby_id = v_lobby.id and user_id = v_user_id and left_at is null;
  if not found then raise exception 'active coop membership required'; end if;
  return p_class_key;
end;
$$;
revoke all on function public.set_my_coop_authority_class(text) from public, anon, service_role;
grant execute on function public.set_my_coop_authority_class(text) to authenticated;

create or replace function public.issue_coop_authority_upgrade_offer(
  p_lobby_id uuid,
  p_run_attempt integer,
  p_actor_user_id uuid,
  p_progression_key text
)
returns table (
  offer_id uuid,
  choice_ordinal integer,
  catalog_version text,
  offered_options text[],
  offer_digest text,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run private.coop_authority_runs%rowtype;
  v_profile private.coop_authority_build_profiles%rowtype;
  v_existing private.coop_authority_choice_offers%rowtype;
  v_options text[];
  v_offer_id uuid;
  v_ordinal integer;
  v_digest text;
begin
  if p_progression_key is null or p_progression_key !~ '^[a-z0-9][a-z0-9:_-]{0,95}$' then
    raise exception 'valid server progression key required';
  end if;
  select authority_run.* into v_run
  from private.coop_authority_runs as authority_run
  where authority_run.lobby_id = p_lobby_id
    and authority_run.run_attempt = p_run_attempt
    and authority_run.status in ('awaiting_canonical_state', 'active')
  for update;
  if v_run.lobby_id is null then raise exception 'mutable authority run required'; end if;

  if not exists (
    select 1 from public.coop_lobby_members as member
    where member.lobby_id = p_lobby_id and member.user_id = p_actor_user_id and member.left_at is null
  ) then raise exception 'active authority actor required'; end if;

  select offer.* into v_existing
  from private.coop_authority_choice_offers as offer
  where offer.lobby_id = p_lobby_id and offer.run_attempt = p_run_attempt
    and offer.user_id = p_actor_user_id and offer.progression_key = p_progression_key;
  if v_existing.offer_id is not null then
    return query select v_existing.offer_id, v_existing.choice_ordinal, v_existing.catalog_version,
                        v_existing.offered_options, v_existing.offer_digest, true;
    return;
  end if;

  select profile.* into v_profile
  from private.coop_authority_build_profiles as profile
  where profile.lobby_id = p_lobby_id and profile.run_attempt = p_run_attempt
    and profile.user_id = p_actor_user_id
  for update;
  if v_profile.user_id is null then raise exception 'authority build profile required'; end if;

  v_ordinal := v_profile.choice_ordinal + 1;
  select array_agg(candidate.option_id order by candidate.sort_key)
  into v_options
  from (
    select catalog.option_id,
           encode(extensions.digest(
             v_run.run_seed::text || ':' || p_actor_user_id::text || ':' ||
             p_progression_key || ':' || v_ordinal::text || ':' || catalog.option_id,
             'sha256'
           ), 'hex') as sort_key
    from private.coop_authority_build_catalog as catalog
    where coalesce((v_profile.skill_ranks ->> catalog.option_id)::integer, 0) < catalog.max_rank
      and catalog.catalog_version = v_profile.catalog_version
    order by sort_key
    limit 3
  ) as candidate;

  if coalesce(cardinality(v_options), 0) <> 3 then raise exception 'insufficient authoritative upgrade options'; end if;
  v_offer_id := gen_random_uuid();
  v_digest := encode(extensions.digest(
    jsonb_build_object(
      'offerId', v_offer_id, 'lobbyId', p_lobby_id, 'runAttempt', p_run_attempt,
      'actorId', p_actor_user_id, 'progressionKey', p_progression_key,
      'choiceOrdinal', v_ordinal, 'catalogVersion', v_profile.catalog_version,
      'offeredOptions', to_jsonb(v_options)
    )::text, 'sha256'
  ), 'hex');

  insert into private.coop_authority_choice_offers (
    offer_id, lobby_id, run_attempt, user_id, choice_ordinal,
    progression_key, catalog_version, offered_options, offer_digest
  ) values (
    v_offer_id, p_lobby_id, p_run_attempt, p_actor_user_id, v_ordinal,
    p_progression_key, v_profile.catalog_version, v_options, v_digest
  );

  return query select v_offer_id, v_ordinal, v_profile.catalog_version, v_options, v_digest, false;
end;
$$;
revoke all on function public.issue_coop_authority_upgrade_offer(uuid, integer, uuid, text)
  from public, anon, authenticated;
grant execute on function public.issue_coop_authority_upgrade_offer(uuid, integer, uuid, text)
  to service_role;

create or replace function public.choose_my_coop_authority_upgrade(
  p_lobby_id uuid,
  p_run_attempt integer,
  p_offer_id uuid,
  p_option_id text,
  p_expected_build_revision bigint
)
returns table (
  build_revision bigint,
  choice_ordinal integer,
  derived_snapshot jsonb,
  build_digest text,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_lobby public.coop_lobbies%rowtype;
  v_profile private.coop_authority_build_profiles%rowtype;
  v_offer private.coop_authority_choice_offers%rowtype;
  v_catalog private.coop_authority_build_catalog%rowtype;
  v_current_rank integer;
  v_next_ranks jsonb;
  v_snapshot jsonb;
  v_digest text;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_expected_build_revision is null or p_expected_build_revision < 0 then
    raise exception 'valid expected build revision required';
  end if;

  select lobby.* into v_lobby
  from public.coop_lobbies as lobby
  where lobby.id = p_lobby_id and lobby.run_attempt = p_run_attempt
    and lobby.status = 'in_run' and lobby.expires_at > clock_timestamp()
  for update;
  if v_lobby.id is null then raise exception 'exact active coop attempt required'; end if;

  if not exists (
    select 1 from public.coop_lobby_members as member
    where member.lobby_id = p_lobby_id and member.user_id = v_user_id and member.left_at is null
  ) then raise exception 'active coop membership required'; end if;

  select profile.* into v_profile
  from private.coop_authority_build_profiles as profile
  where profile.lobby_id = p_lobby_id and profile.run_attempt = p_run_attempt
    and profile.user_id = v_user_id
  for update;
  if v_profile.user_id is null then raise exception 'authority build profile required'; end if;

  select offer.* into v_offer
  from private.coop_authority_choice_offers as offer
  where offer.offer_id = p_offer_id and offer.lobby_id = p_lobby_id
    and offer.run_attempt = p_run_attempt and offer.user_id = v_user_id
  for update;
  if v_offer.offer_id is null then raise exception 'actor-bound authority offer required'; end if;

  if v_offer.selected_option is not null then
    if v_offer.selected_option = p_option_id
       and v_profile.build_revision = p_expected_build_revision + 1
       and v_profile.choice_ordinal = v_offer.choice_ordinal then
      return query select v_profile.build_revision, v_profile.choice_ordinal,
                          v_profile.derived_snapshot, v_profile.build_digest, true;
      return;
    end if;
    raise exception 'authority choice replay conflict';
  end if;

  if v_profile.build_revision <> p_expected_build_revision then
    raise exception 'authority build revision conflict';
  end if;
  if v_offer.choice_ordinal <> v_profile.choice_ordinal + 1 then
    raise exception 'authority choice ordinal conflict';
  end if;
  if not (p_option_id = any(v_offer.offered_options)) then
    raise exception 'option was not authoritatively offered';
  end if;
  if v_offer.catalog_version <> v_profile.catalog_version then
    raise exception 'authority catalog version conflict';
  end if;

  select catalog.* into v_catalog
  from private.coop_authority_build_catalog as catalog
  where catalog.option_id = p_option_id and catalog.catalog_version = v_profile.catalog_version;
  if v_catalog.option_id is null then raise exception 'canonical upgrade option required'; end if;
  v_current_rank := coalesce((v_profile.skill_ranks ->> p_option_id)::integer, 0);
  if v_current_rank >= v_catalog.max_rank then raise exception 'canonical upgrade already maxed'; end if;

  v_next_ranks := jsonb_set(v_profile.skill_ranks, array[p_option_id], to_jsonb(v_current_rank + 1), true);
  v_snapshot := private.canonical_duo_build_snapshot(v_profile.class_key, v_next_ranks);
  v_digest := encode(extensions.digest(v_snapshot::text, 'sha256'), 'hex');

  update private.coop_authority_build_profiles as profile
  set build_revision = profile.build_revision + 1,
      choice_ordinal = v_offer.choice_ordinal,
      skill_ranks = v_next_ranks,
      derived_snapshot = v_snapshot,
      build_digest = v_digest,
      updated_at = clock_timestamp()
  where profile.lobby_id = p_lobby_id
    and profile.run_attempt = p_run_attempt
    and profile.user_id = v_user_id;

  update private.coop_authority_choice_offers as offer
  set selected_option = p_option_id, selected_at = clock_timestamp()
  where offer.offer_id = p_offer_id;

  return query select v_profile.build_revision + 1, v_offer.choice_ordinal, v_snapshot, v_digest, false;
end;
$$;
revoke all on function public.choose_my_coop_authority_upgrade(uuid, integer, uuid, text, bigint)
  from public, anon, service_role;
grant execute on function public.choose_my_coop_authority_upgrade(uuid, integer, uuid, text, bigint)
  to authenticated;

create or replace function public.read_my_coop_authority_build(
  p_lobby_id uuid,
  p_run_attempt integer
)
returns table (
  profile_version text,
  catalog_version text,
  class_key text,
  loadout_key text,
  build_revision bigint,
  choice_ordinal integer,
  skill_ranks jsonb,
  derived_snapshot jsonb,
  build_digest text,
  pending_offer jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if not exists (
    select 1 from public.coop_lobby_members as member
    join public.coop_lobbies as lobby on lobby.id = member.lobby_id
    where member.lobby_id = p_lobby_id and member.user_id = v_user_id
      and member.left_at is null and lobby.run_attempt = p_run_attempt and lobby.status = 'in_run'
  ) then raise exception 'exact active coop membership required'; end if;

  return query
  select profile.profile_version, profile.catalog_version, profile.class_key, profile.loadout_key,
         profile.build_revision, profile.choice_ordinal, profile.skill_ranks,
         profile.derived_snapshot, profile.build_digest,
         (
           select jsonb_build_object(
             'offerId', offer.offer_id, 'choiceOrdinal', offer.choice_ordinal,
             'progressionKey', offer.progression_key, 'catalogVersion', offer.catalog_version,
             'offeredOptions', to_jsonb(offer.offered_options), 'offerDigest', offer.offer_digest
           )
           from private.coop_authority_choice_offers as offer
           where offer.lobby_id = profile.lobby_id and offer.run_attempt = profile.run_attempt
             and offer.user_id = profile.user_id and offer.selected_option is null
           order by offer.choice_ordinal
           limit 1
         )
  from private.coop_authority_build_profiles as profile
  where profile.lobby_id = p_lobby_id and profile.run_attempt = p_run_attempt
    and profile.user_id = v_user_id;
end;
$$;
revoke all on function public.read_my_coop_authority_build(uuid, integer)
  from public, anon, service_role;
grant execute on function public.read_my_coop_authority_build(uuid, integer)
  to authenticated;

comment on table private.coop_authority_build_profiles is
  'Server-owned Duo-only build provenance. Never seed from game_saves, profile public_stats, checkpoints, Realtime or browser memory.';
comment on function public.issue_coop_authority_upgrade_offer(uuid, integer, uuid, text) is
  'Service-role-only deterministic offer issuance bound to run seed, actor, progression key and monotonic choice ordinal.';
comment on function public.choose_my_coop_authority_upgrade(uuid, integer, uuid, text, bigint) is
  'Authenticated narrow choice endpoint. The caller selects only one server-issued option ID and cannot submit ranks, stats, ownership or derived combat state.';
