begin;

-- Block 11: authoritative synchronized guild raid state and rejoin contract.
-- All mutable gameplay state remains server-owned and versioned.

create table public.guild_raid_player_states (
  raid_run_id uuid not null references public.guild_raid_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  room_number smallint not null check (room_number between 1 and 10),
  room_epoch bigint not null check (room_epoch >= 1),
  position_state jsonb not null default '{}'::jsonb check (jsonb_typeof(position_state) = 'object'),
  combat_state jsonb not null default '{}'::jsonb check (jsonb_typeof(combat_state) = 'object'),
  mechanic_state jsonb not null default '{}'::jsonb check (jsonb_typeof(mechanic_state) = 'object'),
  alive boolean not null default true,
  version bigint not null default 1 check (version >= 1),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (raid_run_id, user_id)
);

create table public.guild_raid_run_events (
  id bigint generated always as identity primary key,
  raid_run_id uuid not null references public.guild_raid_runs(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (char_length(event_type) between 3 and 64),
  idempotency_key uuid not null,
  expected_state_version bigint,
  resulting_state_version bigint not null check (resulting_state_version >= 1),
  response jsonb not null check (jsonb_typeof(response) = 'object'),
  created_at timestamptz not null default clock_timestamp(),
  unique (raid_run_id, idempotency_key)
);

create index guild_raid_run_events_run_idx
  on public.guild_raid_run_events (raid_run_id, id desc);

alter table public.guild_raid_player_states enable row level security;
alter table public.guild_raid_run_events enable row level security;
revoke all on table public.guild_raid_player_states from anon, authenticated;
revoke all on table public.guild_raid_run_events from anon, authenticated;
grant select on table public.guild_raid_player_states to authenticated;

create policy guild_raid_player_states_read_participants
  on public.guild_raid_player_states
  for select to authenticated
  using (private.is_guild_raid_run_participant(raid_run_id));

create or replace function private.guild_raid_assert_active_participant(
  p_raid_run_id uuid,
  p_user_id uuid
)
returns public.guild_raid_runs
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_run public.guild_raid_runs%rowtype;
begin
  select * into v_run
  from public.guild_raid_runs run
  where run.id = p_raid_run_id;

  if v_run.id is null then raise exception 'raid run not found'; end if;
  if v_run.status not in ('created', 'active') then raise exception 'raid run is not mutable'; end if;
  if not exists (
    select 1 from public.guild_raid_participants participant
    where participant.raid_run_id = p_raid_run_id
      and participant.user_id = p_user_id
      and participant.status in ('active', 'disconnected')
  ) then raise exception 'active raid participation required'; end if;
  return v_run;
end;
$$;

create or replace function private.guild_raid_build_run_snapshot(
  p_raid_run_id uuid,
  p_user_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'raidRunId', run.id,
    'guildId', run.guild_id,
    'lobbyId', run.lobby_id,
    'status', run.status,
    'currentRoom', run.current_room,
    'roomEpoch', run.room_epoch,
    'stateVersion', run.state_version,
    'serverNow', clock_timestamp(),
    'startedAt', run.started_at,
    'completedAt', run.completed_at,
    'abandonedAt', run.abandoned_at,
    'viewerUserId', p_user_id,
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'userId', participant.user_id,
        'slot', participant.slot,
        'status', participant.status,
        'lastSeenAt', participant.last_seen_at,
        'disconnectDeadlineAt', participant.disconnect_deadline_at,
        'lastAckStateVersion', participant.last_ack_state_version,
        'contribution', participant.contribution,
        'playerState', case when player.user_id is null then null else jsonb_build_object(
          'roomNumber', player.room_number,
          'roomEpoch', player.room_epoch,
          'positionState', player.position_state,
          'combatState', player.combat_state,
          'mechanicState', player.mechanic_state,
          'alive', player.alive,
          'version', player.version,
          'updatedAt', player.updated_at
        ) end
      ) order by participant.slot)
      from public.guild_raid_participants participant
      left join public.guild_raid_player_states player
        on player.raid_run_id = participant.raid_run_id
       and player.user_id = participant.user_id
      where participant.raid_run_id = run.id
    ), '[]'::jsonb),
    'roomState', (
      select jsonb_build_object(
        'roomNumber', room.room_number,
        'roomEpoch', room.room_epoch,
        'status', room.status,
        'mechanicState', room.mechanic_state,
        'enemyState', room.enemy_state,
        'bossState', room.boss_state,
        'version', room.version,
        'startedAt', room.started_at,
        'clearedAt', room.cleared_at
      )
      from public.guild_raid_room_states room
      where room.raid_run_id = run.id
        and room.room_number = run.current_room
        and room.room_epoch = run.room_epoch
    )
  )
  from public.guild_raid_runs run
  where run.id = p_raid_run_id
    and exists (
      select 1 from public.guild_raid_participants participant
      where participant.raid_run_id = run.id and participant.user_id = p_user_id
    );
