alter table public.coop_lobbies
  add column if not exists run_attempt integer not null default 1;

alter table public.coop_lobbies drop constraint if exists coop_lobbies_run_attempt_check;
alter table public.coop_lobbies
  add constraint coop_lobbies_run_attempt_check check (run_attempt between 1 and 1000000);

alter table public.coop_boss_loot_rolls
  add column if not exists run_attempt integer not null default 1;

alter table public.coop_boss_loot_rolls
  drop constraint if exists coop_boss_loot_rolls_lobby_id_run_seed_chapter_room_key;

alter table public.coop_boss_loot_rolls
  add constraint coop_boss_loot_rolls_lobby_attempt_room_key
  unique (lobby_id, run_seed, run_attempt, chapter, room);

create table if not exists public.coop_run_checkpoints (
  lobby_id uuid not null references public.coop_lobbies(id) on delete cascade,
  run_attempt integer not null check (run_attempt >= 1),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_seed bigint not null check (run_seed >= 0),
  chapter integer not null check (chapter >= 1),
  room integer not null check (room between 1 and 50),
  room_clear boolean not null default false,
  snapshot jsonb not null default '{}'::jsonb,
  revision bigint not null default 1 check (revision >= 1),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (lobby_id, run_attempt, user_id)
);

create table if not exists public.coop_room_reward_entitlements (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.coop_lobbies(id) on delete cascade,
  run_attempt integer not null check (run_attempt >= 1),
  run_seed bigint not null check (run_seed >= 0),
  chapter integer not null check (chapter >= 1),
  room integer not null check (room between 1 and 50),
  user_id uuid not null references auth.users(id) on delete cascade,
  xp integer not null check (xp >= 0),
  dust integer not null check (dust >= 0),
  gold integer not null check (gold >= 0),
  created_at timestamptz not null default clock_timestamp(),
  claimed_at timestamptz,
  unique (lobby_id, run_attempt, chapter, room, user_id)
);

create index if not exists coop_run_checkpoints_user_updated_idx
  on public.coop_run_checkpoints (user_id, updated_at desc);
create index if not exists coop_run_checkpoints_lobby_progress_idx
  on public.coop_run_checkpoints (lobby_id, run_attempt, chapter desc, room desc, updated_at desc);
create index if not exists coop_room_reward_pending_user_idx
  on public.coop_room_reward_entitlements (user_id, created_at)
  where claimed_at is null;

alter table public.coop_run_checkpoints enable row level security;
alter table public.coop_room_reward_entitlements enable row level security;

revoke all on table public.coop_run_checkpoints from anon, authenticated;
revoke all on table public.coop_room_reward_entitlements from anon, authenticated;
grant select on table public.coop_run_checkpoints to authenticated;
grant select on table public.coop_room_reward_entitlements to authenticated;

drop policy if exists coop_run_checkpoints_read_members on public.coop_run_checkpoints;
create policy coop_run_checkpoints_read_members
  on public.coop_run_checkpoints
  for select
  to authenticated
  using (private.is_coop_lobby_member(lobby_id));

