alter table public.guilds
  add column if not exists join_policy text not null default 'request',
  add column if not exists max_members smallint not null default 30;

alter table public.guilds drop constraint if exists guilds_join_policy_check;
alter table public.guilds
  add constraint guilds_join_policy_check check (join_policy in ('open', 'request', 'closed'));

alter table public.guilds drop constraint if exists guilds_max_members_check;
alter table public.guilds
  add constraint guilds_max_members_check check (max_members between 2 and 50);

create table if not exists public.guild_join_requests (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  unique (guild_id, user_id)
);

create index if not exists guild_join_requests_guild_status_idx
  on public.guild_join_requests (guild_id, status, created_at);
create index if not exists guild_join_requests_user_status_idx
  on public.guild_join_requests (user_id, status, updated_at desc);

alter table public.guild_join_requests enable row level security;
revoke all on table public.guild_join_requests from anon, authenticated;
grant select on table public.guild_join_requests to authenticated;

drop policy if exists guild_join_requests_read_related on public.guild_join_requests;
create policy guild_join_requests_read_related
  on public.guild_join_requests
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_guild_officer(guild_id)
  );

create or replace function public.search_guilds(p_query text default '')
returns table (
  guild_id uuid,
  name text,
  tag text,
  description text,
  join_policy text,
  max_members smallint,
  member_count bigint,
  request_status text
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_query text := left(btrim(coalesce(p_query, '')), 40);
begin
  if v_user_id is null then raise exception 'authentication required'; end if;

  return query
  select g.id,
         g.name,
         g.tag,
         g.description,
         g.join_policy,
         g.max_members,
         count(m.user_id) as member_count,
         r.status as request_status
  from public.guilds g
  left join public.guild_members m on m.guild_id = g.id
  left join public.guild_join_requests r
    on r.guild_id = g.id
   and r.user_id = v_user_id
  where v_query = ''
     or lower(g.name) like '%' || lower(v_query) || '%'
     or lower(g.tag) like '%' || lower(v_query) || '%'
  group by g.id, g.name, g.tag, g.description, g.join_policy, g.max_members, r.status, g.updated_at
  order by
    case when lower(g.name) = lower(v_query) or lower(g.tag) = lower(v_query) then 0 else 1 end,
    count(m.user_id) desc,
    g.updated_at desc
  limit 30;
end;
$$;

create or replace function public.request_or_join_guild(p_guild_id uuid)
returns table (
  guild_id uuid,
  action text,
  request_status text,
  member_count bigint,
  max_members smallint
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_guild public.guilds%rowtype;
  v_member_count bigint;
  v_status text;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_guild_id is null then raise exception 'guild required'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 4101));
  perform pg_advisory_xact_lock(hashtextextended(p_guild_id::text, 4102));

  if exists (select 1 from public.guild_members where user_id = v_user_id) then
    raise exception 'already in a guild';
  end if;

  select * into v_guild from public.guilds where id = p_guild_id for update;
  if v_guild.id is null then raise exception 'guild not found'; end if;

  select count(*) into v_member_count from public.guild_members where guild_id = p_guild_id;
  if v_member_count >= v_guild.max_members then raise exception 'guild is full'; end if;
  if v_guild.join_policy = 'closed' then raise exception 'guild is closed'; end if;

  if v_guild.join_policy = 'open' then
    insert into public.guild_members (guild_id, user_id, role, joined_at)
    values (p_guild_id, v_user_id, 'member', clock_timestamp())
    on conflict (guild_id, user_id) do nothing;

    update public.guild_join_requests
    set status = case when guild_id = p_guild_id then 'accepted' else 'withdrawn' end,
        updated_at = clock_timestamp(),
        reviewed_at = case when guild_id = p_guild_id then clock_timestamp() else reviewed_at end,
        reviewed_by = case when guild_id = p_guild_id then v_user_id else reviewed_by end
    where user_id = v_user_id and status = 'pending';

    v_status := 'accepted';
    v_member_count := v_member_count + 1;
    return query select p_guild_id, 'joined'::text, v_status, v_member_count, v_guild.max_members;
    return;
  end if;

  insert into public.guild_join_requests (guild_id, user_id, status, created_at, updated_at, reviewed_by, reviewed_at)
  values (p_guild_id, v_user_id, 'pending', clock_timestamp(), clock_timestamp(), null, null)
  on conflict (guild_id, user_id) do update
    set status = 'pending',
        updated_at = clock_timestamp(),
        reviewed_by = null,
        reviewed_at = null;

  return query select p_guild_id, 'requested'::text, 'pending'::text, v_member_count, v_guild.max_members;
end;
$$;

