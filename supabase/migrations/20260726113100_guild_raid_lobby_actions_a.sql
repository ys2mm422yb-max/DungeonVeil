begin;

create or replace function private.guild_raid_existing_response(p_idempotency_key uuid, p_user_id uuid, p_event_type text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select event.payload -> 'response'
  from public.guild_raid_lobby_events event
  where event.idempotency_key = p_idempotency_key
    and event.actor_user_id = p_user_id
    and event.event_type = p_event_type;
$$;

create or replace function private.guild_raid_record_event(
  p_lobby_id uuid,
  p_user_id uuid,
  p_event_type text,
  p_idempotency_key uuid,
  p_response jsonb,
  p_details jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version bigint;
begin
  select lobby.version into v_version from public.guild_raid_lobbies lobby where lobby.id = p_lobby_id;
  insert into public.guild_raid_lobby_events (
    lobby_id, actor_user_id, event_type, idempotency_key, lobby_version, payload
  ) values (
    p_lobby_id, p_user_id, p_event_type, p_idempotency_key, v_version,
    jsonb_build_object('response', p_response, 'details', coalesce(p_details, '{}'::jsonb))
  );
  return p_response;
end;
$$;

revoke all on function private.guild_raid_existing_response(uuid, uuid, text) from public, anon, authenticated;
revoke all on function private.guild_raid_record_event(uuid, uuid, text, uuid, jsonb, jsonb) from public, anon, authenticated;

create or replace function public.guild_raid_create_lobby(p_idempotency_key uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_lobby_id uuid;
  v_response jsonb;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_idempotency_key is null then raise exception 'idempotency key required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 9101));

  v_response := private.guild_raid_existing_response(p_idempotency_key, v_user_id, 'lobby_created');
  if v_response is not null then return v_response; end if;

  select member.guild_id into v_guild_id
  from public.guild_members member
  where member.user_id = v_user_id
  order by member.joined_at
  limit 1;
  if v_guild_id is null then raise exception 'active guild membership required'; end if;

  if exists (
    select 1 from public.guild_raid_participants participant
    join public.guild_raid_runs run on run.id = participant.raid_run_id
    where participant.user_id = v_user_id and run.status in ('created', 'active')
  ) then raise exception 'already assigned to an active guild raid'; end if;

  select member.lobby_id into v_lobby_id
  from public.guild_raid_lobby_members member
  join public.guild_raid_lobbies lobby on lobby.id = member.lobby_id
  where member.user_id = v_user_id
    and member.status in ('joined', 'ready')
    and lobby.status in ('forming', 'ready', 'starting')
  order by lobby.updated_at desc
  limit 1;

  if v_lobby_id is null then
    insert into public.guild_raid_lobbies (guild_id, leader_user_id)
    values (v_guild_id, v_user_id)
    returning id into v_lobby_id;

    insert into public.guild_raid_lobby_members (
      lobby_id, user_id, slot, status, ready, invited_by, joined_at
    ) values (
      v_lobby_id, v_user_id, 1, 'joined', false, v_user_id, clock_timestamp()
    );
  end if;

  v_response := private.guild_raid_build_snapshot(v_lobby_id, v_user_id);
  return private.guild_raid_record_event(v_lobby_id, v_user_id, 'lobby_created', p_idempotency_key, v_response);
end;
$$;

create or replace function public.guild_raid_invite_member(
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
  v_response jsonb;
  v_count integer;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_lobby_id is null or p_target_user_id is null or p_idempotency_key is null then raise exception 'lobby, target and idempotency key required'; end if;
  if p_target_user_id = v_user_id then raise exception 'leader is already in the lobby'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 9102));

  v_response := private.guild_raid_existing_response(p_idempotency_key, v_user_id, 'member_invited');
  if v_response is not null then return v_response; end if;

  select * into v_lobby from public.guild_raid_lobbies lobby where lobby.id = p_lobby_id for update;
  if v_lobby.id is null then raise exception 'raid lobby not found'; end if;
  if v_lobby.leader_user_id <> v_user_id then raise exception 'raid leader required'; end if;
  if v_lobby.status not in ('forming', 'ready') or v_lobby.expires_at <= clock_timestamp() then raise exception 'raid lobby is not accepting invitations'; end if;

  if not exists (
    select 1 from public.guild_members member
    where member.guild_id = v_lobby.guild_id and member.user_id = p_target_user_id
  ) then raise exception 'target must be an active member of the same guild'; end if;

  if exists (
    select 1 from public.guild_raid_participants participant
    join public.guild_raid_runs run on run.id = participant.raid_run_id
    where participant.user_id = p_target_user_id and run.status in ('created', 'active')
  ) then raise exception 'target is already assigned to an active guild raid'; end if;

  if exists (
    select 1 from public.guild_raid_lobby_members member
    join public.guild_raid_lobbies lobby on lobby.id = member.lobby_id
    where member.user_id = p_target_user_id
      and member.status in ('joined', 'ready')
      and lobby.status in ('forming', 'ready', 'starting')
      and member.lobby_id <> p_lobby_id
  ) then raise exception 'target is already in another raid lobby'; end if;

  select count(*)::integer into v_count
  from public.guild_raid_lobby_members member
  where member.lobby_id = p_lobby_id and member.status in ('joined', 'ready');
  if v_count >= 4 and not exists (
    select 1 from public.guild_raid_lobby_members member
    where member.lobby_id = p_lobby_id and member.user_id = p_target_user_id and member.status in ('joined', 'ready')
  ) then raise exception 'raid lobby is full'; end if;

  insert into public.guild_raid_invitations (
    lobby_id, guild_id, target_user_id, invited_by, status, expires_at, updated_at
  ) values (
    p_lobby_id, v_lobby.guild_id, p_target_user_id, v_user_id, 'pending', clock_timestamp() + interval '30 minutes', clock_timestamp()
  )
  on conflict on constraint guild_raid_invitations_lobby_id_target_user_id_key do update
    set invited_by = excluded.invited_by,
        status = 'pending',
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at;

  update public.guild_raid_lobbies lobby
  set version = lobby.version + 1, updated_at = clock_timestamp(), status = 'forming'
  where lobby.id = p_lobby_id;

  v_response := private.guild_raid_build_snapshot(p_lobby_id, v_user_id);
  return private.guild_raid_record_event(p_lobby_id, v_user_id, 'member_invited', p_idempotency_key, v_response, jsonb_build_object('targetUserId', p_target_user_id));
end;
$$;

create or replace function public.guild_raid_cancel_invite(
  p_invitation_id uuid,
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
  v_response jsonb;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_invitation_id is null or p_idempotency_key is null then raise exception 'invitation and idempotency key required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 9103));
  v_response := private.guild_raid_existing_response(p_idempotency_key, v_user_id, 'invite_cancelled');
  if v_response is not null then return v_response; end if;

  select * into v_invitation from public.guild_raid_invitations invitation where invitation.id = p_invitation_id for update;
  if v_invitation.id is null then raise exception 'raid invitation not found'; end if;
  if not exists (
    select 1 from public.guild_raid_lobbies lobby
    where lobby.id = v_invitation.lobby_id and lobby.leader_user_id = v_user_id and lobby.status in ('forming', 'ready')
  ) then raise exception 'raid leader required'; end if;

  update public.guild_raid_invitations invitation
  set status = 'cancelled', updated_at = clock_timestamp()
  where invitation.id = p_invitation_id and invitation.status = 'pending';
  update public.guild_raid_lobbies lobby set version = lobby.version + 1, updated_at = clock_timestamp() where lobby.id = v_invitation.lobby_id;

  v_response := private.guild_raid_build_snapshot(v_invitation.lobby_id, v_user_id);
  return private.guild_raid_record_event(v_invitation.lobby_id, v_user_id, 'invite_cancelled', p_idempotency_key, v_response, jsonb_build_object('invitationId', p_invitation_id));
end;
$$;

commit;
