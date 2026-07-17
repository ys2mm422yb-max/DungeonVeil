create table if not exists public.coop_lobbies (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null,
  host_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting', 'ready', 'in_run', 'closed')),
  run_seed bigint not null check (run_seed >= 0),
  max_players smallint not null default 2 check (max_players = 2),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default (clock_timestamp() + interval '2 hours'),
  started_at timestamptz,
  closed_at timestamptz,
  constraint coop_lobbies_invite_code_format check (invite_code ~ '^[A-Z0-9]{6}$')
);

create unique index if not exists coop_lobbies_invite_code_uidx
  on public.coop_lobbies (invite_code);
create index if not exists coop_lobbies_host_status_idx
  on public.coop_lobbies (host_user_id, status, updated_at desc);
create index if not exists coop_lobbies_expiry_idx
  on public.coop_lobbies (expires_at)
  where status <> 'closed';

create table if not exists public.coop_lobby_members (
  lobby_id uuid not null references public.coop_lobbies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('host', 'guest')),
  ready boolean not null default false,
  joined_at timestamptz not null default clock_timestamp(),
  last_seen_at timestamptz not null default clock_timestamp(),
  left_at timestamptz,
  primary key (lobby_id, user_id)
);

create unique index if not exists coop_lobby_members_one_active_lobby_uidx
  on public.coop_lobby_members (user_id)
  where left_at is null;
create unique index if not exists coop_lobby_members_one_host_uidx
  on public.coop_lobby_members (lobby_id)
  where role = 'host' and left_at is null;
create index if not exists coop_lobby_members_active_idx
  on public.coop_lobby_members (lobby_id, joined_at)
  where left_at is null;

alter table public.coop_lobbies enable row level security;
alter table public.coop_lobby_members enable row level security;

