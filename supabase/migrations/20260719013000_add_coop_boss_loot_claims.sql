create table if not exists public.coop_boss_loot_rolls (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.coop_lobbies(id) on delete cascade,
  run_seed bigint not null check (run_seed >= 0),
  chapter integer not null check (chapter >= 1),
  room integer not null check (room in (10, 20, 30, 40, 50)),
  item_id text not null check (item_id in (
    'ash-bow', 'ember-bow', 'hunter-bow', 'frost-bow', 'splinter-bow', 'veil-bow', 'warden-bow',
    'ranger-quiver', 'black-quiver', 'rune-quiver', 'frost-quiver', 'splinter-quiver', 'warden-quiver',
    'veil-key', 'guardian-sigil', 'frost-grimoire', 'ritual-shard', 'ash-amulet', 'depth-seal', 'veil-eye',
    'ranger-cloak', 'ash-armor', 'frost-armor', 'warden-armor', 'veil-mantle', 'depth-armor'
  )),
  rarity text not null check (rarity in ('common', 'rare', 'epic')),
  source text not null check (source in ('forge', 'hunt', 'warden', 'ritual', 'depth')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  winner_user_id uuid references auth.users(id) on delete set null,
  contested boolean not null default false,
  consolation_dust integer not null default 60 check (consolation_dust = 60),
  opened_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default (clock_timestamp() + interval '30 seconds'),
  resolved_at timestamptz,
  unique (lobby_id, run_seed, chapter, room)
);

create table if not exists public.coop_boss_loot_choices (
  roll_id uuid not null references public.coop_boss_loot_rolls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  choice text not null check (choice in ('claim', 'pass')),
  chosen_at timestamptz not null default clock_timestamp(),
  primary key (roll_id, user_id)
);

create index if not exists coop_boss_loot_rolls_lobby_room_idx
  on public.coop_boss_loot_rolls (lobby_id, run_seed, chapter, room);
create index if not exists coop_boss_loot_choices_user_idx
  on public.coop_boss_loot_choices (user_id, chosen_at desc);

alter table public.coop_boss_loot_rolls enable row level security;
alter table public.coop_boss_loot_choices enable row level security;

revoke all on table public.coop_boss_loot_rolls from anon, authenticated;
revoke all on table public.coop_boss_loot_choices from anon, authenticated;
grant select on table public.coop_boss_loot_rolls to authenticated;
grant select on table public.coop_boss_loot_choices to authenticated;

drop policy if exists coop_boss_loot_rolls_read_members on public.coop_boss_loot_rolls;
create policy coop_boss_loot_rolls_read_members
  on public.coop_boss_loot_rolls
  for select
  to authenticated
  using (private.is_coop_lobby_member(lobby_id));

drop policy if exists coop_boss_loot_choices_read_members on public.coop_boss_loot_choices;
create policy coop_boss_loot_choices_read_members
  on public.coop_boss_loot_choices
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.coop_boss_loot_rolls roll
      where roll.id = roll_id
        and private.is_coop_lobby_member(roll.lobby_id)
    )
  );

