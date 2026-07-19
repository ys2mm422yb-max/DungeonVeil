create or replace function public.open_coop_boss_loot(
  p_lobby_id uuid,
  p_run_seed bigint,
  p_chapter integer,
  p_room integer,
  p_item_id text,
  p_rarity text,
  p_source text
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
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_room not in (10, 20, 30, 40, 50) then raise exception 'boss room required'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_lobby_id::text || ':' || p_run_seed::text || ':' || p_chapter::text || ':' || p_room::text, 7321));

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

  insert into public.coop_boss_loot_rolls (
    lobby_id, run_seed, chapter, room, item_id, rarity, source
  ) values (
    p_lobby_id,
    p_run_seed,
    greatest(1, p_chapter),
    p_room,
    left(btrim(p_item_id), 64),
    lower(btrim(p_rarity)),
    lower(btrim(p_source))
  )
  on conflict on constraint coop_boss_loot_rolls_lobby_id_run_seed_chapter_room_key do nothing;

  select roll.id into v_roll_id
  from public.coop_boss_loot_rolls roll
  where roll.lobby_id = p_lobby_id
    and roll.run_seed = p_run_seed
    and roll.chapter = greatest(1, p_chapter)
    and roll.room = p_room;

  perform private.resolve_coop_boss_loot(v_roll_id);
  return query select * from private.coop_boss_loot_snapshot(v_roll_id, v_user_id);
end;
$$;

create or replace function public.choose_coop_boss_loot(p_roll_id uuid, p_choice text)
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
  v_roll public.coop_boss_loot_rolls%rowtype;
  v_choice text := lower(btrim(coalesce(p_choice, '')));
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if v_choice not in ('claim', 'pass') then raise exception 'invalid loot choice'; end if;

  select * into v_roll
  from public.coop_boss_loot_rolls roll
  where roll.id = p_roll_id
  for update;

  if v_roll.id is null then raise exception 'loot roll not found'; end if;
  if not private.is_coop_lobby_member(v_roll.lobby_id) then raise exception 'lobby membership required'; end if;

  perform private.resolve_coop_boss_loot(v_roll.id);
  select * into v_roll from public.coop_boss_loot_rolls roll where roll.id = p_roll_id for update;

  if v_roll.status = 'open' and clock_timestamp() < v_roll.expires_at then
    insert into public.coop_boss_loot_choices (roll_id, user_id, choice, chosen_at)
    values (v_roll.id, v_user_id, v_choice, clock_timestamp())
    on conflict on constraint coop_boss_loot_choices_pkey do update
      set choice = excluded.choice,
          chosen_at = excluded.chosen_at;
  end if;

  perform private.resolve_coop_boss_loot(v_roll.id);
  return query select * from private.coop_boss_loot_snapshot(v_roll.id, v_user_id);
end;
$$;

revoke all on function public.open_coop_boss_loot(uuid, bigint, integer, integer, text, text, text) from public, anon;
revoke all on function public.choose_coop_boss_loot(uuid, text) from public, anon;
grant execute on function public.open_coop_boss_loot(uuid, bigint, integer, integer, text, text, text) to authenticated;
grant execute on function public.choose_coop_boss_loot(uuid, text) to authenticated;

notify pgrst, 'reload schema';