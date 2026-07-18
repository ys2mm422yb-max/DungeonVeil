create or replace function public.create_or_get_coop_loot_drop(
  p_run_seed bigint,
  p_chapter integer,
  p_room integer,
  p_equipment_id text default null,
  p_source text default null,
  p_rarity text default null
)
returns setof public.coop_loot_drops
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_lobby_id uuid;
  v_role text;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_room not in (10, 20, 30, 40, 50) then raise exception 'shared loot only exists for boss rooms'; end if;

  select member.lobby_id, member.role into v_lobby_id, v_role
  from public.coop_lobby_members member
  join public.coop_lobbies lobby on lobby.id = member.lobby_id
  where member.user_id = v_user_id
    and member.left_at is null
    and lobby.status = 'in_run'
    and lobby.run_seed = p_run_seed
  limit 1;

  if v_lobby_id is null then raise exception 'active duo lobby required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_lobby_id::text || ':' || p_run_seed::text || ':' || p_chapter::text || ':' || p_room::text, 2501));

  if not exists (
    select 1 from public.coop_loot_drops drop_row
    where drop_row.lobby_id = v_lobby_id
      and drop_row.run_seed = p_run_seed
      and drop_row.chapter = greatest(1, least(999, p_chapter))
      and drop_row.room = p_room
  ) then
    if v_role <> 'host' then return; end if;
    if coalesce(p_equipment_id, '') !~ '^[a-z0-9-]{2,64}$' then raise exception 'invalid equipment id'; end if;
    if p_source not in ('forge', 'hunt', 'warden', 'ritual', 'depth') then raise exception 'invalid equipment source'; end if;
    if p_rarity not in ('common', 'rare', 'epic') then raise exception 'invalid equipment rarity'; end if;

    insert into public.coop_loot_drops (
      lobby_id, run_seed, chapter, room, equipment_id, source, rarity,
      compensation_dust, salvage_dust
    ) values (
      v_lobby_id,
      p_run_seed,
      greatest(1, least(999, p_chapter)),
      p_room,
      p_equipment_id,
      p_source,
      p_rarity,
      case p_rarity when 'epic' then 45 when 'rare' then 28 else 18 end,
      case p_rarity when 'epic' then 25 when 'rare' then 16 else 10 end
    ) on conflict (lobby_id, run_seed, chapter, room) do nothing;
  end if;

  return query
  select drop_row.*
  from public.coop_loot_drops drop_row
  where drop_row.lobby_id = v_lobby_id
    and drop_row.run_seed = p_run_seed
    and drop_row.chapter = greatest(1, least(999, p_chapter))
    and drop_row.room = p_room;
end;
$$;

revoke all on function public.create_or_get_coop_loot_drop(bigint, integer, integer, text, text, text) from public, anon;
grant execute on function public.create_or_get_coop_loot_drop(bigint, integer, integer, text, text, text) to authenticated;
