create schema if not exists private;

create table if not exists public.coop_loot_drops (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.coop_lobbies(id) on delete cascade,
  run_seed bigint not null check (run_seed >= 0),
  chapter integer not null check (chapter between 1 and 999),
  room integer not null check (room in (10, 20, 30, 40, 50)),
  equipment_id text not null check (equipment_id ~ '^[a-z0-9-]{2,64}$'),
  source text not null check (source in ('forge', 'hunt', 'warden', 'ritual', 'depth')),
  rarity text not null check (rarity in ('common', 'rare', 'epic')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolution text check (resolution in ('single_claim', 'contested', 'all_pass', 'timeout')),
  winner_user_id uuid references auth.users(id) on delete set null,
  compensation_dust integer not null default 0 check (compensation_dust between 0 and 500),
  salvage_dust integer not null default 0 check (salvage_dust between 0 and 500),
  deadline_at timestamptz not null default (clock_timestamp() + interval '30 seconds'),
  created_at timestamptz not null default clock_timestamp(),
  resolved_at timestamptz,
  unique (lobby_id, run_seed, chapter, room)
);

create index if not exists coop_loot_drops_open_idx
  on public.coop_loot_drops (lobby_id, status, deadline_at);

create table if not exists public.coop_loot_choices (
  drop_id uuid not null references public.coop_loot_drops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  choice text not null check (choice in ('claim', 'pass')),
  roll smallint check (roll between 1 and 100),
  submitted_at timestamptz not null default clock_timestamp(),
  primary key (drop_id, user_id)
);

alter table public.coop_loot_drops enable row level security;
alter table public.coop_loot_choices enable row level security;
revoke all on table public.coop_loot_drops from public, anon, authenticated;
revoke all on table public.coop_loot_choices from public, anon, authenticated;

create or replace function private.resolve_coop_loot_drop(p_drop_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_drop public.coop_loot_drops%rowtype;
  v_now timestamptz := clock_timestamp();
  v_member_count integer := 0;
  v_choice_count integer := 0;
  v_claim_count integer := 0;
  v_first_claim uuid;
  v_second_claim uuid;
  v_first_roll integer;
  v_second_roll integer;
  v_winner uuid;
  v_resolution text;
begin
  select drop_row.* into v_drop
  from public.coop_loot_drops as drop_row
  where drop_row.id = p_drop_id
  for update;

  if v_drop.id is null or v_drop.status = 'resolved' then return; end if;

  select count(*) into v_member_count
  from public.coop_lobby_members as member
  where member.lobby_id = v_drop.lobby_id
    and member.left_at is null;

  if v_member_count < 1 then return; end if;

  if v_now >= v_drop.deadline_at then
    insert into public.coop_loot_choices (drop_id, user_id, choice, submitted_at)
    select v_drop.id, member.user_id, 'pass', v_now
    from public.coop_lobby_members as member
    where member.lobby_id = v_drop.lobby_id
      and member.left_at is null
    on conflict (drop_id, user_id) do nothing;
  end if;

  select count(*) into v_choice_count
  from public.coop_loot_choices as choice_row
  join public.coop_lobby_members as member
    on member.lobby_id = v_drop.lobby_id
   and member.user_id = choice_row.user_id
   and member.left_at is null
  where choice_row.drop_id = v_drop.id;

  if v_choice_count < v_member_count then return; end if;

  select count(*) into v_claim_count
  from public.coop_loot_choices as choice_row
  join public.coop_lobby_members as member
    on member.lobby_id = v_drop.lobby_id
   and member.user_id = choice_row.user_id
   and member.left_at is null
  where choice_row.drop_id = v_drop.id
    and choice_row.choice = 'claim';

  if v_claim_count = 0 then
    v_resolution := case when v_now >= v_drop.deadline_at then 'timeout' else 'all_pass' end;
  elsif v_claim_count = 1 then
    v_resolution := 'single_claim';
    select choice_row.user_id into v_winner
    from public.coop_loot_choices as choice_row
    join public.coop_lobby_members as member
      on member.lobby_id = v_drop.lobby_id
     and member.user_id = choice_row.user_id
     and member.left_at is null
    where choice_row.drop_id = v_drop.id
      and choice_row.choice = 'claim'
    limit 1;
  else
    v_resolution := 'contested';
    select choice_row.user_id into v_first_claim
    from public.coop_loot_choices as choice_row
    join public.coop_lobby_members as member
      on member.lobby_id = v_drop.lobby_id
     and member.user_id = choice_row.user_id
     and member.left_at is null
    where choice_row.drop_id = v_drop.id
      and choice_row.choice = 'claim'
    order by choice_row.user_id
    limit 1;

    select choice_row.user_id into v_second_claim
    from public.coop_loot_choices as choice_row
    join public.coop_lobby_members as member
      on member.lobby_id = v_drop.lobby_id
     and member.user_id = choice_row.user_id
     and member.left_at is null
    where choice_row.drop_id = v_drop.id
      and choice_row.choice = 'claim'
      and choice_row.user_id <> v_first_claim
    order by choice_row.user_id
    limit 1;

    v_first_roll := 1 + floor(random() * 100)::integer;
    v_second_roll := 1 + floor(random() * 100)::integer;
    while v_first_roll = v_second_roll loop
      v_second_roll := 1 + floor(random() * 100)::integer;
    end loop;

    update public.coop_loot_choices
    set roll = case
      when user_id = v_first_claim then v_first_roll
      when user_id = v_second_claim then v_second_roll
      else roll
    end
    where drop_id = v_drop.id
      and choice = 'claim';

    v_winner := case when v_first_roll > v_second_roll then v_first_claim else v_second_claim end;
  end if;

  update public.coop_loot_drops
  set status = 'resolved',
      resolution = v_resolution,
      winner_user_id = v_winner,
      resolved_at = v_now
  where id = v_drop.id;
end;
$$;

revoke all on function private.resolve_coop_loot_drop(uuid) from public, anon, authenticated;

create or replace function public.create_or_get_coop_loot_drop(
  p_lobby_id uuid,
  p_run_seed bigint,
  p_chapter integer,
  p_room integer,
  p_equipment_id text,
  p_source text,
  p_rarity text
)
returns setof public.coop_loot_drops
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_member_count integer;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_room not in (10, 20, 30, 40, 50) then raise exception 'shared loot only exists for boss rooms'; end if;
  if coalesce(p_equipment_id, '') !~ '^[a-z0-9-]{2,64}$' then raise exception 'invalid equipment id'; end if;
  if p_source not in ('forge', 'hunt', 'warden', 'ritual', 'depth') then raise exception 'invalid equipment source'; end if;
  if p_rarity not in ('common', 'rare', 'epic') then raise exception 'invalid equipment rarity'; end if;

  select member.role into v_role
  from public.coop_lobby_members as member
  join public.coop_lobbies as lobby on lobby.id = member.lobby_id
  where member.lobby_id = p_lobby_id
    and member.user_id = v_user_id
    and member.left_at is null
    and lobby.status = 'in_run'
    and lobby.run_seed = p_run_seed
  limit 1;

  if v_role is null then raise exception 'active duo lobby required'; end if;
  if v_role <> 'host' then raise exception 'only the duo host may create shared loot'; end if;

  select count(*) into v_member_count
  from public.coop_lobby_members as member
  where member.lobby_id = p_lobby_id
    and member.left_at is null;
  if v_member_count < 1 or v_member_count > 2 then raise exception 'invalid active duo membership'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_lobby_id::text || ':' || p_run_seed::text || ':' || p_chapter::text || ':' || p_room::text, 2501));

  insert into public.coop_loot_drops (
    lobby_id, run_seed, chapter, room, equipment_id, source, rarity,
    compensation_dust, salvage_dust
  ) values (
    p_lobby_id,
    p_run_seed,
    greatest(1, least(999, p_chapter)),
    p_room,
    p_equipment_id,
    p_source,
    p_rarity,
    case p_rarity when 'epic' then 60 when 'rare' then 45 else 30 end,
    case p_rarity when 'epic' then 30 when 'rare' then 22 else 15 end
  ) on conflict (lobby_id, run_seed, chapter, room) do nothing;

  return query
  select drop_row.*
  from public.coop_loot_drops as drop_row
  where drop_row.lobby_id = p_lobby_id
    and drop_row.run_seed = p_run_seed
    and drop_row.chapter = greatest(1, least(999, p_chapter))
    and drop_row.room = p_room;
