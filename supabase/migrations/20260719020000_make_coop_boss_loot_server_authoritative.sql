create or replace function private.coop_boss_loot_catalog()
returns table (
  item_id text,
  rarity text,
  source text,
  unlock_rank integer,
  unlock_chapter integer
)
language sql
immutable
set search_path = pg_temp
as $$
  values
    ('ash-bow', 'common', 'forge', 1, 1),
    ('ember-bow', 'common', 'forge', 2, 2),
    ('hunter-bow', 'rare', 'hunt', 4, 3),
    ('frost-bow', 'rare', 'depth', 5, 4),
    ('splinter-bow', 'rare', 'forge', 6, 5),
    ('veil-bow', 'epic', 'ritual', 8, 8),
    ('warden-bow', 'epic', 'warden', 10, 10),
    ('ranger-quiver', 'common', 'hunt', 1, 1),
    ('black-quiver', 'common', 'hunt', 3, 2),
    ('rune-quiver', 'epic', 'ritual', 6, 7),
    ('frost-quiver', 'rare', 'depth', 4, 4),
    ('splinter-quiver', 'rare', 'forge', 6, 5),
    ('warden-quiver', 'epic', 'warden', 8, 9),
    ('veil-key', 'common', 'depth', 1, 1),
    ('guardian-sigil', 'rare', 'warden', 5, 4),
    ('frost-grimoire', 'epic', 'depth', 8, 7),
    ('ritual-shard', 'epic', 'ritual', 5, 6),
    ('ash-amulet', 'rare', 'forge', 4, 3),
    ('depth-seal', 'rare', 'depth', 7, 6),
    ('veil-eye', 'epic', 'ritual', 10, 10),
    ('ranger-cloak', 'common', 'hunt', 1, 1),
    ('ash-armor', 'rare', 'forge', 4, 3),
    ('frost-armor', 'rare', 'depth', 5, 5),
    ('warden-armor', 'epic', 'warden', 7, 6),
    ('veil-mantle', 'epic', 'ritual', 8, 8),
    ('depth-armor', 'epic', 'depth', 10, 9);
$$;

revoke all on function private.coop_boss_loot_catalog() from public, anon, authenticated;

create or replace function public.open_coop_boss_loot(
  p_lobby_id uuid,
  p_run_seed bigint,
  p_chapter integer,
  p_room integer
)
returns table (
  roll_id uuid,
  lobby_id uuid,
  run_seed bigint,
  chapter integer,
  room integer,
  item_id text,
  rarity text,
  source text,
  status text,
  expires_at timestamptz,
  resolved_at timestamptz,
  member_count integer,
  choice_count integer,
  my_choice text,
  winner_user_id uuid,
  contested boolean,
  my_item_won boolean,
  my_consolation_dust integer,
  server_now timestamptz
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_roll_id uuid;
  v_chapter integer := greatest(1, coalesce(p_chapter, 1));
  v_required_source text;
  v_min_rank integer;
  v_candidate_count integer;
  v_candidate_index integer;
  v_item_id text;
  v_rarity text;
  v_item_source text;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_lobby_id is null then raise exception 'lobby required'; end if;
  if p_run_seed is null or p_run_seed < 0 then raise exception 'valid run seed required'; end if;
  if p_room not in (10, 20, 30, 40, 50) then raise exception 'boss room required'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_lobby_id::text || ':' || p_run_seed::text || ':' || v_chapter::text || ':' || p_room::text, 7321));

  if not exists (
    select 1
    from public.coop_lobbies lobby
    join public.coop_lobby_members member
      on member.lobby_id = lobby.id
     and member.user_id = v_user_id
     and member.role = 'host'
     and member.left_at is null
    where lobby.id = p_lobby_id
      and lobby.status = 'in_run'
      and lobby.run_seed = p_run_seed
  ) then
    raise exception 'active host lobby required';
  end if;

  select greatest(1, coalesce(min(profile.current_rank), 1)) into v_min_rank
  from public.coop_lobby_members member
  left join public.profiles profile on profile.id = member.user_id
  where member.lobby_id = p_lobby_id
    and member.left_at is null;

  v_required_source := case
    when p_room = 10 then 'forge'
    when p_room = 20 and v_chapter >= 6 then 'ritual'
    when p_room = 20 then 'hunt'
    when p_room = 30 and v_chapter >= 4 then 'warden'
    when p_room = 30 then 'depth'
    when p_room = 40 then 'depth'
    else null
  end;

  select count(*)::integer into v_candidate_count
  from private.coop_boss_loot_catalog() catalog
  where catalog.unlock_rank <= v_min_rank
    and catalog.unlock_chapter <= v_chapter
    and (v_required_source is null or catalog.source = v_required_source);

  if v_candidate_count = 0 then
    v_required_source := null;
    select count(*)::integer into v_candidate_count
    from private.coop_boss_loot_catalog() catalog
    where catalog.unlock_rank <= v_min_rank
      and catalog.unlock_chapter <= v_chapter;
  end if;

  if v_candidate_count < 1 then raise exception 'no eligible shared boss loot'; end if;

  v_candidate_index := mod(
    abs(hashtextextended(p_lobby_id::text || ':' || p_run_seed::text || ':' || v_chapter::text || ':' || p_room::text, 7331)::numeric),
    v_candidate_count::numeric
  )::integer;

  select catalog.item_id, catalog.rarity, catalog.source
  into v_item_id, v_rarity, v_item_source
  from private.coop_boss_loot_catalog() catalog
  where catalog.unlock_rank <= v_min_rank
    and catalog.unlock_chapter <= v_chapter
    and (v_required_source is null or catalog.source = v_required_source)
  order by catalog.item_id
  offset v_candidate_index
  limit 1;

  insert into public.coop_boss_loot_rolls (
    lobby_id, run_seed, chapter, room, item_id, rarity, source
  ) values (
    p_lobby_id,
    p_run_seed,
    v_chapter,
    p_room,
    v_item_id,
    v_rarity,
    v_item_source
  )
  on conflict on constraint coop_boss_loot_rolls_lobby_id_run_seed_chapter_room_key do nothing;

  select roll.id into v_roll_id
  from public.coop_boss_loot_rolls roll
  where roll.lobby_id = p_lobby_id
    and roll.run_seed = p_run_seed
    and roll.chapter = v_chapter
    and roll.room = p_room;

  perform private.resolve_coop_boss_loot(v_roll_id);
  return query select * from private.coop_boss_loot_snapshot(v_roll_id, v_user_id);
end;
$$;

revoke all on function public.open_coop_boss_loot(uuid, bigint, integer, integer) from public, anon;
grant execute on function public.open_coop_boss_loot(uuid, bigint, integer, integer) to authenticated;

revoke all on function public.open_coop_boss_loot(uuid, bigint, integer, integer, text, text, text) from public, anon, authenticated;
drop function public.open_coop_boss_loot(uuid, bigint, integer, integer, text, text, text);

notify pgrst, 'reload schema';