$$;

create or replace function public.guild_raid_get_run_snapshot(p_raid_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_snapshot jsonb;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_raid_run_id is null then raise exception 'raid run required'; end if;

  select private.guild_raid_build_run_snapshot(p_raid_run_id, v_user_id) into v_snapshot;
  if v_snapshot is null then raise exception 'raid participation required'; end if;
  return v_snapshot;
end;
$$;

create or replace function public.guild_raid_rejoin(
  p_raid_run_id uuid,
  p_last_ack_state_version bigint default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_run public.guild_raid_runs%rowtype;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_raid_run_id is null then raise exception 'raid run required'; end if;
  if coalesce(p_last_ack_state_version, 0) < 0 then raise exception 'invalid acknowledged state version'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_raid_run_id::text || ':' || v_user_id::text, 9211));
  v_run := private.guild_raid_assert_active_participant(p_raid_run_id, v_user_id);

  update public.guild_raid_participants participant
  set status = 'active',
      last_seen_at = clock_timestamp(),
      disconnect_deadline_at = null,
      last_ack_state_version = greatest(participant.last_ack_state_version, coalesce(p_last_ack_state_version, 0))
  where participant.raid_run_id = p_raid_run_id and participant.user_id = v_user_id;

  update public.guild_raid_runs run
  set status = case when run.status = 'created' then 'active' else run.status end,
      last_server_tick_at = clock_timestamp()
  where run.id = p_raid_run_id;

  return private.guild_raid_build_run_snapshot(p_raid_run_id, v_user_id);
end;
$$;

