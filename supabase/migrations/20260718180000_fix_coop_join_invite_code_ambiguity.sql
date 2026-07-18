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

revoke all on function public.join_coop_lobby(text) from public, anon;
grant execute on function public.join_coop_lobby(text) to authenticated;
