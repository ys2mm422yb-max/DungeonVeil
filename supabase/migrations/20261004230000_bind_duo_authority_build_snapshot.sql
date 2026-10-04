-- Bind server-owned Duo build provenance into canonical authority actor construction.
-- Repo-only until the complete #461 rollout is independently authorized.

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
      v_base_attack := 12; v_base_hp := 150; v_base_defense := 8; v_base_speed := 118;
      v_attack_range := 65; v_skill_range := 130; v_base_attack_cooldown := 350; v_skill_cooldown := 6000;
    when 'mage' then
      v_base_attack := 20; v_base_hp := 80; v_base_defense := 2; v_base_speed := 130;
      v_attack_range := 55; v_skill_range := 175; v_base_attack_cooldown := 550; v_skill_cooldown := 4000;
    when 'archer' then
      v_base_attack := 10; v_base_hp := 100; v_base_defense := 4; v_base_speed := 218;
      v_attack_range := 105; v_skill_range := 95; v_base_attack_cooldown := 270; v_skill_cooldown := 3000;
    else raise exception 'unsupported canonical class';
  end case;
  return jsonb_build_object(
    'profileVersion', 'duo-profile-v1', 'catalogVersion', 'duo-build-catalog-v1',
    'classKey', p_class_key, 'loadoutKey', 'canonical-base-v1', 'skillRanks', p_skill_ranks,
    'maxHp', v_base_hp + v_hp_gains[v_hp_rank + 1],
    'attack', v_base_attack + v_attack_gains[v_attack_rank + 1],
    'defense', v_base_defense + v_defense_gains[v_defense_rank + 1],
    'speed', v_base_speed + v_speed_gains[v_speed_rank + 1],
    'attackRange', v_attack_range, 'skillRange', v_skill_range,
    'attackCooldownMs', greatest(125, round(v_base_attack_cooldown * v_cooldown_bps[v_attack_speed_rank + 1] / 10000.0)),
    'skillCooldownMs', v_skill_cooldown
  );
end;
$$;

update private.coop_authority_build_profiles as profile
set derived_snapshot = private.canonical_duo_build_snapshot(profile.class_key, profile.skill_ranks),
    build_digest = encode(extensions.digest(
      private.canonical_duo_build_snapshot(profile.class_key, profile.skill_ranks)::text,
      'sha256'
    ), 'hex'),
    updated_at = clock_timestamp();

create or replace function public.read_coop_authority_state(
  p_lobby_id uuid,
  p_run_attempt integer
)
returns table (
  lobby_id uuid, run_attempt integer, run_seed bigint, chapter integer, room integer,
  encounter_id uuid, state_version bigint, authority_version text, status text,
  canonical_snapshot jsonb, canonical_snapshot_digest text, actors jsonb, updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select authority_run.lobby_id, authority_run.run_attempt, authority_run.run_seed,
         authority_run.chapter, authority_run.room, authority_run.encounter_id,
         authority_run.state_version, authority_run.authority_version, authority_run.status,
         authority_run.canonical_snapshot, authority_run.canonical_snapshot_digest,
         jsonb_agg(jsonb_build_object(
           'user_id', actor.user_id, 'role', actor.role, 'actor_slot', actor.actor_slot,
           'class_key', actor.class_key, 'loadout_key', actor.loadout_key,
           'last_intent_sequence', actor.last_intent_sequence,
           'build_revision', profile.build_revision, 'build_digest', profile.build_digest,
           'derived_snapshot', profile.derived_snapshot
         ) order by actor.actor_slot),
         authority_run.updated_at
  from public.coop_lobbies as lobby
  join private.coop_authority_runs as authority_run
    on authority_run.lobby_id = lobby.id and authority_run.run_attempt = lobby.run_attempt
  join private.coop_authority_actors as actor
    on actor.lobby_id = authority_run.lobby_id and actor.run_attempt = authority_run.run_attempt
  join private.coop_authority_build_profiles as profile
    on profile.lobby_id = actor.lobby_id and profile.run_attempt = actor.run_attempt
   and profile.user_id = actor.user_id and profile.class_key = actor.class_key
   and profile.loadout_key = actor.loadout_key
   and profile.build_digest = encode(extensions.digest(profile.derived_snapshot::text, 'sha256'), 'hex')
  where lobby.id = p_lobby_id and lobby.status = 'in_run'
    and lobby.run_attempt = p_run_attempt and authority_run.status <> 'invalidated'
  group by authority_run.lobby_id, authority_run.run_attempt, authority_run.run_seed,
           authority_run.chapter, authority_run.room, authority_run.encounter_id,
           authority_run.state_version, authority_run.authority_version, authority_run.status,
           authority_run.canonical_snapshot, authority_run.canonical_snapshot_digest,
           authority_run.updated_at
  having count(actor.user_id) = 2;
end;
$$;

revoke all on function public.read_coop_authority_state(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.read_coop_authority_state(uuid, integer) to service_role;