create or replace function public.guild_raid_mark_disconnected(
  p_raid_run_id uuid,
  p_last_ack_state_version bigint default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  perform private.guild_raid_assert_active_participant(p_raid_run_id, v_user_id);

  update public.guild_raid_participants participant
  set status = 'disconnected',
      last_seen_at = clock_timestamp(),
      disconnect_deadline_at = clock_timestamp() + interval '5 minutes',
      last_ack_state_version = greatest(participant.last_ack_state_version, coalesce(p_last_ack_state_version, 0))
  where participant.raid_run_id = p_raid_run_id and participant.user_id = v_user_id;

  return private.guild_raid_build_run_snapshot(p_raid_run_id, v_user_id);
end;
$$;

create or replace function public.guild_raid_mutate_state(
  p_raid_run_id uuid,
  p_expected_state_version bigint,
  p_idempotency_key uuid,
  p_player_state jsonb default null,
  p_room_mechanic_patch jsonb default null,
  p_enemy_state jsonb default null,
  p_boss_state jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_run public.guild_raid_runs%rowtype;
  v_existing jsonb;
  v_response jsonb;
  v_next_version bigint;
  v_player jsonb := coalesce(p_player_state, '{}'::jsonb);
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_raid_run_id is null or p_idempotency_key is null then raise exception 'raid run and idempotency key required'; end if;
  if p_expected_state_version is null or p_expected_state_version < 1 then raise exception 'expected state version required'; end if;
  if p_player_state is not null and jsonb_typeof(p_player_state) <> 'object' then raise exception 'player state must be an object'; end if;
  if p_room_mechanic_patch is not null and jsonb_typeof(p_room_mechanic_patch) <> 'object' then raise exception 'mechanic patch must be an object'; end if;
  if p_enemy_state is not null and jsonb_typeof(p_enemy_state) <> 'object' then raise exception 'enemy state must be an object'; end if;
  if p_boss_state is not null and jsonb_typeof(p_boss_state) <> 'object' then raise exception 'boss state must be an object'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_raid_run_id::text || ':' || p_idempotency_key::text, 9212));

  select event.response into v_existing
  from public.guild_raid_run_events event
  where event.raid_run_id = p_raid_run_id and event.idempotency_key = p_idempotency_key;
  if v_existing is not null then return v_existing; end if;

  select * into v_run from public.guild_raid_runs run where run.id = p_raid_run_id for update;
  if v_run.id is null then raise exception 'raid run not found'; end if;
  perform private.guild_raid_assert_active_participant(p_raid_run_id, v_user_id);
  if v_run.state_version <> p_expected_state_version then raise exception 'stale raid state version'; end if;

  v_next_version := v_run.state_version + 1;

  insert into public.guild_raid_player_states (
    raid_run_id, user_id, room_number, room_epoch,
    position_state, combat_state, mechanic_state, alive, version, updated_at
  ) values (
    p_raid_run_id, v_user_id, v_run.current_room, v_run.room_epoch,
    coalesce(v_player->'positionState', '{}'::jsonb),
    coalesce(v_player->'combatState', '{}'::jsonb),
    coalesce(v_player->'mechanicState', '{}'::jsonb),
    coalesce((v_player->>'alive')::boolean, true),
    1, clock_timestamp()
  )
  on conflict (raid_run_id, user_id) do update set
    room_number = excluded.room_number,
    room_epoch = excluded.room_epoch,
    position_state = case when p_player_state is null then public.guild_raid_player_states.position_state else excluded.position_state end,
    combat_state = case when p_player_state is null then public.guild_raid_player_states.combat_state else excluded.combat_state end,
    mechanic_state = case when p_player_state is null then public.guild_raid_player_states.mechanic_state else excluded.mechanic_state end,
    alive = case when p_player_state is null then public.guild_raid_player_states.alive else excluded.alive end,
    version = public.guild_raid_player_states.version + 1,
    updated_at = clock_timestamp();

  update public.guild_raid_room_states room
  set mechanic_state = case when p_room_mechanic_patch is null then room.mechanic_state else room.mechanic_state || p_room_mechanic_patch end,
      enemy_state = coalesce(p_enemy_state, room.enemy_state),
      boss_state = case when p_boss_state is null then room.boss_state else p_boss_state end,
      status = case when room.status = 'pending' then 'active' else room.status end,
      started_at = coalesce(room.started_at, clock_timestamp()),
      version = room.version + 1
  where room.raid_run_id = p_raid_run_id
    and room.room_number = v_run.current_room
    and room.room_epoch = v_run.room_epoch;

  update public.guild_raid_participants participant
  set status = 'active', last_seen_at = clock_timestamp(), disconnect_deadline_at = null,
      last_ack_state_version = v_next_version
  where participant.raid_run_id = p_raid_run_id and participant.user_id = v_user_id;

  update public.guild_raid_runs run
  set status = 'active', state_version = v_next_version, last_server_tick_at = clock_timestamp()
  where run.id = p_raid_run_id;

  v_response := private.guild_raid_build_run_snapshot(p_raid_run_id, v_user_id);

  insert into public.guild_raid_run_events (
    raid_run_id, actor_user_id, event_type, idempotency_key,
    expected_state_version, resulting_state_version, response
  ) values (
    p_raid_run_id, v_user_id, 'state_mutated', p_idempotency_key,
    p_expected_state_version, v_next_version, v_response
  );

  return v_response;
