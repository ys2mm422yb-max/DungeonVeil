begin;

create or replace function public.guild_raid_respond_invite(
  p_invitation_id uuid,
  p_accept boolean,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_invitation public.guild_raid_invitations%rowtype;
  v_lobby public.guild_raid_lobbies%rowtype;
  v_slot smallint;
  v_response jsonb;
  v_event text := case when coalesce(p_accept, false) then 'invite_accepted' else 'invite_declined' end;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_invitation_id is null or p_idempotency_key is null then raise exception 'invitation and idempotency key required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 9104));
  v_response := private.guild_raid_existing_response(p_idempotency_key, v_user_id, v_event);
  if v_response is not null then return v_response; end if;

  select * into v_invitation from public.guild_raid_invitations invitation where invitation.id = p_invitation_id for update;
  if v_invitation.id is null or v_invitation.target_user_id <> v_user_id then raise exception 'raid invitation not found'; end if;
  select * into v_lobby from public.guild_raid_lobbies lobby where lobby.id = v_invitation.lobby_id for update;
  if v_lobby.id is null or v_lobby.status not in ('forming', 'ready') then raise exception 'raid lobby is no longer available'; end if;

  if v_invitation.status = 'accepted' and exists (
    select 1 from public.guild_raid_lobby_members member
    where member.lobby_id = v_lobby.id and member.user_id = v_user_id and member.status in ('joined', 'ready')
  ) then return private.guild_raid_build_snapshot(v_lobby.id, v_user_id); end if;

  if v_invitation.status <> 'pending' or v_invitation.expires_at <= clock_timestamp() then
    update public.guild_raid_invitations invitation set status = 'expired', updated_at = clock_timestamp()
    where invitation.id = v_invitation.id and invitation.status = 'pending';
    raise exception 'raid invitation expired';
  end if;

  if not coalesce(p_accept, false) then
    update public.guild_raid_invitations invitation set status = 'declined', updated_at = clock_timestamp() where invitation.id = v_invitation.id;
    update public.guild_raid_lobbies lobby set version = lobby.version + 1, updated_at = clock_timestamp() where lobby.id = v_lobby.id;
    v_response := jsonb_build_object('accepted', false, 'lobbyId', v_lobby.id, 'invitationId', v_invitation.id);
    return private.guild_raid_record_event(v_lobby.id, v_user_id, v_event, p_idempotency_key, v_response);
  end if;

  if not exists (
    select 1 from public.guild_members member where member.guild_id = v_lobby.guild_id and member.user_id = v_user_id
  ) then raise exception 'active membership in the same guild required'; end if;

  if exists (
    select 1 from public.guild_raid_participants participant
    join public.guild_raid_runs run on run.id = participant.raid_run_id
    where participant.user_id = v_user_id and run.status in ('created', 'active')
  ) then raise exception 'already assigned to an active guild raid'; end if;

  if exists (
    select 1 from public.guild_raid_lobby_members member
    join public.guild_raid_lobbies lobby on lobby.id = member.lobby_id
    where member.user_id = v_user_id
      and member.status in ('joined', 'ready')
      and lobby.status in ('forming', 'ready', 'starting')
      and member.lobby_id <> v_lobby.id
  ) then raise exception 'already in another raid lobby'; end if;

  select candidate.slot::smallint into v_slot
  from generate_series(1, 4) candidate(slot)
  where not exists (
    select 1 from public.guild_raid_lobby_members member
    where member.lobby_id = v_lobby.id and member.status in ('joined', 'ready') and member.slot = candidate.slot
  )
  order by candidate.slot
  limit 1;
  if v_slot is null then raise exception 'raid lobby is full'; end if;

  insert into public.guild_raid_lobby_members (
    lobby_id, user_id, slot, status, ready, invited_by, joined_at, updated_at
  ) values (
    v_lobby.id, v_user_id, v_slot, 'joined', false, v_invitation.invited_by, clock_timestamp(), clock_timestamp()
  )
  on conflict on constraint guild_raid_lobby_members_pkey do update
    set slot = excluded.slot,
        status = 'joined',
        ready = false,
        invited_by = excluded.invited_by,
        joined_at = excluded.joined_at,
        updated_at = excluded.updated_at;

  update public.guild_raid_lobby_members member
  set ready = false, status = 'joined', updated_at = clock_timestamp()
  where member.lobby_id = v_lobby.id and member.status in ('joined', 'ready');
  update public.guild_raid_invitations invitation set status = 'accepted', updated_at = clock_timestamp() where invitation.id = v_invitation.id;
  update public.guild_raid_lobbies lobby set status = 'forming', version = lobby.version + 1, updated_at = clock_timestamp() where lobby.id = v_lobby.id;

  v_response := private.guild_raid_build_snapshot(v_lobby.id, v_user_id);
  return private.guild_raid_record_event(v_lobby.id, v_user_id, v_event, p_idempotency_key, v_response, jsonb_build_object('slot', v_slot));
end;
$$;

create or replace function public.guild_raid_set_ready(
  p_lobby_id uuid,
  p_ready boolean,
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
  v_count integer;
  v_all_ready boolean;
  v_response jsonb;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_lobby_id is null or p_idempotency_key is null then raise exception 'lobby and idempotency key required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 9105));
  v_response := private.guild_raid_existing_response(p_idempotency_key, v_user_id, 'ready_changed');
  if v_response is not null then return v_response; end if;

  select * into v_lobby from public.guild_raid_lobbies lobby where lobby.id = p_lobby_id for update;
  if v_lobby.id is null or v_lobby.status not in ('forming', 'ready') or v_lobby.expires_at <= clock_timestamp() then raise exception 'active raid lobby required'; end if;

  update public.guild_raid_lobby_members member
  set ready = coalesce(p_ready, false),
      status = case when coalesce(p_ready, false) then 'ready' else 'joined' end,
      updated_at = clock_timestamp()
  where member.lobby_id = p_lobby_id and member.user_id = v_user_id and member.status in ('joined', 'ready');
  if not found then raise exception 'raid lobby membership required'; end if;

  select count(*)::integer, coalesce(bool_and(member.ready), false)
  into v_count, v_all_ready
  from public.guild_raid_lobby_members member
  where member.lobby_id = p_lobby_id and member.status in ('joined', 'ready');

  update public.guild_raid_lobbies lobby
  set status = case when v_count = 4 and v_all_ready then 'ready' else 'forming' end,
      version = lobby.version + 1,
      updated_at = clock_timestamp()
  where lobby.id = p_lobby_id;

  v_response := private.guild_raid_build_snapshot(p_lobby_id, v_user_id);
  return private.guild_raid_record_event(p_lobby_id, v_user_id, 'ready_changed', p_idempotency_key, v_response, jsonb_build_object('ready', coalesce(p_ready, false)));
end;
$$;

create or replace function public.guild_raid_remove_member(
  p_lobby_id uuid,
  p_target_user_id uuid,
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
  v_target public.guild_raid_lobby_members%rowtype;
  v_response jsonb;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_lobby_id is null or p_target_user_id is null or p_idempotency_key is null then raise exception 'lobby, target and idempotency key required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 9106));
  v_response := private.guild_raid_existing_response(p_idempotency_key, v_user_id, 'member_removed');
  if v_response is not null then return v_response; end if;

  select * into v_lobby from public.guild_raid_lobbies lobby where lobby.id = p_lobby_id for update;
  if v_lobby.id is null or v_lobby.leader_user_id <> v_user_id or v_lobby.status not in ('forming', 'ready') then raise exception 'active raid leader required'; end if;
  if p_target_user_id = v_user_id then raise exception 'leader must leave or dissolve the lobby'; end if;
  select * into v_target from public.guild_raid_lobby_members member
  where member.lobby_id = p_lobby_id and member.user_id = p_target_user_id and member.status in ('joined', 'ready') for update;
  if v_target.user_id is null then raise exception 'active raid member not found'; end if;
  if v_target.ready then raise exception 'ready members cannot be removed'; end if;

  update public.guild_raid_lobby_members member
  set status = 'removed_before_start', slot = null, ready = false, updated_at = clock_timestamp()
  where member.lobby_id = p_lobby_id and member.user_id = p_target_user_id;
  update public.guild_raid_lobby_members member
  set status = 'joined', ready = false, updated_at = clock_timestamp()
  where member.lobby_id = p_lobby_id and member.status in ('joined', 'ready');
  update public.guild_raid_invitations invitation
  set status = 'cancelled', updated_at = clock_timestamp()
  where invitation.lobby_id = p_lobby_id and invitation.target_user_id = p_target_user_id and invitation.status = 'pending';
  update public.guild_raid_lobbies lobby set status = 'forming', version = lobby.version + 1, updated_at = clock_timestamp() where lobby.id = p_lobby_id;

  v_response := private.guild_raid_build_snapshot(p_lobby_id, v_user_id);
  return private.guild_raid_record_event(p_lobby_id, v_user_id, 'member_removed', p_idempotency_key, v_response, jsonb_build_object('targetUserId', p_target_user_id));
end;
$$;

commit;
