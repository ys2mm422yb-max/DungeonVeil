alter table public.coop_boss_loot_rolls
  add column if not exists drop_available boolean not null default true;

alter table public.coop_boss_loot_rolls
  drop constraint if exists coop_boss_loot_rolls_item_id_check;

alter table public.coop_boss_loot_rolls
  add constraint coop_boss_loot_rolls_item_id_check check (item_id in (
    'ash-bow', 'ember-bow', 'veil-bow', 'warden-bow',
    'ranger-quiver', 'black-quiver', 'warden-quiver',
    'ranger-cloak', 'ash-armor', 'warden-armor'
  ));

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
  v_run_attempt integer;
  v_roll_id uuid;
  v_drop_basis integer;
  v_drop_available boolean;
  v_item_id text;
  v_rarity text;
  v_source text;
  v_item_count integer;
  v_item_index integer;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_lobby_id is null then raise exception 'lobby required'; end if;
  if p_room not in (10, 20, 30, 40, 50) then raise exception 'boss room required'; end if;
  if p_chapter is null or p_chapter < 1 or p_run_seed is null or p_run_seed < 0 then
    raise exception 'invalid run context';
  end if;

  select lobby.run_attempt into v_run_attempt
  from public.coop_lobbies lobby
  join public.coop_lobby_members member
    on member.lobby_id = lobby.id
   and member.user_id = v_user_id
   and member.role = 'host'
   and member.left_at is null
  where lobby.id = p_lobby_id
    and lobby.status = 'in_run'
    and lobby.run_seed = p_run_seed
  for update of lobby;

  if v_run_attempt is null then
    raise exception 'active host lobby required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_lobby_id::text || ':' || p_run_seed::text || ':' || v_run_attempt::text || ':' || p_chapter::text || ':' || p_room::text,
    7321
  ));

  select roll.id into v_roll_id
  from public.coop_boss_loot_rolls roll
  where roll.lobby_id = p_lobby_id
    and roll.run_seed = p_run_seed
    and roll.run_attempt = v_run_attempt
    and roll.chapter = p_chapter
    and roll.room = p_room;

  if v_roll_id is null then
    v_drop_basis := case p_room
      when 10 then 1800
      when 20 then 2000
      when 30 then 2200
      when 40 then 2500
      when 50 then 4200
      else 0
    end;
    v_drop_available := mod(
      (hashtextextended(
        p_lobby_id::text || ':' || p_run_seed::text || ':' || v_run_attempt::text || ':' || p_chapter::text || ':' || p_room::text || ':drop-v4',
        9419
      ) & 9223372036854775807),
      10000
    ) < v_drop_basis;

    if not v_drop_available then
      insert into public.coop_boss_loot_rolls (
        lobby_id, run_seed, run_attempt, chapter, room, item_id, rarity, source,
        status, drop_available, opened_at, expires_at, resolved_at
      ) values (
        p_lobby_id, p_run_seed, v_run_attempt, p_chapter, p_room,
        'ash-bow', 'common', 'forge',
        'resolved', false, clock_timestamp(), clock_timestamp(), clock_timestamp()
      )
      on conflict on constraint coop_boss_loot_rolls_lobby_attempt_room_key do nothing;
    else
      with catalog(item_id, rarity, source, unlock_chapter) as (
        values
          ('ash-bow', 'common', 'forge', 1),
          ('ember-bow', 'rare', 'ritual', 2),
          ('veil-bow', 'rare', 'depth', 5),
          ('warden-bow', 'epic', 'warden', 10),
          ('ranger-quiver', 'common', 'hunt', 1),
          ('black-quiver', 'rare', 'forge', 3),
          ('warden-quiver', 'epic', 'ritual', 6),
          ('ranger-cloak', 'common', 'hunt', 1),
          ('ash-armor', 'rare', 'depth', 4),
          ('warden-armor', 'epic', 'warden', 8)
      ), eligible as (
        select catalog.*
        from catalog
        where catalog.unlock_chapter <= p_chapter
          and (
            p_room = 50
            or (p_room = 10 and catalog.source = 'forge')
            or (p_room = 20 and catalog.source = 'ritual')
            or (p_room = 30 and catalog.source = 'warden')
            or (p_room = 40 and catalog.source = 'depth')
          )
      )
      select count(*)::integer into v_item_count from eligible;

      if v_item_count < 1 then
        insert into public.coop_boss_loot_rolls (
          lobby_id, run_seed, run_attempt, chapter, room, item_id, rarity, source,
          status, drop_available, opened_at, expires_at, resolved_at
        ) values (
          p_lobby_id, p_run_seed, v_run_attempt, p_chapter, p_room,
          'ash-bow', 'common', 'forge',
          'resolved', false, clock_timestamp(), clock_timestamp(), clock_timestamp()
        )
        on conflict on constraint coop_boss_loot_rolls_lobby_attempt_room_key do nothing;
      else
        v_item_index := mod(
          (hashtextextended(
            p_lobby_id::text || ':' || p_run_seed::text || ':' || v_run_attempt::text || ':' || p_chapter::text || ':' || p_room::text || ':item-v4',
            9421
          ) & 9223372036854775807),
          v_item_count
        );

        with catalog(item_id, rarity, source, unlock_chapter) as (
          values
            ('ash-bow', 'common', 'forge', 1),
            ('ember-bow', 'rare', 'ritual', 2),
            ('veil-bow', 'rare', 'depth', 5),
            ('warden-bow', 'epic', 'warden', 10),
            ('ranger-quiver', 'common', 'hunt', 1),
            ('black-quiver', 'rare', 'forge', 3),
            ('warden-quiver', 'epic', 'ritual', 6),
            ('ranger-cloak', 'common', 'hunt', 1),
            ('ash-armor', 'rare', 'depth', 4),
            ('warden-armor', 'epic', 'warden', 8)
        ), eligible as (
          select catalog.*
          from catalog
          where catalog.unlock_chapter <= p_chapter
            and (
              p_room = 50
              or (p_room = 10 and catalog.source = 'forge')
              or (p_room = 20 and catalog.source = 'ritual')
              or (p_room = 30 and catalog.source = 'warden')
              or (p_room = 40 and catalog.source = 'depth')
            )
          order by catalog.item_id
        )
        select eligible.item_id, eligible.rarity, eligible.source
          into v_item_id, v_rarity, v_source
        from eligible
        offset v_item_index
        limit 1;

        insert into public.coop_boss_loot_rolls (
          lobby_id, run_seed, run_attempt, chapter, room, item_id, rarity, source, drop_available
        ) values (
          p_lobby_id, p_run_seed, v_run_attempt, p_chapter, p_room,
          v_item_id, v_rarity, v_source, true
        )
        on conflict on constraint coop_boss_loot_rolls_lobby_attempt_room_key do nothing;
      end if;
    end if;

    select roll.id into v_roll_id
    from public.coop_boss_loot_rolls roll
    where roll.lobby_id = p_lobby_id
      and roll.run_seed = p_run_seed
      and roll.run_attempt = v_run_attempt
      and roll.chapter = p_chapter
      and roll.room = p_room;
  end if;

  perform private.resolve_coop_boss_loot(v_roll_id);
  return query select * from private.coop_boss_loot_snapshot(v_roll_id, v_user_id);
end;
$$;

revoke all on function public.open_coop_boss_loot(uuid, bigint, integer, integer) from public, anon;
grant execute on function public.open_coop_boss_loot(uuid, bigint, integer, integer) to authenticated;

comment on column public.coop_boss_loot_rolls.drop_available is
  'False marks a server-authoritative no-equipment outcome. The resolved row keeps each retry attempt and boss-room reward idempotent without opening a claim/pass decision.';