end;
$$;

create or replace function public.get_my_coop_loot_drop(
  p_lobby_id uuid,
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
  v_drop_id uuid;
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if not exists (
    select 1
    from public.coop_lobby_members as member
    join public.coop_lobbies as lobby on lobby.id = member.lobby_id
    where member.lobby_id = p_lobby_id
      and member.user_id = v_user_id
      and member.left_at is null
      and lobby.status = 'in_run'
      and lobby.run_seed = p_run_seed
  ) then raise exception 'active duo lobby required'; end if;

  select drop_row.id into v_drop_id
  from public.coop_loot_drops as drop_row
  where drop_row.lobby_id = p_lobby_id
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
  from public.coop_loot_drops as drop_row
  left join public.coop_loot_choices as mine
    on mine.drop_id = drop_row.id and mine.user_id = v_user_id
  left join public.coop_loot_choices as partner
    on partner.drop_id = drop_row.id and partner.user_id <> v_user_id
  where drop_row.id = v_drop_id;
end;
$$;

create or replace function public.submit_coop_loot_choice(
  p_lobby_id uuid,
  p_drop_id uuid,
  p_choice text
)
returns boolean
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_drop public.coop_loot_drops%rowtype;
  v_now timestamptz := clock_timestamp();
  v_inserted integer := 0;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_choice not in ('claim', 'pass') then raise exception 'invalid loot choice'; end if;

  select drop_row.* into v_drop
  from public.coop_loot_drops as drop_row
  where drop_row.id = p_drop_id
    and drop_row.lobby_id = p_lobby_id
  for update;

  if v_drop.id is null then raise exception 'loot drop not found'; end if;
  if not exists (
    select 1
    from public.coop_lobby_members as member
    join public.coop_lobbies as lobby on lobby.id = member.lobby_id
    where member.lobby_id = p_lobby_id
      and member.user_id = v_user_id
      and member.left_at is null
      and lobby.status = 'in_run'
      and lobby.run_seed = v_drop.run_seed
  ) then raise exception 'not an active lobby member'; end if;

  perform private.resolve_coop_loot_drop(v_drop.id);
  select drop_row.* into v_drop from public.coop_loot_drops as drop_row where drop_row.id = p_drop_id;
  if v_drop.status = 'resolved' or v_now >= v_drop.deadline_at then
    perform private.resolve_coop_loot_drop(v_drop.id);
    return false;
  end if;

  insert into public.coop_loot_choices (drop_id, user_id, choice, submitted_at)
  values (v_drop.id, v_user_id, p_choice, v_now)
  on conflict (drop_id, user_id) do nothing;
  get diagnostics v_inserted = row_count;

  perform private.resolve_coop_loot_drop(v_drop.id);
  return v_inserted > 0;
end;
$$;

revoke all on function public.create_or_get_coop_loot_drop(uuid, bigint, integer, integer, text, text, text) from public, anon;
revoke all on function public.get_my_coop_loot_drop(uuid, bigint, integer, integer) from public, anon;
revoke all on function public.submit_coop_loot_choice(uuid, uuid, text) from public, anon;
grant execute on function public.create_or_get_coop_loot_drop(uuid, bigint, integer, integer, text, text, text) to authenticated;
grant execute on function public.get_my_coop_loot_drop(uuid, bigint, integer, integer) to authenticated;
grant execute on function public.submit_coop_loot_choice(uuid, uuid, text) to authenticated;

select pg_notify('pgrst', 'reload schema');
