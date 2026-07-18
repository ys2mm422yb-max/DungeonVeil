alter table public.player_mailbox
  drop constraint if exists player_mailbox_kind_check;

alter table public.player_mailbox
  add constraint player_mailbox_kind_check
  check (kind in ('guild_invite', 'friend_request', 'coop_invite', 'system', 'notice', 'reward'));

create or replace function public.list_coop_invite_candidates()
returns table(
  user_id uuid,
  display_name text,
  avatar_key text,
  connection_kind text,
  activity_state text,
  last_active_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  with related as (
    select
      case when f.user_id = auth.uid() then f.friend_user_id else f.user_id end as related_user_id,
      true as is_friend,
      false as is_guild
    from public.friendships f
    where f.user_id = auth.uid() or f.friend_user_id = auth.uid()

    union all

    select theirs.user_id, false, true
    from public.guild_members mine
    join public.guild_members theirs on theirs.guild_id = mine.guild_id
    where mine.user_id = auth.uid()
      and theirs.user_id <> auth.uid()
  ), combined as (
    select
      related_user_id,
      bool_or(is_friend) as is_friend,
      bool_or(is_guild) as is_guild
    from related
    where related_user_id <> auth.uid()
    group by related_user_id
  )
  select
    profile.id,
    profile.display_name,
    profile.avatar_key,
    case
      when combined.is_friend and combined.is_guild then 'friend_guild'
      when combined.is_friend then 'friend'
      else 'guild'
    end,
    profile.activity_state,
    profile.last_active_at
  from combined
  join public.profiles profile on profile.id = combined.related_user_id
  where profile.last_active_at >= clock_timestamp() - interval '5 minutes'
  order by
    case when profile.activity_state = 'menu' then 0 else 1 end,
    lower(profile.display_name),
    profile.id;
$$;

create or replace function public.send_coop_lobby_invite(p_target_user_id uuid)
returns table(
  user_id uuid,
  display_name text,
  avatar_key text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_lobby public.coop_lobbies%rowtype;
  v_target public.profiles%rowtype;
  v_host_name text;
  v_mail_expiry timestamptz;
  v_member_count integer;
  v_target_lobby_id uuid;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if p_target_user_id is null or p_target_user_id = v_me then raise exception 'other player required'; end if;

  perform public.close_expired_coop_lobbies();

  select lobby.* into v_lobby
  from public.coop_lobby_members member
  join public.coop_lobbies lobby on lobby.id = member.lobby_id
  where member.user_id = v_me
    and member.role = 'host'
    and member.left_at is null
    and lobby.status in ('waiting', 'ready')
    and lobby.expires_at > v_now
  order by member.joined_at desc
  limit 1
  for update of lobby;

  if v_lobby.id is null then raise exception 'active host coop lobby required'; end if;

  select count(*) into v_member_count
  from public.coop_lobby_members member
  where member.lobby_id = v_lobby.id and member.left_at is null;

  if v_member_count >= 2 then raise exception 'coop lobby is full'; end if;

  select profile.* into v_target
  from public.profiles profile
  where profile.id = p_target_user_id;

  if v_target.id is null then raise exception 'player not found'; end if;

  if not exists (
    select 1
    from public.friendships friendship
    where (friendship.user_id = v_me and friendship.friend_user_id = p_target_user_id)
       or (friendship.user_id = p_target_user_id and friendship.friend_user_id = v_me)
  ) and not exists (
    select 1
    from public.guild_members mine
    join public.guild_members theirs on theirs.guild_id = mine.guild_id
    where mine.user_id = v_me and theirs.user_id = p_target_user_id
  ) then
    raise exception 'friendship or shared guild required';
  end if;

  if v_target.last_active_at < v_now - interval '5 minutes' then raise exception 'player is offline'; end if;
  if v_target.activity_state <> 'menu' then raise exception 'player is not available'; end if;

  select member.lobby_id into v_target_lobby_id
  from public.coop_lobby_members member
  join public.coop_lobbies lobby on lobby.id = member.lobby_id
  where member.user_id = p_target_user_id
    and member.left_at is null
    and lobby.status <> 'closed'
    and lobby.expires_at > v_now
  order by member.joined_at desc
  limit 1;

  if v_target_lobby_id is not null and v_target_lobby_id <> v_lobby.id then
    raise exception 'player already in another coop lobby';
  end if;

  select profile.display_name into v_host_name
  from public.profiles profile
  where profile.id = v_me;

  v_mail_expiry := least(v_lobby.expires_at, v_now + interval '15 minutes');

  insert into public.player_mailbox (
    user_id, kind, title, body, payload, source_key, expires_at
  ) values (
    p_target_user_id,
    'coop_invite',
    'Duo-Einladung',
    coalesce(v_host_name, 'Ein Spieler') || ' lädt dich in eine private Duo-Lobby ein.',
    jsonb_build_object(
      'lobby_id', v_lobby.id,
      'invite_code', v_lobby.invite_code,
      'host_user_id', v_me,
      'host_name', coalesce(v_host_name, 'Spieler')
    ),
    'coop-invite:' || v_lobby.id::text || ':' || p_target_user_id::text,
    v_mail_expiry
  )
  on conflict (user_id, source_key) where source_key is not null
  do update set
    title = excluded.title,
    body = excluded.body,
    payload = excluded.payload,
    expires_at = excluded.expires_at,
    read_at = null,
    actioned_at = null,
    created_at = now();

  return query
  select v_target.id, v_target.display_name, v_target.avatar_key, v_mail_expiry;
end;
$$;

revoke all on function public.list_coop_invite_candidates() from public, anon;
revoke all on function public.send_coop_lobby_invite(uuid) from public, anon;
grant execute on function public.list_coop_invite_candidates() to authenticated;
grant execute on function public.send_coop_lobby_invite(uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');
