create table if not exists public.coop_shared_loot (
  lobby_id uuid not null references public.coop_lobbies(id) on delete cascade,
  run_seed bigint not null,
  chapter integer not null check (chapter >= 1),
  room integer not null check (room between 1 and 50),
  item_id text not null check (char_length(item_id) between 1 and 80),
  source text not null check (source in ('forge', 'ritual', 'warden', 'depth', 'hunt')),
  rarity text not null check (rarity in ('common', 'rare', 'epic')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  choices jsonb not null default '{}'::jsonb check (jsonb_typeof(choices) = 'object'),
  winner_user_id uuid references auth.users(id) on delete set null,
  loser_user_id uuid references auth.users(id) on delete set null,
  compensation_dust integer not null default 60 check (compensation_dust between 0 and 500),
  created_at timestamptz not null default clock_timestamp(),
  resolve_after timestamptz not null default (clock_timestamp() + interval '20 seconds'),
  resolved_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (lobby_id, run_seed, chapter, room)
);

create index if not exists coop_shared_loot_open_idx
  on public.coop_shared_loot (lobby_id, run_seed, status, resolve_after desc);

alter table public.coop_shared_loot enable row level security;
revoke all on table public.coop_shared_loot from public, anon, authenticated;

create or replace function public.resolve_coop_shared_loot_locked(
  p_lobby_id uuid,
  p_run_seed bigint,
  p_chapter integer,
  p_room integer,
  p_force boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_loot public.coop_shared_loot%rowtype;
  v_members uuid[];
  v_claimers uuid[];
  v_claim_count integer := 0;
  v_winner uuid;
  v_loser uuid;
begin
  select target.* into v_loot
  from public.coop_shared_loot as target
  where target.lobby_id = p_lobby_id
    and target.run_seed = p_run_seed
    and target.chapter = p_chapter
    and target.room = p_room
  for update of target;

  if v_loot.lobby_id is null or v_loot.status = 'resolved' then return; end if;
  if not p_force
    and jsonb_object_length(v_loot.choices) < 2
    and v_loot.resolve_after > v_now then
    return;
  end if;

  select array_agg(member.user_id order by member.user_id)
  into v_members
  from public.coop_lobby_members as member
  where member.lobby_id = p_lobby_id
    and member.left_at is null;

  if coalesce(array_length(v_members, 1), 0) <> 2 then return; end if;

  select coalesce(array_agg(member_id order by member_id), array[]::uuid[])
  into v_claimers
  from unnest(v_members) as member_id
  where coalesce(v_loot.choices ->> member_id::text, 'pass') = 'claim';

  v_claim_count := coalesce(array_length(v_claimers, 1), 0);
  if v_claim_count = 1 then
    v_winner := v_claimers[1];
  elsif v_claim_count = 2 then
    v_winner := v_claimers[1 + floor(random() * 2)::integer];
    v_loser := case when v_winner = v_claimers[1] then v_claimers[2] else v_claimers[1] end;
  end if;

  update public.coop_shared_loot as target
  set status = 'resolved',
      winner_user_id = v_winner,
      loser_user_id = v_loser,
      resolved_at = v_now,
      updated_at = v_now
  where target.lobby_id = p_lobby_id
    and target.run_seed = p_run_seed
    and target.chapter = p_chapter
    and target.room = p_room;
end;
$$;

revoke all on function public.resolve_coop_shared_loot_locked(uuid, bigint, integer, integer, boolean) from public, anon, authenticated;

create or replace function public.open_coop_shared_loot(
  p_lobby_id uuid,
  p_run_seed bigint,
  p_chapter integer,
  p_room integer,
  p_item_id text,
  p_source text,
  p_rarity text
)
returns table (
  lobby_id uuid,
  run_seed bigint,
  chapter integer,
  room integer,
  item_id text,
  source text,
  rarity text,
  status text,
  choices jsonb,
  winner_user_id uuid,
  loser_user_id uuid,
  compensation_dust integer,
  created_at timestamptz,
  resolve_after timestamptz,
  resolved_at timestamptz,
  server_now timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_lobby public.coop_lobbies%rowtype;
  v_members integer;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_chapter < 1 or p_room < 1 or p_room > 50 then raise exception 'invalid coop loot room'; end if;
  if char_length(trim(coalesce(p_item_id, ''))) not between 1 and 80 then raise exception 'invalid equipment id'; end if;
  if p_source not in ('forge', 'ritual', 'warden', 'depth', 'hunt') then raise exception 'invalid equipment source'; end if;
  if p_rarity not in ('common', 'rare', 'epic') then raise exception 'invalid equipment rarity'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_lobby_id::text || ':' || p_run_seed::text || ':' || p_chapter::text || ':' || p_room::text, 2311));

  select target.* into v_lobby
  from public.coop_lobbies as target
  where target.id = p_lobby_id
    and target.run_seed = p_run_seed
    and target.status = 'in_run'
    and target.host_user_id = v_user_id
  for update of target;

  if v_lobby.id is null then raise exception 'active host coop lobby required'; end if;

  select count(*) into v_members
  from public.coop_lobby_members as member
  where member.lobby_id = p_lobby_id
    and member.left_at is null;
  if v_members <> 2 then raise exception 'two active coop players required'; end if;

  insert into public.coop_shared_loot (
    lobby_id, run_seed, chapter, room, item_id, source, rarity,
    status, choices, compensation_dust, created_at, resolve_after, updated_at
  ) values (
    p_lobby_id, p_run_seed, p_chapter, p_room, trim(p_item_id), p_source, p_rarity,
    'open', '{}'::jsonb, 60, v_now, v_now + interval '20 seconds', v_now
  ) on conflict on constraint coop_shared_loot_pkey do nothing;

  return query
  select loot.lobby_id, loot.run_seed, loot.chapter, loot.room, loot.item_id,
         loot.source, loot.rarity, loot.status, loot.choices, loot.winner_user_id,
         loot.loser_user_id, loot.compensation_dust, loot.created_at,
         loot.resolve_after, loot.resolved_at, v_now
  from public.coop_shared_loot as loot
  where loot.lobby_id = p_lobby_id
    and loot.run_seed = p_run_seed
    and loot.chapter = p_chapter
    and loot.room = p_room;
end;
$$;

create or replace function public.get_coop_shared_loot(
  p_lobby_id uuid,
  p_run_seed bigint,
  p_chapter integer,
  p_room integer
)
returns table (
  lobby_id uuid,
  run_seed bigint,
  chapter integer,
  room integer,
  item_id text,
  source text,
  rarity text,
  status text,
  choices jsonb,
  winner_user_id uuid,
  loser_user_id uuid,
  compensation_dust integer,
  created_at timestamptz,
  resolve_after timestamptz,
  resolved_at timestamptz,
  server_now timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if not exists (
    select 1 from public.coop_lobby_members as member
    where member.lobby_id = p_lobby_id
      and member.user_id = v_user_id
      and member.left_at is null
  ) then raise exception 'active coop membership required'; end if;

  perform public.resolve_coop_shared_loot_locked(p_lobby_id, p_run_seed, p_chapter, p_room, false);

  return query
  select loot.lobby_id, loot.run_seed, loot.chapter, loot.room, loot.item_id,
         loot.source, loot.rarity, loot.status, loot.choices, loot.winner_user_id,
         loot.loser_user_id, loot.compensation_dust, loot.created_at,
         loot.resolve_after, loot.resolved_at, v_now
  from public.coop_shared_loot as loot
  where loot.lobby_id = p_lobby_id
    and loot.run_seed = p_run_seed
    and loot.chapter = p_chapter
    and loot.room = p_room;
end;
$$;

create or replace function public.choose_coop_shared_loot(
  p_lobby_id uuid,
  p_run_seed bigint,
  p_chapter integer,
  p_room integer,
  p_choice text
)
returns table (
  lobby_id uuid,
  run_seed bigint,
  chapter integer,
  room integer,
  item_id text,
  source text,
  rarity text,
  status text,
  choices jsonb,
  winner_user_id uuid,
  loser_user_id uuid,
  compensation_dust integer,
  created_at timestamptz,
  resolve_after timestamptz,
  resolved_at timestamptz,
  server_now timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_choice not in ('claim', 'pass') then raise exception 'invalid coop loot choice'; end if;
  if not exists (
    select 1 from public.coop_lobby_members as member
    join public.coop_lobbies as lobby on lobby.id = member.lobby_id
    where member.lobby_id = p_lobby_id
      and member.user_id = v_user_id
      and member.left_at is null
      and lobby.run_seed = p_run_seed
      and lobby.status = 'in_run'
  ) then raise exception 'active coop membership required'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_lobby_id::text || ':' || p_run_seed::text || ':' || p_chapter::text || ':' || p_room::text, 2312));

  update public.coop_shared_loot as loot
  set choices = case
        when loot.choices ? v_user_id::text then loot.choices
        else loot.choices || jsonb_build_object(v_user_id::text, p_choice)
      end,
      updated_at = v_now
  where loot.lobby_id = p_lobby_id
    and loot.run_seed = p_run_seed
    and loot.chapter = p_chapter
    and loot.room = p_room
    and loot.status = 'open';

  if not found and not exists (
    select 1 from public.coop_shared_loot as loot
    where loot.lobby_id = p_lobby_id
      and loot.run_seed = p_run_seed
      and loot.chapter = p_chapter
      and loot.room = p_room
  ) then raise exception 'coop loot not found'; end if;

  perform public.resolve_coop_shared_loot_locked(p_lobby_id, p_run_seed, p_chapter, p_room, false);

  return query
  select loot.lobby_id, loot.run_seed, loot.chapter, loot.room, loot.item_id,
         loot.source, loot.rarity, loot.status, loot.choices, loot.winner_user_id,
         loot.loser_user_id, loot.compensation_dust, loot.created_at,
         loot.resolve_after, loot.resolved_at, v_now
  from public.coop_shared_loot as loot
  where loot.lobby_id = p_lobby_id
    and loot.run_seed = p_run_seed
    and loot.chapter = p_chapter
    and loot.room = p_room;
end;
$$;

revoke all on function public.open_coop_shared_loot(uuid, bigint, integer, integer, text, text, text) from public, anon;
revoke all on function public.get_coop_shared_loot(uuid, bigint, integer, integer) from public, anon;
revoke all on function public.choose_coop_shared_loot(uuid, bigint, integer, integer, text) from public, anon;

grant execute on function public.open_coop_shared_loot(uuid, bigint, integer, integer, text, text, text) to authenticated;
grant execute on function public.get_coop_shared_loot(uuid, bigint, integer, integer) to authenticated;
grant execute on function public.choose_coop_shared_loot(uuid, bigint, integer, integer, text) to authenticated;

select pg_notify('pgrst', 'reload schema');