create or replace function public.is_coop_lobby_member(p_lobby_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_user_id is not null and exists (
    select 1
    from public.coop_lobby_members member
    where member.lobby_id = p_lobby_id
      and member.user_id = p_user_id
      and member.left_at is null
  );
$$;

revoke all on function public.is_coop_lobby_member(uuid, uuid) from public, anon;
grant execute on function public.is_coop_lobby_member(uuid, uuid) to authenticated;

drop policy if exists coop_lobbies_read_members on public.coop_lobbies;
create policy coop_lobbies_read_members
  on public.coop_lobbies
  for select
  to authenticated
  using (public.is_coop_lobby_member(id, (select auth.uid())));

drop policy if exists coop_lobby_members_read_members on public.coop_lobby_members;
create policy coop_lobby_members_read_members
  on public.coop_lobby_members
  for select
  to authenticated
  using (public.is_coop_lobby_member(lobby_id, (select auth.uid())));

revoke all on table public.coop_lobbies from anon, authenticated;
revoke all on table public.coop_lobby_members from anon, authenticated;
grant select on table public.coop_lobbies to authenticated;
grant select on table public.coop_lobby_members to authenticated;

create or replace function public.close_expired_coop_lobbies()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer := 0;
begin
  with expired as (
    update public.coop_lobbies
    set status = 'closed',
        closed_at = coalesce(closed_at, v_now),
        updated_at = v_now
    where status <> 'closed'
      and expires_at <= v_now
    returning id
  )
  update public.coop_lobby_members member
  set left_at = coalesce(member.left_at, v_now),
      last_seen_at = v_now
  where member.lobby_id in (select id from expired)
    and member.left_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.close_expired_coop_lobbies() from public, anon, authenticated;
grant execute on function public.close_expired_coop_lobbies() to service_role;

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
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  perform public.close_expired_coop_lobbies();

  return query
  select lobby.id, lobby.invite_code, lobby.status, lobby.run_seed,
         member.role, member.ready, lobby.host_user_id, lobby.created_at,
         lobby.expires_at, lobby.started_at, v_now
  from public.coop_lobby_members member
  join public.coop_lobbies lobby on lobby.id = member.lobby_id
  where member.user_id = v_user_id
    and member.left_at is null
    and lobby.status <> 'closed'
    and lobby.expires_at > v_now
  order by member.joined_at desc
  limit 1;
end;
$$;

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
  from public.coop_lobby_members member
  join public.coop_lobbies lobby on lobby.id = member.lobby_id
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
        insert into public.coop_lobbies (
          invite_code, host_user_id, status, run_seed, created_at, updated_at, expires_at
        ) values (
          v_code, v_user_id, 'waiting', floor(random() * 9007199254740991)::bigint,
          v_now, v_now, v_now + interval '2 hours'
        ) returning * into v_lobby;
        exit;
      exception when unique_violation then
        v_lobby.id := null;
      end;
    end loop;
    if v_lobby.id is null then raise exception 'could not allocate coop invite code'; end if;

    insert into public.coop_lobby_members (lobby_id, user_id, role, ready, joined_at, last_seen_at)
    values (v_lobby.id, v_user_id, 'host', false, v_now, v_now);
  end if;

  return query
  select v_lobby.id, v_lobby.invite_code, v_lobby.status, v_lobby.run_seed,
         member.role, member.ready, v_lobby.host_user_id, v_lobby.created_at,
         v_lobby.expires_at, v_lobby.started_at, v_now
  from public.coop_lobby_members member
  where member.lobby_id = v_lobby.id
    and member.user_id = v_user_id
    and member.left_at is null;
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
  from public.coop_lobby_members member
  join public.coop_lobbies lobby on lobby.id = member.lobby_id
  where member.user_id = v_user_id
    and member.left_at is null
    and lobby.status <> 'closed'
    and lobby.expires_at > v_now
  limit 1;

  select * into v_lobby
  from public.coop_lobbies
  where invite_code = v_code
    and status in ('waiting', 'ready')
    and expires_at > v_now
  for update;

  if v_lobby.id is null then raise exception 'coop lobby not found'; end if;
  if v_current_lobby_id is not null and v_current_lobby_id <> v_lobby.id then
    raise exception 'already in another coop lobby';
  end if;

  select count(*) into v_count
  from public.coop_lobby_members
  where lobby_id = v_lobby.id and left_at is null;

  if not exists (
    select 1 from public.coop_lobby_members
    where lobby_id = v_lobby.id and user_id = v_user_id and left_at is null
  ) and v_count >= 2 then
    raise exception 'coop lobby is full';
  end if;

  v_role := case when v_lobby.host_user_id = v_user_id then 'host' else 'guest' end;
  insert into public.coop_lobby_members (lobby_id, user_id, role, ready, joined_at, last_seen_at, left_at)
  values (v_lobby.id, v_user_id, v_role, false, v_now, v_now, null)
  on conflict (lobby_id, user_id) do update
    set role = excluded.role,
        ready = false,
        joined_at = v_now,
        last_seen_at = v_now,
        left_at = null;

  update public.coop_lobbies
  set status = 'waiting', updated_at = v_now
  where id = v_lobby.id
  returning * into v_lobby;

  return query
  select v_lobby.id, v_lobby.invite_code, v_lobby.status, v_lobby.run_seed,
         member.role, member.ready, v_lobby.host_user_id, v_lobby.created_at,
         v_lobby.expires_at, v_lobby.started_at, v_now
  from public.coop_lobby_members member
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
  from public.coop_lobby_members member
  join public.coop_lobbies lobby on lobby.id = member.lobby_id
  where member.user_id = v_user_id
    and member.left_at is null
    and lobby.status in ('waiting', 'ready')
    and lobby.expires_at > v_now
  order by member.joined_at desc
  limit 1
  for update of lobby;

  if v_lobby.id is null then raise exception 'active coop lobby required'; end if;

  update public.coop_lobby_members
  set ready = coalesce(p_ready, false), last_seen_at = v_now
  where lobby_id = v_lobby.id and user_id = v_user_id and left_at is null
  returning * into v_member;

  select count(*), coalesce(bool_and(ready), false)
  into v_count, v_all_ready
  from public.coop_lobby_members
  where lobby_id = v_lobby.id and left_at is null;

  update public.coop_lobbies
  set status = case when v_count = 2 and v_all_ready then 'ready' else 'waiting' end,
      updated_at = v_now
  where id = v_lobby.id
  returning * into v_lobby;

  return query select v_lobby.id, v_lobby.invite_code, v_lobby.status, v_lobby.run_seed,
    v_member.role, v_member.ready, v_lobby.host_user_id, v_lobby.created_at,
    v_lobby.expires_at, v_lobby.started_at, v_now;
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

  select * into v_lobby
  from public.coop_lobbies
  where host_user_id = v_user_id
    and status in ('waiting', 'ready')
    and expires_at > v_now
  order by updated_at desc
  limit 1
  for update;

  if v_lobby.id is null then raise exception 'host coop lobby required'; end if;

  select count(*), coalesce(bool_and(ready), false)
  into v_count, v_all_ready
  from public.coop_lobby_members
  where lobby_id = v_lobby.id and left_at is null;

  if v_count <> 2 then raise exception 'two active coop players required'; end if;
  if not v_all_ready then raise exception 'both coop players must be ready'; end if;

  update public.coop_lobbies
  set status = 'in_run', started_at = v_now, updated_at = v_now,
      expires_at = greatest(expires_at, v_now + interval '6 hours')
  where id = v_lobby.id
  returning * into v_lobby;

  return query
  select v_lobby.id, v_lobby.invite_code, v_lobby.status, v_lobby.run_seed,
         member.role, member.ready, v_lobby.host_user_id, v_lobby.created_at,
         v_lobby.expires_at, v_lobby.started_at, v_now
  from public.coop_lobby_members member
  where member.lobby_id = v_lobby.id
    and member.user_id = v_user_id
    and member.left_at is null;
end;
$$;

create or replace function public.leave_coop_lobby()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_member public.coop_lobby_members%rowtype;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select member.* into v_member
  from public.coop_lobby_members member
  join public.coop_lobbies lobby on lobby.id = member.lobby_id
  where member.user_id = v_user_id
    and member.left_at is null
    and lobby.status <> 'closed'
  order by member.joined_at desc
  limit 1;

  if v_member.lobby_id is null then return false; end if;

  if v_member.role = 'host' then
    update public.coop_lobbies
    set status = 'closed', closed_at = v_now, updated_at = v_now
    where id = v_member.lobby_id;
    update public.coop_lobby_members
    set left_at = coalesce(left_at, v_now), last_seen_at = v_now
    where lobby_id = v_member.lobby_id and left_at is null;
  else
    update public.coop_lobby_members
    set left_at = v_now, ready = false, last_seen_at = v_now
    where lobby_id = v_member.lobby_id and user_id = v_user_id and left_at is null;
    update public.coop_lobby_members
    set ready = false
    where lobby_id = v_member.lobby_id and left_at is null;
    update public.coop_lobbies
    set status = 'waiting', updated_at = v_now
    where id = v_member.lobby_id and status <> 'closed';
  end if;

  return true;
end;
$$;

create or replace function public.heartbeat_coop_lobby()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_updated integer;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  update public.coop_lobby_members
  set last_seen_at = clock_timestamp()
  where user_id = v_user_id and left_at is null;
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

create or replace function public.list_my_coop_lobby_members()
returns table (
  user_id uuid,
  role text,
  ready boolean,
  display_name text,
  avatar_key text,
  joined_at timestamptz,
  last_seen_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_lobby_id uuid;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  select member.lobby_id into v_lobby_id
  from public.coop_lobby_members member
  join public.coop_lobbies lobby on lobby.id = member.lobby_id
  where member.user_id = v_user_id
    and member.left_at is null
    and lobby.status <> 'closed'
    and lobby.expires_at > clock_timestamp()
  order by member.joined_at desc
  limit 1;

  if v_lobby_id is null then return; end if;

  return query
  select member.user_id, member.role, member.ready,
         coalesce(profile.display_name, 'Abenteurer'), profile.avatar_key,
         member.joined_at, member.last_seen_at
  from public.coop_lobby_members member
  left join public.profiles profile on profile.id = member.user_id
  where member.lobby_id = v_lobby_id and member.left_at is null
  order by case when member.role = 'host' then 0 else 1 end, member.joined_at;
end;
$$;

revoke all on function public.get_my_coop_lobby() from public, anon;
revoke all on function public.create_coop_lobby() from public, anon;
revoke all on function public.join_coop_lobby(text) from public, anon;
revoke all on function public.set_coop_lobby_ready(boolean) from public, anon;
revoke all on function public.start_coop_lobby() from public, anon;
revoke all on function public.leave_coop_lobby() from public, anon;
revoke all on function public.heartbeat_coop_lobby() from public, anon;
revoke all on function public.list_my_coop_lobby_members() from public, anon;

grant execute on function public.get_my_coop_lobby() to authenticated;
grant execute on function public.create_coop_lobby() to authenticated;
grant execute on function public.join_coop_lobby(text) to authenticated;
grant execute on function public.set_coop_lobby_ready(boolean) to authenticated;
grant execute on function public.start_coop_lobby() to authenticated;
grant execute on function public.leave_coop_lobby() to authenticated;
grant execute on function public.heartbeat_coop_lobby() to authenticated;
grant execute on function public.list_my_coop_lobby_members() to authenticated;
