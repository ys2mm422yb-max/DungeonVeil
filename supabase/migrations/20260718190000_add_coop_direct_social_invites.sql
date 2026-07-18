create or replace function public.list_coop_invite_candidates()
returns table (
  user_id uuid,
  display_name text,
  avatar_key text,
  relation text,
  activity_state text,
  last_active_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  with social_links as (
    select
      case when friendship.user_id = auth.uid() then friendship.friend_user_id else friendship.user_id end as candidate_user_id,
      'friend'::text as source
    from public.friendships as friendship
    where friendship.user_id = auth.uid()
       or friendship.friend_user_id = auth.uid()

    union all

    select other_member.user_id, 'guild'::text
    from public.guild_members as my_member
    join public.guild_members as other_member
      on other_member.guild_id = my_member.guild_id
    where my_member.user_id = auth.uid()
      and other_member.user_id <> auth.uid()
  ), deduplicated as (
    select
      link.candidate_user_id,
      bool_or(link.source = 'friend') as is_friend,
      bool_or(link.source = 'guild') as is_guild_member
    from social_links as link
    where link.candidate_user_id <> auth.uid()
    group by link.candidate_user_id
  )
  select
    profile.id,
    profile.display_name,
    profile.avatar_key,
    case
      when candidate.is_friend and candidate.is_guild_member then 'friend_guild'
      when candidate.is_friend then 'friend'
      else 'guild'
    end,
    profile.activity_state,
    profile.last_active_at
  from deduplicated as candidate
  join public.profiles as profile on profile.id = candidate.candidate_user_id
  where auth.uid() is not null
    and profile.last_active_at >= clock_timestamp() - interval '2 minutes'
  order by
    case profile.activity_state when 'menu' then 0 when 'paused' then 1 else 2 end,
    lower(profile.display_name);
$$;

create or replace function public.send_coop_lobby_invite(p_target_user_id uuid)
returns boolean
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
  v_member_count integer := 0;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if p_target_user_id is null or p_target_user_id = v_me then raise exception 'another player required'; end if;

  perform public.close_expired_coop_lobbies();

  select lobby.* into v_lobby
  from public.coop_lobbies as lobby
  where lobby.host_user_id = v_me
    and lobby.status in ('waiting', 'ready')
    and lobby.expires_at > v_now
  order by lobby.created_at desc
  limit 1
  for update of lobby;

  if v_lobby.id is null then raise exception 'active host lobby required'; end if;

  select count(*) into v_member_count
  from public.coop_lobby_members as member
  where member.lobby_id = v_lobby.id
    and member.left_at is null;

  if v_member_count >= 2 then raise exception 'coop lobby is full'; end if;

  if exists (
    select 1
    from public.coop_lobby_members as member
    join public.coop_lobbies as lobby on lobby.id = member.lobby_id
    where member.user_id = p_target_user_id
      and member.left_at is null
      and lobby.status <> 'closed'
      and lobby.expires_at > v_now
  ) then
    raise exception 'player is already in a duo lobby';
  end if;

  if not exists (
    select 1
    from public.friendships as friendship
    where (friendship.user_id = v_me and friendship.friend_user_id = p_target_user_id)
       or (friendship.user_id = p_target_user_id and friendship.friend_user_id = v_me)
  ) and not exists (
    select 1
    from public.guild_members as my_member
    join public.guild_members as target_member on target_member.guild_id = my_member.guild_id
    where my_member.user_id = v_me
      and target_member.user_id = p_target_user_id
  ) then
    raise exception 'friendship or shared guild required';
  end if;

  select profile.* into v_target
  from public.profiles as profile
  where profile.id = p_target_user_id;

  if v_target.id is null then raise exception 'player not found'; end if;
  if v_target.last_active_at < v_now - interval '2 minutes' then raise exception 'player is offline'; end if;
  if v_target.activity_state <> 'menu' then raise exception 'player is busy'; end if;

  select profile.display_name into v_host_name
  from public.profiles as profile
  where profile.id = v_me;

  insert into public.player_mailbox (
    user_id,
    kind,
    title,
    body,
    payload,
    source_key,
    expires_at
  ) values (
    p_target_user_id,
    'notice',
    'Duo-Einladung',
    coalesce(v_host_name, 'Ein Freund') || ' lädt dich in eine private Duo-Lobby ein.',
    jsonb_build_object(
      'kind', 'coop_invite',
      'lobby_id', v_lobby.id,
      'invite_code', v_lobby.invite_code,
      'host_user_id', v_me,
      'host_name', coalesce(v_host_name, 'Spieler')
    ),
    'coop-invite:' || v_lobby.id::text || ':' || p_target_user_id::text,
    v_lobby.expires_at
  )
  on conflict (user_id, source_key) where source_key is not null
  do update set
    title = excluded.title,
    body = excluded.body,
    payload = excluded.payload,
    expires_at = excluded.expires_at,
    read_at = null,
    actioned_at = null,
    created_at = v_now;

  return true;
end;
$$;

revoke all on function public.list_coop_invite_candidates() from public, anon;
revoke all on function public.send_coop_lobby_invite(uuid) from public, anon;
grant execute on function public.list_coop_invite_candidates() to authenticated;
grant execute on function public.send_coop_lobby_invite(uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');