create or replace function public.cancel_guild_join_request(p_guild_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  update public.guild_join_requests
  set status = 'withdrawn', updated_at = clock_timestamp()
  where guild_id = p_guild_id
    and user_id = auth.uid()
    and status = 'pending';
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

create or replace function public.list_guild_join_requests(p_guild_id uuid)
returns table (
  request_id uuid,
  user_id uuid,
  display_name text,
  avatar_key text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.is_guild_officer(p_guild_id) then raise exception 'guild officer required'; end if;

  return query
  select r.id, r.user_id, p.display_name, p.avatar_key, r.status, r.created_at
  from public.guild_join_requests r
  join public.profiles p on p.id = r.user_id
  where r.guild_id = p_guild_id and r.status = 'pending'
  order by r.created_at asc
  limit 50;
end;
$$;

create or replace function public.review_guild_join_request(p_request_id uuid, p_accept boolean)
returns table (
  request_id uuid,
  request_status text,
  user_id uuid,
  guild_id uuid
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_reviewer uuid := auth.uid();
  v_request public.guild_join_requests%rowtype;
  v_guild public.guilds%rowtype;
  v_member_count bigint;
begin
  if v_reviewer is null then raise exception 'authentication required'; end if;
  if p_request_id is null then raise exception 'request required'; end if;

  select * into v_request
  from public.guild_join_requests
  where id = p_request_id
  for update;

  if v_request.id is null or v_request.status <> 'pending' then raise exception 'pending request not found'; end if;
  if not private.is_guild_officer(v_request.guild_id) then raise exception 'guild officer required'; end if;

  if not coalesce(p_accept, false) then
    update public.guild_join_requests
    set status = 'declined', updated_at = clock_timestamp(), reviewed_at = clock_timestamp(), reviewed_by = v_reviewer
    where id = v_request.id;
    return query select v_request.id, 'declined'::text, v_request.user_id, v_request.guild_id;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_request.user_id::text, 4101));
  perform pg_advisory_xact_lock(hashtextextended(v_request.guild_id::text, 4102));

  if exists (select 1 from public.guild_members where user_id = v_request.user_id) then
    update public.guild_join_requests
    set status = 'withdrawn', updated_at = clock_timestamp(), reviewed_at = clock_timestamp(), reviewed_by = v_reviewer
    where id = v_request.id;
    raise exception 'player is already in a guild';
  end if;

  select * into v_guild from public.guilds where id = v_request.guild_id for update;
  select count(*) into v_member_count from public.guild_members where guild_id = v_request.guild_id;
  if v_member_count >= v_guild.max_members then raise exception 'guild is full'; end if;

  insert into public.guild_members (guild_id, user_id, role, joined_at)
  values (v_request.guild_id, v_request.user_id, 'member', clock_timestamp());

  update public.guild_join_requests
  set status = case when id = v_request.id then 'accepted' else 'withdrawn' end,
      updated_at = clock_timestamp(),
      reviewed_at = case when id = v_request.id then clock_timestamp() else reviewed_at end,
      reviewed_by = case when id = v_request.id then v_reviewer else reviewed_by end
  where user_id = v_request.user_id and status = 'pending';

  return query select v_request.id, 'accepted'::text, v_request.user_id, v_request.guild_id;
end;
$$;

create or replace function public.set_guild_join_policy(p_guild_id uuid, p_join_policy text)
returns table (guild_id uuid, join_policy text, max_members smallint)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_policy text := lower(btrim(coalesce(p_join_policy, '')));
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.is_guild_officer(p_guild_id) then raise exception 'guild officer required'; end if;
  if v_policy not in ('open', 'request', 'closed') then raise exception 'invalid join policy'; end if;

  return query
  update public.guilds g
  set join_policy = v_policy, updated_at = clock_timestamp()
  where g.id = p_guild_id
  returning g.id, g.join_policy, g.max_members;
end;
$$;

revoke all on function public.search_guilds(text) from public, anon;
revoke all on function public.request_or_join_guild(uuid) from public, anon;
revoke all on function public.cancel_guild_join_request(uuid) from public, anon;
revoke all on function public.list_guild_join_requests(uuid) from public, anon;
revoke all on function public.review_guild_join_request(uuid, boolean) from public, anon;
revoke all on function public.set_guild_join_policy(uuid, text) from public, anon;

grant execute on function public.search_guilds(text) to authenticated;
grant execute on function public.request_or_join_guild(uuid) to authenticated;
grant execute on function public.cancel_guild_join_request(uuid) to authenticated;
grant execute on function public.list_guild_join_requests(uuid) to authenticated;
grant execute on function public.review_guild_join_request(uuid, boolean) to authenticated;
grant execute on function public.set_guild_join_policy(uuid, text) to authenticated;

notify pgrst, 'reload schema';