end;
$$;

create or replace function public.guild_raid_abort_run(
  p_raid_run_id uuid,
  p_expected_state_version bigint,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_run public.guild_raid_runs%rowtype;
  v_existing jsonb;
  v_response jsonb;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_raid_run_id is null or p_idempotency_key is null then raise exception 'raid run and idempotency key required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_raid_run_id::text || ':' || p_idempotency_key::text, 9213));

  select event.response into v_existing from public.guild_raid_run_events event
  where event.raid_run_id = p_raid_run_id and event.idempotency_key = p_idempotency_key;
  if v_existing is not null then return v_existing; end if;

  select * into v_run from public.guild_raid_runs run where run.id = p_raid_run_id for update;
  if v_run.id is null then raise exception 'raid run not found'; end if;
  if v_run.state_version <> p_expected_state_version then raise exception 'stale raid state version'; end if;
  if not exists (
    select 1 from public.guild_raid_lobbies lobby
    where lobby.id = v_run.lobby_id and lobby.leader_user_id = v_user_id
  ) then raise exception 'raid leader required'; end if;
  if v_run.status not in ('created', 'active') then raise exception 'raid run is not abortable'; end if;

  update public.guild_raid_runs run
  set status = 'abandoned', abandoned_at = clock_timestamp(), state_version = run.state_version + 1,
      last_server_tick_at = clock_timestamp()
  where run.id = p_raid_run_id;

  update public.guild_raid_participants participant
  set status = 'abandoned', disconnect_deadline_at = null, last_seen_at = clock_timestamp()
  where participant.raid_run_id = p_raid_run_id;

  v_response := private.guild_raid_build_run_snapshot(p_raid_run_id, v_user_id);
  insert into public.guild_raid_run_events (
    raid_run_id, actor_user_id, event_type, idempotency_key,
    expected_state_version, resulting_state_version, response
  ) values (
    p_raid_run_id, v_user_id, 'run_abandoned', p_idempotency_key,
    p_expected_state_version, p_expected_state_version + 1, v_response
  );
  return v_response;
end;
$$;

revoke all on function private.guild_raid_assert_active_participant(uuid, uuid) from public, anon, authenticated;
revoke all on function private.guild_raid_build_run_snapshot(uuid, uuid) from public, anon, authenticated;
revoke all on function public.guild_raid_get_run_snapshot(uuid) from public, anon;
revoke all on function public.guild_raid_rejoin(uuid, bigint) from public, anon;
revoke all on function public.guild_raid_mark_disconnected(uuid, bigint) from public, anon;
revoke all on function public.guild_raid_mutate_state(uuid, bigint, uuid, jsonb, jsonb, jsonb, jsonb) from public, anon;
revoke all on function public.guild_raid_abort_run(uuid, bigint, uuid) from public, anon;

grant execute on function public.guild_raid_get_run_snapshot(uuid) to authenticated;
grant execute on function public.guild_raid_rejoin(uuid, bigint) to authenticated;
grant execute on function public.guild_raid_mark_disconnected(uuid, bigint) to authenticated;
grant execute on function public.guild_raid_mutate_state(uuid, bigint, uuid, jsonb, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.guild_raid_abort_run(uuid, bigint, uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'guild_raid_runs'
  ) then alter publication supabase_realtime add table public.guild_raid_runs; end if;
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'guild_raid_participants'
  ) then alter publication supabase_realtime add table public.guild_raid_participants; end if;
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'guild_raid_room_states'
  ) then alter publication supabase_realtime add table public.guild_raid_room_states; end if;
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'guild_raid_player_states'
  ) then alter publication supabase_realtime add table public.guild_raid_player_states; end if;
end
$$;

commit;
