create or replace function public.join_coop_lobby(p_invite_code text)
returns table (
  lobby_id uuid,
  invite_code text,
  status text,
  run_seed bigint,
  role text,
  ready boolean,
  host_user_id uuid,
  created_at timestamptz,
  expires_at timestamptz,
  started_at timestamptz,
  server_now timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_code text := upper(regexp_replace(coalesce(p_invite_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_lobby public.coop_lobbies%rowtype;
  v_current_lobby_id uuid;
  v_count integer;
  v_role text;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if char_length(v_code) <> 6 then raise exception 'invalid coop invite code'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 2102));
  perform public.close_expired_coop_lobbies();

  select active_member.lobby_id into v_current_lobby_id
  from public.coop_lobby_members as active_member
  join public.coop_lobbies as active_lobby on active_lobby.id = active_member.lobby_id
  where active_member.user_id = v_user_id
    and active_member.left_at is null
    and active_lobby.status <> 'closed'
    and active_lobby.expires_at > v_now
  order by active_member.joined_at desc
  limit 1;

  select target_lobby.* into v_lobby
  from public.coop_lobbies as target_lobby
  where target_lobby.invite_code = v_code
    and target_lobby.status in ('waiting', 'ready')
    and target_lobby.expires_at > v_now
  for update of target_lobby;

  if v_lobby.id is null then raise exception 'coop lobby not found'; end if;
  if v_current_lobby_id is not null and v_current_lobby_id <> v_lobby.id then
    raise exception 'already in another coop lobby';
  end if;

  select count(*) into v_count
  from public.coop_lobby_members as active_member
  where active_member.lobby_id = v_lobby.id
    and active_member.left_at is null;

  if not exists (
    select 1
    from public.coop_lobby_members as active_member
    where active_member.lobby_id = v_lobby.id
      and active_member.user_id = v_user_id
      and active_member.left_at is null
  ) and v_count >= 2 then
    raise exception 'coop lobby is full';
  end if;

  v_role := case when v_lobby.host_user_id = v_user_id then 'host' else 'guest' end;

  insert into public.coop_lobby_members (
    lobby_id,
    user_id,
    role,
    ready,
    joined_at,
    last_seen_at,
    left_at
  ) values (
    v_lobby.id,
    v_user_id,
    v_role,
    false,
    v_now,
    v_now,
    null
  )
  on conflict on constraint coop_lobby_members_pkey do update
  set role = excluded.role,
      ready = false,
      joined_at = v_now,
      last_seen_at = v_now,
      left_at = null;

  update public.coop_lobbies as target_lobby
  set status = 'waiting',
      updated_at = v_now
  where target_lobby.id = v_lobby.id
  returning target_lobby.* into v_lobby;

  return query
  select v_lobby.id,
         v_lobby.invite_code,
         v_lobby.status,
         v_lobby.run_seed,
         active_member.role,
         active_member.ready,
         v_lobby.host_user_id,
         v_lobby.created_at,
         v_lobby.expires_at,
         v_lobby.started_at,
         v_now
  from public.coop_lobby_members as active_member
  where active_member.lobby_id = v_lobby.id
    and active_member.user_id = v_user_id
    and active_member.left_at is null;
end;
$$;

create or replace function public.set_coop_lobby_ready(p_ready boolean)
returns table (
  lobby_id uuid,
  invite_code text,
  status text,
  run_seed bigint,
  role text,
  ready boolean,
  host_user_id uuid,
  created_at timestamptz,
  expires_at timestamptz,
  started_at timestamptz,
  server_now timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_lobby public.coop_lobbies%rowtype;
  v_member public.coop_lobby_members%rowtype;
  v_count integer;
  v_all_ready boolean;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select active_lobby.* into v_lobby
  from public.coop_lobby_members as active_member
  join public.coop_lobbies as active_lobby on active_lobby.id = active_member.lobby_id
  where active_member.user_id = v_user_id
    and active_member.left_at is null
    and active_lobby.status in ('waiting', 'ready')
    and active_lobby.expires_at > v_now
  order by active_member.joined_at desc
  limit 1
  for update of active_lobby;

  if v_lobby.id is null then raise exception 'active coop lobby required'; end if;

  update public.coop_lobby_members as target_member
  set ready = coalesce(p_ready, false),
      last_seen_at = v_now
  where target_member.lobby_id = v_lobby.id
    and target_member.user_id = v_user_id
    and target_member.left_at is null
  returning target_member.* into v_member;

  select count(*), coalesce(bool_and(active_member.ready), false)
  into v_count, v_all_ready
  from public.coop_lobby_members as active_member
  where active_member.lobby_id = v_lobby.id
    and active_member.left_at is null;

  update public.coop_lobbies as target_lobby
  set status = case when v_count = 2 and v_all_ready then 'ready' else 'waiting' end,
      updated_at = v_now
  where target_lobby.id = v_lobby.id
  returning target_lobby.* into v_lobby;

  return query
  select v_lobby.id,
         v_lobby.invite_code,
         v_lobby.status,
         v_lobby.run_seed,
         v_member.role,
         v_member.ready,
         v_lobby.host_user_id,
         v_lobby.created_at,
         v_lobby.expires_at,
         v_lobby.started_at,
         v_now;
end;
$$;

create or replace function public.start_coop_lobby()
returns table (
  lobby_id uuid,
  invite_code text,
  status text,
  run_seed bigint,
  role text,
  ready boolean,
  host_user_id uuid,
  created_at timestamptz,
  expires_at timestamptz,
  started_at timestamptz,
  server_now timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_lobby public.coop_lobbies%rowtype;
  v_count integer;
  v_all_ready boolean;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select target_lobby.* into v_lobby
  from public.coop_lobbies as target_lobby
  where target_lobby.host_user_id = v_user_id
    and target_lobby.status in ('waiting', 'ready')
    and target_lobby.expires_at > v_now
  order by target_lobby.updated_at desc
  limit 1
  for update of target_lobby;

  if v_lobby.id is null then raise exception 'host coop lobby required'; end if;

  select count(*), coalesce(bool_and(active_member.ready), false)
  into v_count, v_all_ready
  from public.coop_lobby_members as active_member
  where active_member.lobby_id = v_lobby.id
    and active_member.left_at is null;

  if v_count <> 2 then raise exception 'two active coop players required'; end if;
  if not v_all_ready then raise exception 'both coop players must be ready'; end if;

  update public.coop_lobbies as target_lobby
  set status = 'in_run',
      started_at = v_now,
      updated_at = v_now,
      expires_at = greatest(target_lobby.expires_at, v_now + interval '6 hours')
  where target_lobby.id = v_lobby.id
  returning target_lobby.* into v_lobby;

  return query
  select v_lobby.id,
         v_lobby.invite_code,
         v_lobby.status,
         v_lobby.run_seed,
         active_member.role,
         active_member.ready,
         v_lobby.host_user_id,
         v_lobby.created_at,
         v_lobby.expires_at,
         v_lobby.started_at,
         v_now
  from public.coop_lobby_members as active_member
  where active_member.lobby_id = v_lobby.id
    and active_member.user_id = v_user_id
    and active_member.left_at is null;
end;
$$;

revoke all on function public.join_coop_lobby(text) from public, anon;
revoke all on function public.set_coop_lobby_ready(boolean) from public, anon;
revoke all on function public.start_coop_lobby() from public, anon;

grant execute on function public.join_coop_lobby(text) to authenticated;
grant execute on function public.set_coop_lobby_ready(boolean) to authenticated;
grant execute on function public.start_coop_lobby() to authenticated;

select pg_notify('pgrst', 'reload schema');