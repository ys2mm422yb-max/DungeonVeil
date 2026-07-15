alter table public.profiles
  add column if not exists activity_state text not null default 'menu',
  add column if not exists activity_chapter integer not null default 1,
  add column if not exists activity_room integer not null default 1,
  add column if not exists spectating_allowed boolean not null default true,
  add column if not exists public_stats jsonb not null default '{}'::jsonb;

alter table public.profiles drop constraint if exists profiles_activity_state_check;
alter table public.profiles add constraint profiles_activity_state_check check (activity_state in ('menu', 'run', 'paused'));

create table if not exists public.spectator_snapshots (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  chapter integer not null default 1,
  room integer not null default 1,
  snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.spectator_snapshots enable row level security;
revoke all on public.spectator_snapshots from public, anon, authenticated;

create or replace function public.set_spectating_allowed(p_allowed boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  update public.profiles
  set spectating_allowed = coalesce(p_allowed, true), updated_at = now()
  where id = auth.uid();
  return coalesce(p_allowed, true);
end;
$$;

create or replace function public.get_my_spectating_preference()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select spectating_allowed from public.profiles where id = auth.uid()), true);
$$;

create or replace function public.publish_spectator_snapshot(
  p_activity_state text,
  p_chapter integer,
  p_room integer,
  p_snapshot jsonb default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  next_state text := case when p_activity_state in ('menu', 'run', 'paused') then p_activity_state else 'menu' end;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_snapshot is not null and octet_length(p_snapshot::text) > 300000 then raise exception 'spectator snapshot too large'; end if;

  update public.profiles
  set activity_state = next_state,
      activity_chapter = greatest(1, least(999, coalesce(p_chapter, 1))),
      activity_room = greatest(1, least(50, coalesce(p_room, 1))),
      last_active_at = now(),
      updated_at = now()
  where id = auth.uid();

  if next_state = 'run' and p_snapshot is not null then
    insert into public.spectator_snapshots(user_id, chapter, room, snapshot, updated_at)
    values (auth.uid(), greatest(1, coalesce(p_chapter, 1)), greatest(1, coalesce(p_room, 1)), p_snapshot, now())
    on conflict (user_id) do update
      set chapter = excluded.chapter,
          room = excluded.room,
          snapshot = excluded.snapshot,
          updated_at = now();
  else
    delete from public.spectator_snapshots where user_id = auth.uid();
  end if;

  return true;
end;
$$;

create or replace function public.get_friend_spectator_snapshot(p_user_id uuid)
returns table(
  activity_state text,
  chapter integer,
  room integer,
  updated_at timestamptz,
  snapshot jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_user_id is null or p_user_id = auth.uid() then raise exception 'friend required'; end if;
  if not exists (
    select 1 from public.friendships f
    where (f.user_id = auth.uid() and f.friend_user_id = p_user_id)
       or (f.user_id = p_user_id and f.friend_user_id = auth.uid())
  ) then raise exception 'friendship required'; end if;

  return query
  select p.activity_state, s.chapter, s.room, s.updated_at, s.snapshot
  from public.profiles p
  join public.spectator_snapshots s on s.user_id = p.id
  where p.id = p_user_id
    and p.spectating_allowed
    and p.activity_state = 'run'
    and s.updated_at > now() - interval '8 seconds'
  limit 1;
end;
$$;

create or replace function public.sync_public_profile_stats(p_stats jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_stats jsonb;
  next_stats jsonb;
  safe_stats jsonb := coalesce(p_stats, '{}'::jsonb);
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select public_stats into current_stats from public.profiles where id = auth.uid() for update;
  current_stats := coalesce(current_stats, '{}'::jsonb);

  next_stats := jsonb_build_object(
    'highestChapter', greatest(coalesce((current_stats->>'highestChapter')::bigint, 1), coalesce((safe_stats->>'highestChapter')::bigint, 1)),
    'highestRoom', greatest(coalesce((current_stats->>'highestRoom')::bigint, 1), coalesce((safe_stats->>'highestRoom')::bigint, 1)),
    'roomsCleared', greatest(coalesce((current_stats->>'roomsCleared')::bigint, 0), coalesce((safe_stats->>'roomsCleared')::bigint, 0)),
    'enemiesDefeated', greatest(coalesce((current_stats->>'enemiesDefeated')::bigint, 0), coalesce((safe_stats->>'enemiesDefeated')::bigint, 0)),
    'bossesDefeated', greatest(coalesce((current_stats->>'bossesDefeated')::bigint, 0), coalesce((safe_stats->>'bossesDefeated')::bigint, 0)),
    'questsCompleted', greatest(coalesce((current_stats->>'questsCompleted')::bigint, 0), coalesce((safe_stats->>'questsCompleted')::bigint, 0)),
    'playTimeMs', greatest(coalesce((current_stats->>'playTimeMs')::bigint, 0), coalesce((safe_stats->>'playTimeMs')::bigint, 0)),
    'totalDamage', greatest(coalesce((current_stats->>'totalDamage')::bigint, 0), coalesce((safe_stats->>'totalDamage')::bigint, 0)),
    'itemsFound', greatest(coalesce((current_stats->>'itemsFound')::bigint, 0), coalesce((safe_stats->>'itemsFound')::bigint, 0))
  );

  update public.profiles set public_stats = next_stats, updated_at = now() where id = auth.uid();
  return next_stats;
end;
$$;

drop function if exists public.list_friends_v2();
create function public.list_friends_v2()
returns table(
  user_id uuid,
  display_name text,
  avatar_key text,
  friend_code text,
  current_chapter integer,
  current_rank integer,
  character_key text,
  friends_since timestamptz,
  last_active_at timestamptz,
  activity_state text,
  activity_chapter integer,
  activity_room integer,
  highest_chapter integer,
  highest_room integer
)
language sql
security definer
set search_path = public
as $$
  with pairs as (
    select f.friend_user_id as friend_id, f.created_at from public.friendships f where f.user_id = auth.uid()
    union all
    select f.user_id as friend_id, f.created_at from public.friendships f where f.friend_user_id = auth.uid()
  ), dedup as (
    select friend_id, min(created_at) as created_at from pairs group by friend_id
  )
  select p.id, p.display_name, p.avatar_key, p.friend_code, p.current_chapter, p.current_rank,
    p.character_key, d.created_at, p.last_active_at, p.activity_state, p.activity_chapter, p.activity_room,
    greatest(p.current_chapter, coalesce((p.public_stats->>'highestChapter')::integer, 1)),
    greatest(1, coalesce((p.public_stats->>'highestRoom')::integer, 1))
  from dedup d join public.profiles p on p.id = d.friend_id
  order by lower(p.display_name);
$$;

drop function if exists public.get_social_profile_card(uuid);
create function public.get_social_profile_card(p_user_id uuid)
returns table(
  id uuid,
  display_name text,
  avatar_key text,
  friend_code text,
  current_chapter integer,
  current_rank integer,
  character_key text,
  last_active_at timestamptz,
  guild_name text,
  guild_tag text,
  joined_at timestamptz,
  account_level integer,
  lifetime_world_boss_damage bigint,
  world_boss_events integer,
  friend_count integer,
  achievement_keys text[],
  activity_state text,
  activity_chapter integer,
  activity_room integer,
  highest_chapter integer,
  highest_room integer,
  rooms_cleared bigint,
  enemies_defeated bigint,
  bosses_defeated bigint,
  quests_completed bigint,
  play_time_ms bigint,
  total_damage bigint,
  items_found bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_user_id is null then raise exception 'profile required'; end if;

  if p_user_id <> auth.uid()
    and not exists (
      select 1 from public.friendships f
      where (f.user_id = auth.uid() and f.friend_user_id = p_user_id)
         or (f.user_id = p_user_id and f.friend_user_id = auth.uid())
    )
    and not exists (
      select 1 from public.guild_members mine
      join public.guild_members theirs on theirs.guild_id = mine.guild_id
      where mine.user_id = auth.uid() and theirs.user_id = p_user_id
    )
  then raise exception 'profile not available'; end if;

  return query
  select p.id, p.display_name, p.avatar_key, p.friend_code, p.current_chapter, p.current_rank,
    p.character_key, p.last_active_at, g.name, g.tag, p.created_at,
    greatest(1, p.current_rank + greatest(0, p.current_chapter - 1) * 2),
    coalesce(wb.total_damage, 0)::bigint, coalesce(wb.events, 0)::integer, coalesce(fr.total, 0)::integer,
    array_remove(array[
      case when greatest(p.current_chapter, coalesce((p.public_stats->>'highestChapter')::integer, 1)) >= 2 then 'first_steps' end,
      case when greatest(p.current_chapter, coalesce((p.public_stats->>'highestChapter')::integer, 1)) >= 5 then 'veil_walker' end,
      case when coalesce(wb.total_damage, 0) >= 10000 then 'boss_hunter' end,
      case when g.id is not null then 'guild_bound' end,
      case when coalesce(fr.total, 0) >= 1 then 'companion' end
    ]::text[], null),
    p.activity_state, p.activity_chapter, p.activity_room,
    greatest(p.current_chapter, coalesce((p.public_stats->>'highestChapter')::integer, 1)),
    greatest(1, coalesce((p.public_stats->>'highestRoom')::integer, 1)),
    coalesce((p.public_stats->>'roomsCleared')::bigint, 0),
    coalesce((p.public_stats->>'enemiesDefeated')::bigint, 0),
    coalesce((p.public_stats->>'bossesDefeated')::bigint, 0),
    coalesce((p.public_stats->>'questsCompleted')::bigint, 0),
    coalesce((p.public_stats->>'playTimeMs')::bigint, 0),
    coalesce((p.public_stats->>'totalDamage')::bigint, 0),
    coalesce((p.public_stats->>'itemsFound')::bigint, 0)
  from public.profiles p
  left join public.guild_members gm on gm.user_id = p.id
  left join public.guilds g on g.id = gm.guild_id
  left join lateral (
    select coalesce(sum(c.damage), 0)::bigint as total_damage,
           count(*) filter (where c.damage > 0)::integer as events
    from public.world_boss_contributions c where c.user_id = p.id
  ) wb on true
  left join lateral (
    select count(*)::integer as total from public.friendships f
    where f.user_id = p.id or f.friend_user_id = p.id
  ) fr on true
  where p.id = p_user_id
  limit 1;
end;
$$;

revoke all on function public.set_spectating_allowed(boolean) from public, anon;
revoke all on function public.get_my_spectating_preference() from public, anon;
revoke all on function public.publish_spectator_snapshot(text, integer, integer, jsonb) from public, anon;
revoke all on function public.get_friend_spectator_snapshot(uuid) from public, anon;
revoke all on function public.sync_public_profile_stats(jsonb) from public, anon;
revoke all on function public.list_friends_v2() from public, anon;
revoke all on function public.get_social_profile_card(uuid) from public, anon;

grant execute on function public.set_spectating_allowed(boolean) to authenticated;
grant execute on function public.get_my_spectating_preference() to authenticated;
grant execute on function public.publish_spectator_snapshot(text, integer, integer, jsonb) to authenticated;
grant execute on function public.get_friend_spectator_snapshot(uuid) to authenticated;
grant execute on function public.sync_public_profile_stats(jsonb) to authenticated;
grant execute on function public.list_friends_v2() to authenticated;
grant execute on function public.get_social_profile_card(uuid) to authenticated;
