begin;

create or replace function public.guild_raid_leave_lobby(
  p_lobby_id uuid,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_lobby public.guild_raid_lobbies%rowtype;
  v_remaining integer;
  v_next_leader uuid;
  v_response jsonb;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_lobby_id is null or p_idempotency_key is null then raise exception 'lobby and idempotency key required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 9107));
  v_response := private.guild_raid_existing_response(p_idempotency_key, v_user_id, 'member_left');
  if v_response is not null then return v_response; end if;

  select * into v_lobby from public.guild_raid_lobbies lobby where lobby.id = p_lobby_id for update;
  if v_lobby.id is null or v_lobby.status not in ('forming', 'ready') then raise exception 'active raid lobby required'; end if;
  if not exists (
    select 1 from public.guild_raid_lobby_members member
    where member.lobby_id = p_lobby_id and member.user_id = v_user_id and member.status in ('joined', 'ready')
  ) then raise exception 'raid lobby membership required'; end if;

  select count(*)::integer into v_remaining
  from public.guild_raid_lobby_members member
  where member.lobby_id = p_lobby_id and member.status in ('joined', 'ready') and member.user_id <> v_user_id;

  if v_lobby.leader_user_id = v_user_id and v_remaining > 0 then
    select member.user_id into v_next_leader
    from public.guild_raid_lobby_members member
    where member.lobby_id = p_lobby_id and member.status in ('joined', 'ready') and member.user_id <> v_user_id
    order by member.slot, member.joined_at, member.user_id
    limit 1;
  end if;

  update public.guild_raid_lobby_members member
  set status = 'left_before_start', slot = null, ready = false, updated_at = clock_timestamp()
  where member.lobby_id = p_lobby_id and member.user_id = v_user_id;

  if v_remaining = 0 then
    update public.guild_raid_lobbies lobby
    set status = 'dissolved', version = lobby.version + 1, updated_at = clock_timestamp()
    where lobby.id = p_lobby_id;
  else
    update public.guild_raid_lobby_members member
    set status = 'joined', ready = false, updated_at = clock_timestamp()
    where member.lobby_id = p_lobby_id and member.status in ('joined', 'ready');
    update public.guild_raid_lobbies lobby
    set leader_user_id = coalesce(v_next_leader, lobby.leader_user_id),
        status = 'forming', version = lobby.version + 1, updated_at = clock_timestamp()
    where lobby.id = p_lobby_id;
  end if;

  v_response := jsonb_build_object(
    'left', true,
    'lobbyId', p_lobby_id,
    'dissolved', v_remaining = 0,
    'newLeaderUserId', v_next_leader,
    'leaderRule', 'lowest_occupied_slot'
  );
  return private.guild_raid_record_event(p_lobby_id, v_user_id, 'member_left', p_idempotency_key, v_response);
end;
$$;

create or replace function public.guild_raid_dissolve_lobby(
  p_lobby_id uuid,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_lobby public.guild_raid_lobbies%rowtype;
  v_response jsonb;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_lobby_id is null or p_idempotency_key is null then raise exception 'lobby and idempotency key required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 9108));
  v_response := private.guild_raid_existing_response(p_idempotency_key, v_user_id, 'lobby_dissolved');
  if v_response is not null then return v_response; end if;

  select * into v_lobby from public.guild_raid_lobbies lobby where lobby.id = p_lobby_id for update;
  if v_lobby.id is null or v_lobby.leader_user_id <> v_user_id or v_lobby.status not in ('forming', 'ready') then raise exception 'active raid leader required'; end if;

  update public.guild_raid_lobby_members member
  set status = 'left_before_start', slot = null, ready = false, updated_at = clock_timestamp()
  where member.lobby_id = p_lobby_id and member.status in ('joined', 'ready');
  update public.guild_raid_invitations invitation set status = 'cancelled', updated_at = clock_timestamp()
  where invitation.lobby_id = p_lobby_id and invitation.status = 'pending';
  update public.guild_raid_lobbies lobby set status = 'dissolved', version = lobby.version + 1, updated_at = clock_timestamp() where lobby.id = p_lobby_id;

  v_response := jsonb_build_object('dissolved', true, 'lobbyId', p_lobby_id);
  return private.guild_raid_record_event(p_lobby_id, v_user_id, 'lobby_dissolved', p_idempotency_key, v_response);
end;
$$;

create or replace function public.guild_raid_start(
  p_lobby_id uuid,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_lobby public.guild_raid_lobbies%rowtype;
  v_run_id uuid;
  v_count integer;
  v_ready boolean;
  v_valid_guild_count integer;
  v_response jsonb;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_lobby_id is null or p_idempotency_key is null then raise exception 'lobby and idempotency key required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 9109));
  v_response := private.guild_raid_existing_response(p_idempotency_key, v_user_id, 'raid_started');
  if v_response is not null then return v_response; end if;

  select * into v_lobby from public.guild_raid_lobbies lobby where lobby.id = p_lobby_id for update;
  if v_lobby.id is null then raise exception 'raid lobby not found'; end if;
  if v_lobby.status = 'started' and v_lobby.raid_run_id is not null then
    if not exists (
      select 1
      from public.guild_raid_lobby_members member
      where member.lobby_id = v_lobby.id
        and member.user_id = v_user_id
        and member.status in ('joined', 'ready', 'active')
    ) then
      raise exception 'raid lobby membership required';
    end if;
    return private.guild_raid_build_snapshot(p_lobby_id, v_user_id);
  end if;
  if v_lobby.leader_user_id <> v_user_id then raise exception 'raid leader required'; end if;
  if v_lobby.status not in ('forming', 'ready') or v_lobby.expires_at <= clock_timestamp() then raise exception 'raid lobby cannot start'; end if;

  select count(*)::integer, coalesce(bool_and(member.ready), false)
  into v_count, v_ready
  from public.guild_raid_lobby_members member
  where member.lobby_id = p_lobby_id and member.status in ('joined', 'ready');
  if v_count <> 4 then raise exception 'exactly four raid members required'; end if;
  if not v_ready then raise exception 'all four raid members must be ready'; end if;

  select count(*)::integer into v_valid_guild_count
  from public.guild_raid_lobby_members member
  join public.guild_members guild_member
    on guild_member.guild_id = v_lobby.guild_id and guild_member.user_id = member.user_id
  where member.lobby_id = p_lobby_id and member.status in ('joined', 'ready');
  if v_valid_guild_count <> 4 then raise exception 'all four players must remain active members of the same guild'; end if;

  if exists (
    select 1
    from public.guild_raid_lobby_members member
    join public.guild_raid_participants participant on participant.user_id = member.user_id
    join public.guild_raid_runs run on run.id = participant.raid_run_id
    where member.lobby_id = p_lobby_id
      and member.status in ('joined', 'ready')
      and run.status in ('created', 'active')
  ) then raise exception 'a raid member is already assigned to an active run'; end if;

  update public.guild_raid_lobbies lobby set status = 'starting', version = lobby.version + 1, updated_at = clock_timestamp() where lobby.id = p_lobby_id;

  insert into public.guild_raid_runs (
    guild_id, lobby_id, status, current_room, room_epoch, state_version, reward_seed
  ) values (
    v_lobby.guild_id, p_lobby_id, 'created', 1, 1, 1,
    (hashtextextended(p_lobby_id::text || ':' || p_idempotency_key::text, 9110) & 9223372036854775807)
  )
  on conflict (lobby_id) do nothing
  returning id into v_run_id;
  if v_run_id is null then select run.id into v_run_id from public.guild_raid_runs run where run.lobby_id = p_lobby_id; end if;

  insert into public.guild_raid_participants (raid_run_id, user_id, slot, status)
  select v_run_id, member.user_id, member.slot, 'active'
  from public.guild_raid_lobby_members member
  where member.lobby_id = p_lobby_id and member.status in ('joined', 'ready')
  on conflict (raid_run_id, user_id) do nothing;

  if (select count(*) from public.guild_raid_participants participant where participant.raid_run_id = v_run_id) <> 4 then
    raise exception 'raid participant freeze failed';
  end if;

  insert into public.guild_raid_room_states (
    raid_run_id, room_number, room_epoch, status, mechanic_state, enemy_state, version
  ) values (
    v_run_id, 1, 1, 'pending', jsonb_build_object('contract', 'block-11-pending'), '{}'::jsonb, 1
  ) on conflict (raid_run_id, room_number, room_epoch) do nothing;

  update public.guild_raid_lobbies lobby
  set status = 'started', raid_run_id = v_run_id, version = lobby.version + 1, updated_at = clock_timestamp(), expires_at = greatest(lobby.expires_at, clock_timestamp() + interval '6 hours')
  where lobby.id = p_lobby_id;

  v_response := private.guild_raid_build_snapshot(p_lobby_id, v_user_id);
  return private.guild_raid_record_event(p_lobby_id, v_user_id, 'raid_started', p_idempotency_key, v_response, jsonb_build_object('raidRunId', v_run_id));
end;
$$;

revoke all on function public.guild_raid_get_snapshot(uuid) from public, anon;
revoke all on function public.guild_raid_list_my_invitations() from public, anon;
revoke all on function public.guild_raid_create_lobby(uuid) from public, anon;
revoke all on function public.guild_raid_invite_member(uuid, uuid, uuid) from public, anon;
revoke all on function public.guild_raid_cancel_invite(uuid, uuid) from public, anon;
revoke all on function public.guild_raid_respond_invite(uuid, boolean, uuid) from public, anon;
revoke all on function public.guild_raid_set_ready(uuid, boolean, uuid) from public, anon;
revoke all on function public.guild_raid_remove_member(uuid, uuid, uuid) from public, anon;
revoke all on function public.guild_raid_leave_lobby(uuid, uuid) from public, anon;
revoke all on function public.guild_raid_dissolve_lobby(uuid, uuid) from public, anon;
revoke all on function public.guild_raid_start(uuid, uuid) from public, anon;

grant execute on function public.guild_raid_get_snapshot(uuid) to authenticated;
grant execute on function public.guild_raid_list_my_invitations() to authenticated;
grant execute on function public.guild_raid_create_lobby(uuid) to authenticated;
grant execute on function public.guild_raid_invite_member(uuid, uuid, uuid) to authenticated;
grant execute on function public.guild_raid_cancel_invite(uuid, uuid) to authenticated;
grant execute on function public.guild_raid_respond_invite(uuid, boolean, uuid) to authenticated;
grant execute on function public.guild_raid_set_ready(uuid, boolean, uuid) to authenticated;
grant execute on function public.guild_raid_remove_member(uuid, uuid, uuid) to authenticated;
grant execute on function public.guild_raid_leave_lobby(uuid, uuid) to authenticated;
grant execute on function public.guild_raid_dissolve_lobby(uuid, uuid) to authenticated;
grant execute on function public.guild_raid_start(uuid, uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'guild_raid_lobbies'
  ) then alter publication supabase_realtime add table public.guild_raid_lobbies; end if;
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'guild_raid_lobby_members'
  ) then alter publication supabase_realtime add table public.guild_raid_lobby_members; end if;
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'guild_raid_invitations'
  ) then alter publication supabase_realtime add table public.guild_raid_invitations; end if;
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'guild_raid_runs'
  ) then alter publication supabase_realtime add table public.guild_raid_runs; end if;
end $$;

comment on table public.guild_raid_lobbies is 'Dedicated four-player same-guild raid lobby. Never reused by the two-player coop system.';
comment on function public.guild_raid_leave_lobby(uuid, uuid) is 'Before raid start, leadership transfers deterministically to the remaining active participant with the lowest occupied slot.';

select pg_notify('pgrst', 'reload schema');

commit;
