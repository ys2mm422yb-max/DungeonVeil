create or replace function public.create_coop_lobby()
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
#variable_conflict use_column
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_lobby public.coop_lobbies%rowtype;
  v_code text;
  v_attempt integer;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 2101));
  perform public.close_expired_coop_lobbies();

  select lobby.* into v_lobby
  from public.coop_lobby_members as member
  join public.coop_lobbies as lobby on lobby.id = member.lobby_id
  where member.user_id = v_user_id
    and member.left_at is null
    and lobby.status <> 'closed'
    and lobby.expires_at > v_now
  order by member.joined_at desc
  limit 1;

  if v_lobby.id is null then
    for v_attempt in 1..12 loop
      v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      begin
        insert into public.coop_lobbies as lobby (
          invite_code, host_user_id, status, run_seed, created_at, updated_at, expires_at
        ) values (
          v_code, v_user_id, 'waiting', floor(random() * 9007199254740991)::bigint,
          v_now, v_now, v_now + interval '2 hours'
        ) returning lobby.* into v_lobby;
        exit;
      exception when unique_violation then
        v_lobby.id := null;
      end;
    end loop;
    if v_lobby.id is null then raise exception 'could not allocate coop invite code'; end if;

    insert into public.coop_lobby_members as member (
      lobby_id, user_id, role, ready, joined_at, last_seen_at
    ) values (
      v_lobby.id, v_user_id, 'host', false, v_now, v_now
    );
  end if;

  return query
  select v_lobby.id,
         v_lobby.invite_code,
         v_lobby.status,
         v_lobby.run_seed,
         member.role,
         member.ready,
         v_lobby.host_user_id,
         v_lobby.created_at,
         v_lobby.expires_at,
         v_lobby.started_at,
         v_now
  from public.coop_lobby_members as member
  where member.lobby_id = v_lobby.id
    and member.user_id = v_user_id
    and member.left_at is null;
end;
$$;

create or replace function public.get_my_coop_lobby()
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
#variable_conflict use_column
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  perform public.close_expired_coop_lobbies();

  return query
  select lobby.id,
         lobby.invite_code,
         lobby.status,
         lobby.run_seed,
         member.role,
         member.ready,
         lobby.host_user_id,
         lobby.created_at,
         lobby.expires_at,
         lobby.started_at,
         v_now
  from public.coop_lobby_members as member
  join public.coop_lobbies as lobby on lobby.id = member.lobby_id
  where member.user_id = v_user_id
    and member.left_at is null
    and lobby.status <> 'closed'
    and lobby.expires_at > v_now
  order by member.joined_at desc
  limit 1;