create or replace function private.resolve_coop_boss_loot(p_roll_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_roll public.coop_boss_loot_rolls%rowtype;
  v_member_count integer;
  v_choice_count integer;
  v_claim_count integer;
  v_winner uuid;
begin
  select * into v_roll
  from public.coop_boss_loot_rolls roll
  where roll.id = p_roll_id
  for update;

  if v_roll.id is null or v_roll.status = 'resolved' then return; end if;

  if clock_timestamp() >= v_roll.expires_at then
    insert into public.coop_boss_loot_choices (roll_id, user_id, choice, chosen_at)
    select v_roll.id, member.user_id, 'pass', clock_timestamp()
    from public.coop_lobby_members member
    where member.lobby_id = v_roll.lobby_id
      and member.left_at is null
    on conflict (roll_id, user_id) do nothing;
  end if;

  select count(*) into v_member_count
  from public.coop_lobby_members member
  where member.lobby_id = v_roll.lobby_id
    and member.left_at is null;

  select count(*) into v_choice_count
  from public.coop_boss_loot_choices choice_row
  join public.coop_lobby_members member
    on member.lobby_id = v_roll.lobby_id
   and member.user_id = choice_row.user_id
   and member.left_at is null
  where choice_row.roll_id = v_roll.id;

  if v_member_count < 1 or v_choice_count < v_member_count then return; end if;

  select count(*) into v_claim_count
  from public.coop_boss_loot_choices choice_row
  join public.coop_lobby_members member
    on member.lobby_id = v_roll.lobby_id
   and member.user_id = choice_row.user_id
   and member.left_at is null
  where choice_row.roll_id = v_roll.id
    and choice_row.choice = 'claim';

  if v_claim_count = 1 then
    select choice_row.user_id into v_winner
    from public.coop_boss_loot_choices choice_row
    where choice_row.roll_id = v_roll.id
      and choice_row.choice = 'claim'
    limit 1;
  elsif v_claim_count > 1 then
    select choice_row.user_id into v_winner
    from public.coop_boss_loot_choices choice_row
    where choice_row.roll_id = v_roll.id
      and choice_row.choice = 'claim'
    order by hashtextextended(v_roll.id::text || ':' || choice_row.user_id::text, 7319), choice_row.user_id
    limit 1;
  end if;

  update public.coop_boss_loot_rolls roll
  set status = 'resolved',
      winner_user_id = v_winner,
      contested = v_claim_count > 1,
      resolved_at = clock_timestamp()
  where roll.id = v_roll.id;
end;
$$;

create or replace function private.coop_boss_loot_snapshot(p_roll_id uuid, p_user_id uuid)
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
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select roll.id,
         roll.lobby_id,
         roll.run_seed,
         roll.chapter,
         roll.room,
         roll.item_id,
         roll.rarity,
         roll.source,
         roll.status,
         roll.expires_at,
         roll.resolved_at,
         (
           select count(*)::integer
           from public.coop_lobby_members member
           where member.lobby_id = roll.lobby_id
             and member.left_at is null
         ),
         (
           select count(*)::integer
           from public.coop_boss_loot_choices choice_row
           join public.coop_lobby_members member
             on member.lobby_id = roll.lobby_id
            and member.user_id = choice_row.user_id
            and member.left_at is null
           where choice_row.roll_id = roll.id
         ),
         (
           select choice_row.choice
           from public.coop_boss_loot_choices choice_row
           where choice_row.roll_id = roll.id
             and choice_row.user_id = p_user_id
         ),
         roll.winner_user_id,
         roll.contested,
         roll.status = 'resolved' and roll.winner_user_id = p_user_id,
         case
           when roll.status = 'resolved'
            and roll.contested
            and roll.winner_user_id is distinct from p_user_id
            and exists (
              select 1
              from public.coop_boss_loot_choices choice_row
              where choice_row.roll_id = roll.id
                and choice_row.user_id = p_user_id
                and choice_row.choice = 'claim'
            )
           then roll.consolation_dust
           else 0
         end,
         clock_timestamp()
  from public.coop_boss_loot_rolls roll
  where roll.id = p_roll_id;
$$;

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
  on conflict (lobby_id, run_seed, chapter, room) do nothing;

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

create or replace function public.get_coop_boss_loot(
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
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if not private.is_coop_lobby_member(p_lobby_id) then raise exception 'lobby membership required'; end if;

  select roll.id into v_roll_id
  from public.coop_boss_loot_rolls roll
  where roll.lobby_id = p_lobby_id
    and roll.run_seed = p_run_seed
    and roll.chapter = greatest(1, p_chapter)
    and roll.room = p_room;

  if v_roll_id is null then return; end if;
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
    on conflict (roll_id, user_id) do update
      set choice = excluded.choice,
          chosen_at = excluded.chosen_at;
  end if;

  perform private.resolve_coop_boss_loot(v_roll.id);
  return query select * from private.coop_boss_loot_snapshot(v_roll.id, v_user_id);
end;
$$;

revoke all on function private.resolve_coop_boss_loot(uuid) from public, anon, authenticated;
revoke all on function private.coop_boss_loot_snapshot(uuid, uuid) from public, anon, authenticated;
revoke all on function public.open_coop_boss_loot(uuid, bigint, integer, integer, text, text, text) from public, anon;
revoke all on function public.get_coop_boss_loot(uuid, bigint, integer, integer) from public, anon;
revoke all on function public.choose_coop_boss_loot(uuid, text) from public, anon;

grant execute on function public.open_coop_boss_loot(uuid, bigint, integer, integer, text, text, text) to authenticated;
grant execute on function public.get_coop_boss_loot(uuid, bigint, integer, integer) to authenticated;
grant execute on function public.choose_coop_boss_loot(uuid, text) to authenticated;

notify pgrst, 'reload schema';