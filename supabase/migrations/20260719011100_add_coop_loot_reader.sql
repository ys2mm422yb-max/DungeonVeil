create or replace function public.get_my_coop_loot_drop(
  p_run_seed bigint,
  p_chapter integer,
  p_room integer
)
returns table (
  drop_id uuid,
  lobby_id uuid,
  run_seed bigint,
  chapter integer,
  room integer,
  equipment_id text,
  source text,
  rarity text,
  status text,
  resolution text,
  winner_user_id uuid,
  compensation_dust integer,
  salvage_dust integer,
  deadline_at timestamptz,
  my_choice text,
  partner_choice text,
  my_roll smallint,
  partner_roll smallint,
  server_now timestamptz
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_lobby_id uuid;
  v_drop_id uuid;
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select member.lobby_id into v_lobby_id
  from public.coop_lobby_members member
  join public.coop_lobbies lobby on lobby.id = member.lobby_id
  where member.user_id = v_user_id
    and member.left_at is null
    and lobby.status = 'in_run'
    and lobby.run_seed = p_run_seed
  limit 1;

  if v_lobby_id is null then return; end if;

  select drop_row.id into v_drop_id
  from public.coop_loot_drops drop_row
  where drop_row.lobby_id = v_lobby_id
    and drop_row.run_seed = p_run_seed
    and drop_row.chapter = greatest(1, least(999, p_chapter))
    and drop_row.room = p_room
  limit 1;

  if v_drop_id is null then return; end if;
  perform private.resolve_coop_loot_drop(v_drop_id);

  return query
  select drop_row.id, drop_row.lobby_id, drop_row.run_seed, drop_row.chapter, drop_row.room,
         drop_row.equipment_id, drop_row.source, drop_row.rarity, drop_row.status,
         drop_row.resolution, drop_row.winner_user_id, drop_row.compensation_dust,
         drop_row.salvage_dust, drop_row.deadline_at, mine.choice, partner.choice,
         mine.roll, partner.roll, v_now
  from public.coop_loot_drops drop_row
  left join public.coop_loot_choices mine
    on mine.drop_id = drop_row.id and mine.user_id = v_user_id
  left join public.coop_loot_choices partner
    on partner.drop_id = drop_row.id and partner.user_id <> v_user_id
  where drop_row.id = v_drop_id;
end;
$$;

revoke all on function public.get_my_coop_loot_drop(bigint, integer, integer) from public, anon;
grant execute on function public.get_my_coop_loot_drop(bigint, integer, integer) to authenticated;