end;
$$;

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
#variable_conflict use_column
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

  select member.lobby_id into v_current_lobby_id
  from public.coop_lobby_members as member
  join public.coop_lobbies as lobby on lobby.id = member.lobby_id
  where member.user_id = v_user_id
    and member.left_at is null
    and lobby.status <> 'closed'
    and lobby.expires_at > v_now
  limit 1;

  select lobby.* into v_lobby
  from public.coop_lobbies as lobby
  where lobby.invite_code = v_code
    and lobby.status in ('waiting', 'ready')
    and lobby.expires_at > v_now
  for update of lobby;

  if v_lobby.id is null then raise exception 'coop lobby not found'; end if;
  if v_current_lobby_id is not null and v_current_lobby_id <> v_lobby.id then
    raise exception 'already in another coop lobby';
  end if;

  select count(*) into v_count
  from public.coop_lobby_members as member
  where member.lobby_id = v_lobby.id
    and member.left_at is null;

  if not exists (
    select 1
    from public.coop_lobby_members as member
    where member.lobby_id = v_lobby.id
      and member.user_id = v_user_id
      and member.left_at is null
  ) and v_count >= 2 then
    raise exception 'coop lobby is full';
  end if;

  v_role := case when v_lobby.host_user_id = v_user_id then 'host' else 'guest' end;

  insert into public.coop_lobby_members as member (
    lobby_id, user_id, role, ready, joined_at, last_seen_at, left_at
  ) values (
    v_lobby.id, v_user_id, v_role, false, v_now, v_now, null
  )
  on conflict (lobby_id, user_id) do update
    set role = excluded.role,
        ready = false,
        joined_at = v_now,
        last_seen_at = v_now,
        left_at = null;

  update public.coop_lobbies as lobby
  set status = 'waiting',
      updated_at = v_now
  where lobby.id = v_lobby.id
  returning lobby.* into v_lobby;

  return query
  select v_lobby.id,
         v_lobby.invite_code,
         v_lobby.status,
         v_lobby.run_seed,
         member.role,
         member.ready,
         v_lobby.host_user_id,
         v_lobby.created_at,
         v_lobby.expires_at,
         v_lobby.started_at,
         v_now
  from public.coop_lobby_members as member
  where member.lobby_id = v_lobby.id
    and member.user_id = v_user_id
    and member.left_at is null;
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
#variable_conflict use_column
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_lobby public.coop_lobbies%rowtype;
  v_member public.coop_lobby_members%rowtype;
  v_count integer;
  v_all_ready boolean;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select lobby.* into v_lobby
  from public.coop_lobby_members as member
  join public.coop_lobbies as lobby on lobby.id = member.lobby_id
  where member.user_id = v_user_id
    and member.left_at is null
    and lobby.status in ('waiting', 'ready')
    and lobby.expires_at > v_now
  order by member.joined_at desc
  limit 1
  for update of lobby;

  if v_lobby.id is null then raise exception 'active coop lobby required'; end if;

  update public.coop_lobby_members as member
  set ready = coalesce(p_ready, false),
      last_seen_at = v_now
  where member.lobby_id = v_lobby.id
    and member.user_id = v_user_id
    and member.left_at is null
  returning member.* into v_member;

  select count(*), coalesce(bool_and(member.ready), false)
  into v_count, v_all_ready
  from public.coop_lobby_members as member
  where member.lobby_id = v_lobby.id
    and member.left_at is null;

  update public.coop_lobbies as lobby
  set status = case when v_count = 2 and v_all_ready then 'ready' else 'waiting' end,
      updated_at = v_now
  where lobby.id = v_lobby.id
  returning lobby.* into v_lobby;

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
#variable_conflict use_column
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_lobby public.coop_lobbies%rowtype;
  v_count integer;
  v_all_ready boolean;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select lobby.* into v_lobby
  from public.coop_lobbies as lobby
  where lobby.host_user_id = v_user_id
    and lobby.status in ('waiting', 'ready')
    and lobby.expires_at > v_now
  order by lobby.updated_at desc
  limit 1
  for update of lobby;

  if v_lobby.id is null then raise exception 'host coop lobby required'; end if;

  select count(*), coalesce(bool_and(member.ready), false)
  into v_count, v_all_ready
  from public.coop_lobby_members as member
  where member.lobby_id = v_lobby.id
    and member.left_at is null;

  if v_count <> 2 then raise exception 'two active coop players required'; end if;
  if not v_all_ready then raise exception 'both coop players must be ready'; end if;

  update public.coop_lobbies as lobby
  set status = 'in_run',
      started_at = v_now,
      updated_at = v_now,
      expires_at = greatest(lobby.expires_at, v_now + interval '6 hours')
  where lobby.id = v_lobby.id
  returning lobby.* into v_lobby;

  return query
  select v_lobby.id,
         v_lobby.invite_code,
         v_lobby.status,
         v_lobby.run_seed,
         member.role,
         member.ready,
         v_lobby.host_user_id,
         v_lobby.created_at,
         v_lobby.expires_at,
         v_lobby.started_at,
         v_now
  from public.coop_lobby_members as member
  where member.lobby_id = v_lobby.id
    and member.user_id = v_user_id
    and member.left_at is null;
end;
$$;

revoke all on function public.create_coop_lobby() from public, anon;
revoke all on function public.get_my_coop_lobby() from public, anon;
revoke all on function public.join_coop_lobby(text) from public, anon;
revoke all on function public.set_coop_lobby_ready(boolean) from public, anon;
revoke all on function public.start_coop_lobby() from public, anon;

grant execute on function public.create_coop_lobby() to authenticated;
grant execute on function public.get_my_coop_lobby() to authenticated;
grant execute on function public.join_coop_lobby(text) to authenticated;
grant execute on function public.set_coop_lobby_ready(boolean) to authenticated;
grant execute on function public.start_coop_lobby() to authenticated;