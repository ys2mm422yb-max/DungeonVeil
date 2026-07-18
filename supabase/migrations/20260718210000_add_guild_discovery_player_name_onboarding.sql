alter table public.profiles
  add column if not exists display_name_confirmed_at timestamptz,
  add column if not exists display_name_change_count integer not null default 0;

alter table public.profiles
  drop constraint if exists profiles_display_name_change_count_check;

alter table public.profiles
  add constraint profiles_display_name_change_count_check
  check (display_name_change_count >= 0);

create unique index if not exists profiles_confirmed_display_name_lower_uidx
  on public.profiles (lower(display_name))
  where display_name_confirmed_at is not null;

create or replace function public.set_player_display_name(p_display_name text)
returns table (
  id uuid,
  display_name text,
  avatar_key text,
  created_at timestamptz,
  updated_at timestamptz,
  display_name_confirmed_at timestamptz,
  display_name_change_count integer,
  initial_setup boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := regexp_replace(btrim(coalesce(p_display_name, '')), '[[:space:]]+', ' ', 'g');
  v_profile public.profiles%rowtype;
  v_initial boolean;
  v_changed boolean;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 24 then
    raise exception 'player name must contain 2 to 24 characters';
  end if;
  if v_name ~ '[[:cntrl:]]' or v_name like '%<%' or v_name like '%>%' then
    raise exception 'player name contains unsupported characters';
  end if;

  select profile.* into v_profile
  from public.profiles as profile
  where profile.id = v_user_id
  for update;

  if v_profile.id is null then raise exception 'profile not found'; end if;

  v_initial := v_profile.display_name_confirmed_at is null;
  v_changed := v_profile.display_name is distinct from v_name;

  if exists (
    select 1
    from public.profiles as other_profile
    where other_profile.id <> v_user_id
      and other_profile.display_name_confirmed_at is not null
      and lower(other_profile.display_name) = lower(v_name)
  ) then
    raise exception 'player name is already in use';
  end if;

  update public.profiles as profile
  set display_name = v_name,
      display_name_confirmed_at = coalesce(profile.display_name_confirmed_at, clock_timestamp()),
      display_name_change_count = profile.display_name_change_count
        + case when not v_initial and v_changed then 1 else 0 end,
      updated_at = clock_timestamp()
  where profile.id = v_user_id
  returning profile.* into v_profile;

  return query
  select v_profile.id,
         v_profile.display_name,
         v_profile.avatar_key,
         v_profile.created_at,
         v_profile.updated_at,
         v_profile.display_name_confirmed_at,
         v_profile.display_name_change_count,
         v_initial;
end;
$$;

create table if not exists public.guild_join_requests (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  requester_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  answered_by uuid references public.profiles(id) on delete set null
);

create unique index if not exists guild_join_requests_one_pending_pair_uidx
  on public.guild_join_requests (guild_id, requester_user_id)
  where status = 'pending';

create index if not exists guild_join_requests_guild_status_idx
  on public.guild_join_requests (guild_id, status, created_at desc);

create index if not exists guild_join_requests_requester_status_idx
  on public.guild_join_requests (requester_user_id, status, created_at desc);

alter table public.guild_join_requests enable row level security;
revoke all on table public.guild_join_requests from public, anon, authenticated;

create or replace function public.search_guilds(p_query text default '')
returns table (
  guild_id uuid,
  guild_name text,
  guild_tag text,
  guild_description text,
  member_count integer,
  request_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_query text := btrim(coalesce(p_query, ''));
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if char_length(v_query) > 32 then raise exception 'guild search is too long'; end if;

  update public.guild_join_requests as request
  set status = 'expired', updated_at = clock_timestamp()
  where request.requester_user_id = v_user_id
    and request.status = 'pending'
    and request.expires_at <= clock_timestamp();

  return query
  select guild.id,
         guild.name,
         guild.tag,
         guild.description,
         coalesce(member_totals.total, 0)::integer,
         pending_request.status
  from public.guilds as guild
  left join lateral (
    select count(*)::integer as total
    from public.guild_members as member
    where member.guild_id = guild.id
  ) as member_totals on true
  left join lateral (
    select request.status
    from public.guild_join_requests as request
    where request.guild_id = guild.id
      and request.requester_user_id = v_user_id
      and request.status = 'pending'
      and request.expires_at > clock_timestamp()
    order by request.created_at desc
    limit 1
  ) as pending_request on true
  where v_query = ''
     or guild.name ilike '%' || v_query || '%'
     or guild.tag ilike '%' || v_query || '%'
  order by
    case when lower(guild.tag) = lower(v_query) then 0
         when lower(guild.name) = lower(v_query) then 1
         else 2 end,
    coalesce(member_totals.total, 0) desc,
    lower(guild.name)
  limit 30;
end;
$$;

create or replace function public.request_guild_join(p_guild_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_request_id uuid;
  v_player_name text;
  v_guild public.guilds%rowtype;
  v_pending_count integer;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_guild_id is null then raise exception 'guild required'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 2301));

  if exists (select 1 from public.guild_members as member where member.user_id = v_user_id) then
    raise exception 'you already belong to a guild';
  end if;

  select guild.* into v_guild
  from public.guilds as guild
  where guild.id = p_guild_id;

  if v_guild.id is null then raise exception 'guild not found'; end if;

  update public.guild_join_requests as request
  set status = 'expired', updated_at = v_now
  where request.requester_user_id = v_user_id
    and request.status = 'pending'
    and request.expires_at <= v_now;

  select count(*) into v_pending_count
  from public.guild_join_requests as request
  where request.requester_user_id = v_user_id
    and request.status = 'pending'
    and request.expires_at > v_now;

  if v_pending_count >= 5 and not exists (
    select 1 from public.guild_join_requests as request
    where request.guild_id = p_guild_id
      and request.requester_user_id = v_user_id
      and request.status = 'pending'
  ) then
    raise exception 'too many pending guild requests';
  end if;

  insert into public.guild_join_requests as request (
    guild_id, requester_user_id, status, created_at, updated_at, expires_at
  ) values (
    p_guild_id, v_user_id, 'pending', v_now, v_now, v_now + interval '7 days'
  )
  on conflict (guild_id, requester_user_id) where status = 'pending'
  do update set created_at = v_now,
                updated_at = v_now,
                expires_at = v_now + interval '7 days'
  returning request.id into v_request_id;

  select profile.display_name into v_player_name
  from public.profiles as profile
  where profile.id = v_user_id;

  insert into public.player_mailbox (
    user_id, kind, title, body, payload, source_key, expires_at
  )
  select member.user_id,
         'notice',
         'Gilden-Beitrittsanfrage',
         coalesce(v_player_name, 'Ein Spieler') || ' möchte [' || v_guild.tag || '] ' || v_guild.name || ' beitreten.',
         jsonb_build_object(
           'kind', 'guild_join_request',
           'request_id', v_request_id,
           'guild_id', v_guild.id,
           'requester_user_id', v_user_id,
           'requester_name', coalesce(v_player_name, 'Spieler')
         ),
         'guild-join-request:' || v_request_id::text || ':' || member.user_id::text,
         v_now + interval '7 days'
  from public.guild_members as member
  where member.guild_id = p_guild_id
    and member.role in ('owner', 'officer')
  on conflict (user_id, source_key) where source_key is not null
  do update set body = excluded.body,
                payload = excluded.payload,
                expires_at = excluded.expires_at,
                read_at = null,
                actioned_at = null,
                created_at = v_now;

  return v_request_id;
end;
$$;

create or replace function public.cancel_my_guild_join_request(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  update public.guild_join_requests as request
  set status = 'cancelled', updated_at = clock_timestamp()
  where request.id = p_request_id
    and request.requester_user_id = auth.uid()
    and request.status = 'pending';

  return found;
end;
$$;

create or replace function public.list_guild_join_requests(p_guild_id uuid)
returns table (
  request_id uuid,
  requester_user_id uuid,
  display_name text,
  avatar_key text,
  created_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.is_guild_officer(p_guild_id) then raise exception 'guild officer role required'; end if;

  update public.guild_join_requests as request
  set status = 'expired', updated_at = clock_timestamp()
  where request.guild_id = p_guild_id
    and request.status = 'pending'
    and request.expires_at <= clock_timestamp();

  return query
  select request.id,
         request.requester_user_id,
         profile.display_name,
         profile.avatar_key,
         request.created_at,
         request.expires_at
  from public.guild_join_requests as request
  join public.profiles as profile on profile.id = request.requester_user_id
  where request.guild_id = p_guild_id
    and request.status = 'pending'
    and request.expires_at > clock_timestamp()
  order by request.created_at asc;
end;
$$;

create or replace function public.answer_guild_join_request(p_request_id uuid, p_accept boolean)
returns boolean
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_request public.guild_join_requests%rowtype;
  v_guild public.guilds%rowtype;
  v_existing_guild_id uuid;
  v_title text;
  v_body text;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;

  select request.* into v_request
  from public.guild_join_requests as request
  where request.id = p_request_id
  for update;

  if v_request.id is null then raise exception 'guild request not found'; end if;
  if not private.is_guild_officer(v_request.guild_id) then raise exception 'guild officer role required'; end if;
  if v_request.status <> 'pending' or v_request.expires_at <= v_now then
    raise exception 'guild request is no longer active';
  end if;

  select guild.* into v_guild from public.guilds as guild where guild.id = v_request.guild_id;
  if v_guild.id is null then raise exception 'guild not found'; end if;

  if coalesce(p_accept, false) then
    select member.guild_id into v_existing_guild_id
    from public.guild_members as member
    where member.user_id = v_request.requester_user_id
    limit 1;

    if v_existing_guild_id is not null and v_existing_guild_id <> v_request.guild_id then
      raise exception 'player already belongs to another guild';
    end if;

    insert into public.guild_members (guild_id, user_id, role)
    values (v_request.guild_id, v_request.requester_user_id, 'member')
    on conflict do nothing;

    update public.guild_join_requests as request
    set status = 'accepted', updated_at = v_now, answered_by = v_user_id
    where request.id = v_request.id;

    update public.guild_join_requests as request
    set status = 'cancelled', updated_at = v_now
    where request.requester_user_id = v_request.requester_user_id
      and request.id <> v_request.id
      and request.status = 'pending';

    v_title := 'Gildenanfrage angenommen';
    v_body := 'Du bist [' || v_guild.tag || '] ' || v_guild.name || ' beigetreten.';
  else
    update public.guild_join_requests as request
    set status = 'declined', updated_at = v_now, answered_by = v_user_id
    where request.id = v_request.id;

    v_title := 'Gildenanfrage abgelehnt';
    v_body := '[' || v_guild.tag || '] ' || v_guild.name || ' hat deine Beitrittsanfrage abgelehnt.';
  end if;

  insert into public.player_mailbox (
    user_id, kind, title, body, payload, source_key, expires_at
  ) values (
    v_request.requester_user_id,
    'notice',
    v_title,
    v_body,
    jsonb_build_object(
      'kind', case when coalesce(p_accept, false) then 'guild_join_accepted' else 'guild_join_declined' end,
      'request_id', v_request.id,
      'guild_id', v_guild.id,
      'guild_name', v_guild.name,
      'guild_tag', v_guild.tag
    ),
    'guild-join-answer:' || v_request.id::text,
    v_now + interval '30 days'
  )
  on conflict (user_id, source_key) where source_key is not null
  do update set title = excluded.title,
                body = excluded.body,
                payload = excluded.payload,
                expires_at = excluded.expires_at,
                read_at = null,
                actioned_at = null,
                created_at = v_now;

  return true;
end;
$$;

revoke all on function public.set_player_display_name(text) from public, anon;
revoke all on function public.search_guilds(text) from public, anon;
revoke all on function public.request_guild_join(uuid) from public, anon;
revoke all on function public.cancel_my_guild_join_request(uuid) from public, anon;
revoke all on function public.list_guild_join_requests(uuid) from public, anon;
revoke all on function public.answer_guild_join_request(uuid, boolean) from public, anon;

grant execute on function public.set_player_display_name(text) to authenticated;
grant execute on function public.search_guilds(text) to authenticated;
grant execute on function public.request_guild_join(uuid) to authenticated;
grant execute on function public.cancel_my_guild_join_request(uuid) to authenticated;
grant execute on function public.list_guild_join_requests(uuid) to authenticated;
grant execute on function public.answer_guild_join_request(uuid, boolean) to authenticated;

select pg_notify('pgrst', 'reload schema');