drop policy if exists coop_room_reward_read_own on public.coop_room_reward_entitlements;
create policy coop_room_reward_read_own
  on public.coop_room_reward_entitlements
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.save_my_coop_run_checkpoint(
  p_lobby_id uuid,
  p_run_seed bigint,
  p_chapter integer,
  p_room integer,
  p_room_clear boolean,
  p_snapshot jsonb
)
returns table (
  run_attempt integer,
  revision bigint,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_lobby public.coop_lobbies%rowtype;
  v_member public.coop_lobby_members%rowtype;
  v_checkpoint public.coop_run_checkpoints%rowtype;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_lobby_id is null then raise exception 'lobby required'; end if;
  if p_run_seed is null or p_run_seed < 0 then raise exception 'valid run seed required'; end if;
  if p_chapter is null or p_chapter < 1 then raise exception 'valid chapter required'; end if;
  if p_room is null or p_room < 1 or p_room > 50 then raise exception 'valid room required'; end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then raise exception 'checkpoint object required'; end if;
  if octet_length(p_snapshot::text) > 180000 then raise exception 'checkpoint too large'; end if;

  select lobby.* into v_lobby
  from public.coop_lobbies lobby
  where lobby.id = p_lobby_id
    and lobby.status = 'in_run'
    and lobby.run_seed = p_run_seed
    and lobby.expires_at > clock_timestamp()
  for update;

  if v_lobby.id is null then raise exception 'active coop run required'; end if;

  select member.* into v_member
  from public.coop_lobby_members member
  where member.lobby_id = v_lobby.id
    and member.user_id = v_user_id
    and member.left_at is null;

  if v_member.user_id is null then raise exception 'lobby membership required'; end if;

  insert into public.coop_run_checkpoints (
    lobby_id, run_attempt, user_id, run_seed, chapter, room, room_clear, snapshot, revision, updated_at
  ) values (
    v_lobby.id, v_lobby.run_attempt, v_user_id, v_lobby.run_seed,
    p_chapter, p_room, coalesce(p_room_clear, false), p_snapshot, 1, clock_timestamp()
  )
  on conflict on constraint coop_run_checkpoints_pkey do update
    set run_seed = excluded.run_seed,
        chapter = excluded.chapter,
        room = excluded.room,
        room_clear = excluded.room_clear,
        snapshot = excluded.snapshot,
        revision = public.coop_run_checkpoints.revision + 1,
        updated_at = clock_timestamp()
  returning * into v_checkpoint;

  update public.coop_lobby_members member
  set last_seen_at = clock_timestamp()
  where member.lobby_id = v_lobby.id
    and member.user_id = v_user_id;

  return query select v_checkpoint.run_attempt, v_checkpoint.revision, v_checkpoint.updated_at;
end;
$$;

create or replace function public.get_my_coop_run_checkpoint(
  p_lobby_id uuid,
  p_run_seed bigint
)
returns table (
  run_attempt integer,
  snapshot jsonb,
  chapter integer,
  room integer,
  authoritative_chapter integer,
  authoritative_room integer,
  revision bigint,
  updated_at timestamptz,
  used_host_fallback boolean
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_lobby public.coop_lobbies%rowtype;
  v_own public.coop_run_checkpoints%rowtype;
  v_host public.coop_run_checkpoints%rowtype;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;

  select lobby.* into v_lobby
  from public.coop_lobbies lobby
  where lobby.id = p_lobby_id
    and lobby.status = 'in_run'
    and lobby.run_seed = p_run_seed
    and lobby.expires_at > clock_timestamp();

  if v_lobby.id is null then return; end if;
  if not private.is_coop_lobby_member(v_lobby.id) then raise exception 'lobby membership required'; end if;

  select checkpoint.* into v_own
  from public.coop_run_checkpoints checkpoint
  where checkpoint.lobby_id = v_lobby.id
    and checkpoint.run_attempt = v_lobby.run_attempt
    and checkpoint.user_id = v_user_id;

  select checkpoint.* into v_host
  from public.coop_run_checkpoints checkpoint
  where checkpoint.lobby_id = v_lobby.id
    and checkpoint.run_attempt = v_lobby.run_attempt
    and checkpoint.user_id = v_lobby.host_user_id;

  if v_own.user_id is null and v_host.user_id is null then return; end if;

  return query select
    v_lobby.run_attempt,
    coalesce(v_own.snapshot, v_host.snapshot),
    coalesce(v_own.chapter, v_host.chapter, 1),
    coalesce(v_own.room, v_host.room, 1),
    coalesce(v_host.chapter, v_own.chapter, 1),
    coalesce(v_host.room, v_own.room, 1),
    coalesce(v_own.revision, v_host.revision, 0),
    coalesce(v_own.updated_at, v_host.updated_at, v_lobby.started_at, v_lobby.updated_at),
    v_own.user_id is null and v_host.user_id is not null;
end;
$$;

create or replace function private.coop_room_reward_values(p_chapter integer, p_room integer)
returns table (xp integer, dust integer, gold integer)
language sql
immutable
set search_path = pg_temp
as $$
  select
    case
      when p_room = 50 then 260 + greatest(1, p_chapter) * 30
      when p_room in (10, 20, 30, 40) then 130 + greatest(1, p_chapter) * 20
      else 14 + greatest(1, p_room) * 4 + greatest(0, greatest(1, p_chapter) - 1) * 8
    end::integer,
    round((case
      when p_room = 50 then 105 + greatest(1, p_chapter) * 15
      when p_room in (10, 20, 30, 40) then 55 + greatest(1, p_chapter) * 10
      else 4 + ceil(greatest(1, p_room) * 0.8)
    end) * 1.25)::integer,
    round((case
      when p_room = 50 then 900 + greatest(1, p_chapter) * 140
      when p_room in (10, 20, 30, 40) then 350 + greatest(1, p_chapter) * 70
      else 40 + greatest(1, p_room) * 18 + greatest(0, greatest(1, p_chapter) - 1) * 20
    end) * 1.25)::integer;
$$;

create or replace function public.prepare_coop_room_rewards(
  p_lobby_id uuid,
  p_run_seed bigint,
  p_chapter integer,
  p_room integer
)
returns integer
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_lobby public.coop_lobbies%rowtype;
  v_values record;
  v_inserted integer := 0;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;

  select lobby.* into v_lobby
  from public.coop_lobbies lobby
  where lobby.id = p_lobby_id
    and lobby.status = 'in_run'
    and lobby.run_seed = p_run_seed
    and lobby.expires_at > clock_timestamp()
  for update;

  if v_lobby.id is null then raise exception 'active coop run required'; end if;
  if not private.is_coop_lobby_member(v_lobby.id) then raise exception 'lobby membership required'; end if;

  if not exists (
    select 1
    from public.coop_run_checkpoints checkpoint
    where checkpoint.lobby_id = v_lobby.id
      and checkpoint.run_attempt = v_lobby.run_attempt
      and checkpoint.user_id = v_lobby.host_user_id
      and checkpoint.chapter = p_chapter
      and checkpoint.room = p_room
      and checkpoint.room_clear
  ) then
    raise exception 'host room-clear checkpoint required';
  end if;

  select * into v_values from private.coop_room_reward_values(p_chapter, p_room);

  insert into public.coop_room_reward_entitlements (
    lobby_id, run_attempt, run_seed, chapter, room, user_id, xp, dust, gold
  )
  select v_lobby.id, v_lobby.run_attempt, v_lobby.run_seed, p_chapter, p_room,
         member.user_id, v_values.xp, v_values.dust, v_values.gold
  from public.coop_lobby_members member
  where member.lobby_id = v_lobby.id
    and member.left_at is null
  on conflict on constraint coop_room_reward_entitlements_lobby_id_run_attempt_chapter_room_user_id_key do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function public.list_my_pending_coop_room_rewards(
  p_lobby_id uuid,
  p_run_seed bigint
)
returns table (
  entitlement_id uuid,
  run_attempt integer,
  chapter integer,
  room integer,
  xp integer,
  dust integer,
  gold integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_attempt integer;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if not private.is_coop_lobby_member(p_lobby_id) then raise exception 'lobby membership required'; end if;

  select lobby.run_attempt into v_attempt
  from public.coop_lobbies lobby
  where lobby.id = p_lobby_id
    and lobby.run_seed = p_run_seed
    and lobby.status = 'in_run';

  if v_attempt is null then return; end if;

  return query
  select reward.id, reward.run_attempt, reward.chapter, reward.room,
         reward.xp, reward.dust, reward.gold, reward.created_at
  from public.coop_room_reward_entitlements reward
  where reward.lobby_id = p_lobby_id
    and reward.run_seed = p_run_seed
    and reward.run_attempt = v_attempt
    and reward.user_id = v_user_id
    and reward.claimed_at is null
  order by reward.chapter, reward.room, reward.created_at;
end;
$$;

create or replace function public.ack_coop_room_reward(p_entitlement_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  update public.coop_room_reward_entitlements reward
  set claimed_at = coalesce(reward.claimed_at, clock_timestamp())
  where reward.id = p_entitlement_id
    and reward.user_id = auth.uid();

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

create or replace function public.restart_coop_run_attempt()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_lobby public.coop_lobbies%rowtype;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;

  select lobby.* into v_lobby
  from public.coop_lobbies lobby
  where lobby.host_user_id = v_user_id
    and lobby.status = 'in_run'
    and lobby.expires_at > clock_timestamp()
  order by lobby.updated_at desc
  limit 1
  for update;

  if v_lobby.id is null then raise exception 'active host run required'; end if;

  update public.coop_lobbies lobby
  set run_attempt = lobby.run_attempt + 1,
      started_at = clock_timestamp(),
      updated_at = clock_timestamp(),
      expires_at = greatest(lobby.expires_at, clock_timestamp() + interval '6 hours')
  where lobby.id = v_lobby.id
  returning * into v_lobby;

  return v_lobby.run_attempt;
end;
$$;

create or replace function public.leave_coop_lobby()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_member public.coop_lobby_members%rowtype;
  v_status text;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select member.*, lobby.status into v_member, v_status
  from public.coop_lobby_members member
  join public.coop_lobbies lobby on lobby.id = member.lobby_id
  where member.user_id = v_user_id
    and member.left_at is null
    and lobby.status <> 'closed'
  order by member.joined_at desc
  limit 1;

  if v_member.lobby_id is null then return false; end if;

  if v_member.role = 'host' or v_status = 'in_run' then
    update public.coop_lobbies lobby
    set status = 'closed', closed_at = v_now, updated_at = v_now
    where lobby.id = v_member.lobby_id;

    update public.coop_lobby_members member
    set left_at = coalesce(member.left_at, v_now), last_seen_at = v_now
    where member.lobby_id = v_member.lobby_id
      and member.left_at is null;
  else
    update public.coop_lobby_members member
    set left_at = v_now, ready = false, last_seen_at = v_now
    where member.lobby_id = v_member.lobby_id
      and member.user_id = v_user_id
      and member.left_at is null;

    update public.coop_lobby_members member
    set ready = false
    where member.lobby_id = v_member.lobby_id
      and member.left_at is null;

    update public.coop_lobbies lobby
    set status = 'waiting', updated_at = v_now
    where lobby.id = v_member.lobby_id
      and lobby.status <> 'closed';
  end if;

  return true;
end;
$$;

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
  v_lobby public.coop_lobbies%rowtype;
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

  select lobby.* into v_lobby
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

  if v_lobby.id is null then raise exception 'active host lobby required'; end if;

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
    abs(hashtextextended(p_lobby_id::text || ':' || p_run_seed::text || ':' || v_lobby.run_attempt::text || ':' || v_chapter::text || ':' || p_room::text, 7331)::numeric),
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
    lobby_id, run_seed, run_attempt, chapter, room, item_id, rarity, source
  ) values (
    p_lobby_id, p_run_seed, v_lobby.run_attempt, v_chapter, p_room,
    v_item_id, v_rarity, v_item_source
  )
  on conflict on constraint coop_boss_loot_rolls_lobby_attempt_room_key do nothing;

  select roll.id into v_roll_id
  from public.coop_boss_loot_rolls roll
  where roll.lobby_id = p_lobby_id
    and roll.run_seed = p_run_seed
    and roll.run_attempt = v_lobby.run_attempt
    and roll.chapter = v_chapter
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
  v_lobby public.coop_lobbies%rowtype;
  v_roll_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;

  select lobby.* into v_lobby
  from public.coop_lobbies lobby
  where lobby.id = p_lobby_id
    and lobby.run_seed = p_run_seed
    and lobby.status = 'in_run';

  if v_lobby.id is null then return; end if;
  if not private.is_coop_lobby_member(v_lobby.id) then raise exception 'lobby membership required'; end if;

  select roll.id into v_roll_id
  from public.coop_boss_loot_rolls roll
  where roll.lobby_id = p_lobby_id
    and roll.run_seed = p_run_seed
    and roll.run_attempt = v_lobby.run_attempt
    and roll.chapter = greatest(1, p_chapter)
    and roll.room = p_room;

  if v_roll_id is null then return; end if;
  perform private.resolve_coop_boss_loot(v_roll_id);
  return query select * from private.coop_boss_loot_snapshot(v_roll_id, v_user_id);
end;
$$;

revoke all on function private.coop_room_reward_values(integer, integer) from public, anon, authenticated;
revoke all on function public.save_my_coop_run_checkpoint(uuid, bigint, integer, integer, boolean, jsonb) from public, anon;
revoke all on function public.get_my_coop_run_checkpoint(uuid, bigint) from public, anon;
revoke all on function public.prepare_coop_room_rewards(uuid, bigint, integer, integer) from public, anon;
revoke all on function public.list_my_pending_coop_room_rewards(uuid, bigint) from public, anon;
revoke all on function public.ack_coop_room_reward(uuid) from public, anon;
revoke all on function public.restart_coop_run_attempt() from public, anon;
revoke all on function public.leave_coop_lobby() from public, anon;
revoke all on function public.open_coop_boss_loot(uuid, bigint, integer, integer) from public, anon;
revoke all on function public.get_coop_boss_loot(uuid, bigint, integer, integer) from public, anon;

grant execute on function public.save_my_coop_run_checkpoint(uuid, bigint, integer, integer, boolean, jsonb) to authenticated;
grant execute on function public.get_my_coop_run_checkpoint(uuid, bigint) to authenticated;
grant execute on function public.prepare_coop_room_rewards(uuid, bigint, integer, integer) to authenticated;
grant execute on function public.list_my_pending_coop_room_rewards(uuid, bigint) to authenticated;
grant execute on function public.ack_coop_room_reward(uuid) to authenticated;
grant execute on function public.restart_coop_run_attempt() to authenticated;
grant execute on function public.leave_coop_lobby() to authenticated;
grant execute on function public.open_coop_boss_loot(uuid, bigint, integer, integer) to authenticated;
grant execute on function public.get_coop_boss_loot(uuid, bigint, integer, integer) to authenticated;

notify pgrst, 'reload schema';