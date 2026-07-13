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
  achievement_keys text[]
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if p_user_id is null then
    raise exception 'profile required';
  end if;

  if p_user_id <> auth.uid()
    and not exists (
      select 1
      from public.friendships f
      where (f.user_id = auth.uid() and f.friend_user_id = p_user_id)
         or (f.user_id = p_user_id and f.friend_user_id = auth.uid())
    )
    and not exists (
      select 1
      from public.guild_members mine
      join public.guild_members theirs on theirs.guild_id = mine.guild_id
      where mine.user_id = auth.uid() and theirs.user_id = p_user_id
    )
  then
    raise exception 'profile not available';
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.avatar_key,
    p.friend_code,
    p.current_chapter,
    p.current_rank,
    p.character_key,
    p.last_active_at,
    g.name,
    g.tag,
    p.created_at,
    greatest(1, p.current_rank + greatest(0, p.current_chapter - 1) * 2),
    coalesce(wb.total_damage, 0)::bigint,
    coalesce(wb.events, 0)::integer,
    coalesce(fr.total, 0)::integer,
    array_remove(array[
      case when p.current_chapter >= 2 then 'first_steps' end,
      case when p.current_chapter >= 5 then 'veil_walker' end,
      case when coalesce(wb.total_damage, 0) >= 10000 then 'boss_hunter' end,
      case when g.id is not null then 'guild_bound' end,
      case when coalesce(fr.total, 0) >= 1 then 'companion' end
    ]::text[], null)
  from public.profiles p
  left join public.guild_members gm on gm.user_id = p.id
  left join public.guilds g on g.id = gm.guild_id
  left join lateral (
    select coalesce(sum(c.damage), 0)::bigint as total_damage,
           count(*) filter (where c.damage > 0)::integer as events
    from public.world_boss_contributions c
    where c.user_id = p.id
  ) wb on true
  left join lateral (
    select count(*)::integer as total
    from public.friendships f
    where f.user_id = p.id or f.friend_user_id = p.id
  ) fr on true
  where p.id = p_user_id
  limit 1;
end;
$$;

revoke all on function public.get_social_profile_card(uuid) from public;
revoke all on function public.get_social_profile_card(uuid) from anon;
grant execute on function public.get_social_profile_card(uuid) to authenticated;
