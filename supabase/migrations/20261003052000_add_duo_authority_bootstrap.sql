-- #461 Slice 3: durable server-owned Duo authority bootstrap and persistence boundary.
--
-- REPO ONLY. Do not apply this migration to production until the server reducer/Edge
-- producer, recorder integration, reconnect consumer and reward/loot cutover are all
-- independently accepted. This slice deliberately cannot record completion or mint grants.

alter table public.coop_lobby_members
  add column if not exists authority_class_key text not null default 'archer',
  add column if not exists authority_loadout_key text not null default 'canonical-base-v1';

alter table public.coop_lobby_members
  drop constraint if exists coop_lobby_members_authority_class_key_check;
alter table public.coop_lobby_members
  add constraint coop_lobby_members_authority_class_key_check
  check (authority_class_key = 'archer');

alter table public.coop_lobby_members
  drop constraint if exists coop_lobby_members_authority_loadout_key_check;
alter table public.coop_lobby_members
  add constraint coop_lobby_members_authority_loadout_key_check
  check (authority_loadout_key = 'canonical-base-v1');

comment on column public.coop_lobby_members.authority_class_key is
  'Server-owned pre-run class selection boundary. The shipped Duo runtime is currently archer-only; a future class-selection slice must replace this constraint and preserve per-attempt immutability.';
comment on column public.coop_lobby_members.authority_loadout_key is
  'Server-owned canonical loadout boundary. Client checkpoint, Realtime and host-memory loadouts are never authority inputs.';

create table if not exists private.coop_authority_runs (
  lobby_id uuid not null references public.coop_lobbies(id) on delete cascade,
  run_attempt integer not null check (run_attempt between 1 and 1000000),
  run_seed bigint not null check (run_seed >= 0),
  chapter integer not null default 1 check (chapter >= 1),
  room integer not null default 1 check (room between 1 and 50),
  encounter_id uuid not null default gen_random_uuid(),
  state_version bigint not null default 0 check (state_version >= 0),
  authority_version text not null default 'duo-authority-bootstrap-v1',
  status text not null default 'awaiting_canonical_state'
    check (status in ('awaiting_canonical_state', 'active', 'completed', 'invalidated')),
  canonical_snapshot jsonb,
  canonical_snapshot_digest text,
  started_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  primary key (lobby_id, run_attempt),
  unique (encounter_id),
  constraint coop_authority_runs_snapshot_object_check
    check (canonical_snapshot is null or jsonb_typeof(canonical_snapshot) = 'object'),
  constraint coop_authority_runs_snapshot_digest_check
    check (canonical_snapshot_digest is null or canonical_snapshot_digest ~ '^[0-9a-f]{64}$'),
  constraint coop_authority_runs_snapshot_pair_check
    check ((canonical_snapshot is null) = (canonical_snapshot_digest is null)),
  constraint coop_authority_runs_bootstrap_state_check
    check (status <> 'awaiting_canonical_state' or (state_version = 0 and canonical_snapshot is null)),
  constraint coop_authority_runs_completion_time_check
    check ((status = 'completed') = (completed_at is not null))
);

create table if not exists private.coop_authority_actors (
  lobby_id uuid not null,
  run_attempt integer not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('host', 'guest')),
  actor_slot smallint not null check (actor_slot in (0, 1)),
  class_key text not null check (class_key = 'archer'),
  loadout_key text not null check (loadout_key = 'canonical-base-v1'),
  last_intent_sequence bigint not null default 0 check (last_intent_sequence >= 0),
  snapshotted_at timestamptz not null default clock_timestamp(),
  primary key (lobby_id, run_attempt, user_id),
  unique (lobby_id, run_attempt, actor_slot),
  foreign key (lobby_id, run_attempt)
    references private.coop_authority_runs(lobby_id, run_attempt) on delete cascade
);

create table if not exists private.coop_authority_intent_receipts (
  lobby_id uuid not null,
  run_attempt integer not null,
  encounter_id uuid not null,
  intent_id uuid not null,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  actor_sequence bigint not null check (actor_sequence >= 1),
  expected_state_version bigint not null check (expected_state_version >= 0),
  intent_digest text not null check (intent_digest ~ '^[0-9a-f]{64}$'),
  result_state_version bigint not null check (result_state_version >= 1),
  result_snapshot jsonb not null check (jsonb_typeof(result_snapshot) = 'object'),
  result_snapshot_digest text not null check (result_snapshot_digest ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default clock_timestamp(),
  primary key (lobby_id, run_attempt, intent_id),
  unique (lobby_id, run_attempt, actor_user_id, actor_sequence),
  foreign key (lobby_id, run_attempt)
    references private.coop_authority_runs(lobby_id, run_attempt) on delete cascade
);

create index if not exists coop_authority_runs_reconnect_idx
  on private.coop_authority_runs (lobby_id, run_attempt, encounter_id, state_version);
create index if not exists coop_authority_intent_actor_sequence_idx
  on private.coop_authority_intent_receipts (lobby_id, run_attempt, actor_user_id, actor_sequence);

alter table private.coop_authority_runs enable row level security;
alter table private.coop_authority_runs force row level security;
alter table private.coop_authority_actors enable row level security;
alter table private.coop_authority_actors force row level security;
alter table private.coop_authority_intent_receipts enable row level security;
alter table private.coop_authority_intent_receipts force row level security;

revoke all on table private.coop_authority_runs from public, anon, authenticated, service_role;
revoke all on table private.coop_authority_actors from public, anon, authenticated, service_role;
revoke all on table private.coop_authority_intent_receipts from public, anon, authenticated, service_role;

create or replace function private.bootstrap_coop_authority_run(
  p_lobby_id uuid,
  p_run_attempt integer,
  p_run_seed bigint
)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_lobby public.coop_lobbies%rowtype;
  v_member_count integer;
  v_existing private.coop_authority_runs%rowtype;
  v_encounter_id uuid;
begin
  select lobby.* into v_lobby
  from public.coop_lobbies as lobby
  where lobby.id = p_lobby_id
  for update;

  if v_lobby.id is null
     or v_lobby.status <> 'in_run'
     or v_lobby.run_attempt <> p_run_attempt
     or v_lobby.run_seed <> p_run_seed then
    raise exception 'exact active coop run required';
  end if;

  select count(*) into v_member_count
  from public.coop_lobby_members as member
  where member.lobby_id = v_lobby.id
    and member.left_at is null
    and member.ready
    and member.authority_class_key = 'archer'
    and member.authority_loadout_key = 'canonical-base-v1';

  if v_member_count <> 2 then
    raise exception 'two trusted ready authority members required';
  end if;

  select authority_run.* into v_existing
  from private.coop_authority_runs as authority_run
  where authority_run.lobby_id = v_lobby.id
    and authority_run.run_attempt = v_lobby.run_attempt
  for update;

  if v_existing.lobby_id is not null then
    if v_existing.run_seed <> v_lobby.run_seed
       or v_existing.chapter <> 1
       or v_existing.room <> 1
       or v_existing.state_version <> 0
       or v_existing.status <> 'awaiting_canonical_state' then
      raise exception 'authority bootstrap conflict';
    end if;
    return v_existing.encounter_id;
  end if;

  update private.coop_authority_runs as prior
  set status = 'invalidated',
      updated_at = clock_timestamp()
  where prior.lobby_id = v_lobby.id
    and prior.run_attempt <> v_lobby.run_attempt
    and prior.status in ('awaiting_canonical_state', 'active');

  insert into private.coop_authority_runs (
    lobby_id, run_attempt, run_seed, chapter, room,
    state_version, authority_version, status
  ) values (
    v_lobby.id, v_lobby.run_attempt, v_lobby.run_seed, 1, 1,
    0, 'duo-authority-bootstrap-v1', 'awaiting_canonical_state'
  )
  returning encounter_id into v_encounter_id;

  insert into private.coop_authority_actors (
    lobby_id, run_attempt, user_id, role, actor_slot, class_key, loadout_key
  )
  select v_lobby.id,
         v_lobby.run_attempt,
         member.user_id,
         member.role,
         (row_number() over (
           order by case when member.role = 'host' then 0 else 1 end, member.joined_at, member.user_id
         ) - 1)::smallint,
         member.authority_class_key,
         member.authority_loadout_key
  from public.coop_lobby_members as member
  where member.lobby_id = v_lobby.id
    and member.left_at is null
    and member.ready;

  if (select count(*) from private.coop_authority_actors as actor
      where actor.lobby_id = v_lobby.id and actor.run_attempt = v_lobby.run_attempt) <> 2 then
    raise exception 'authority actor snapshot failed';
  end if;

  return v_encounter_id;
end;
$$;

revoke all on function private.bootstrap_coop_authority_run(uuid, integer, bigint)
  from public, anon, authenticated, service_role;

create or replace function public.read_coop_authority_state(
  p_lobby_id uuid,
  p_run_attempt integer
)
returns table (
  lobby_id uuid,
  run_attempt integer,
  run_seed bigint,
  chapter integer,
  room integer,
  encounter_id uuid,
  state_version bigint,
  authority_version text,
  status text,
  canonical_snapshot jsonb,
  canonical_snapshot_digest text,
  actors jsonb,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  return query
  select authority_run.lobby_id,
         authority_run.run_attempt,
         authority_run.run_seed,
         authority_run.chapter,
         authority_run.room,
         authority_run.encounter_id,
         authority_run.state_version,
         authority_run.authority_version,
         authority_run.status,
         authority_run.canonical_snapshot,
         authority_run.canonical_snapshot_digest,
         coalesce(jsonb_agg(jsonb_build_object(
           'user_id', actor.user_id,
           'role', actor.role,
           'actor_slot', actor.actor_slot,
           'class_key', actor.class_key,
           'loadout_key', actor.loadout_key,
           'last_intent_sequence', actor.last_intent_sequence
         ) order by actor.actor_slot) filter (where actor.user_id is not null), '[]'::jsonb),
         authority_run.updated_at
  from public.coop_lobbies as lobby
  join private.coop_authority_runs as authority_run
    on authority_run.lobby_id = lobby.id
   and authority_run.run_attempt = lobby.run_attempt
  left join private.coop_authority_actors as actor
    on actor.lobby_id = authority_run.lobby_id
   and actor.run_attempt = authority_run.run_attempt
  where lobby.id = p_lobby_id
    and lobby.status = 'in_run'
    and lobby.run_attempt = p_run_attempt
    and authority_run.status <> 'invalidated'
  group by authority_run.lobby_id, authority_run.run_attempt, authority_run.run_seed,
           authority_run.chapter, authority_run.room, authority_run.encounter_id,
           authority_run.state_version, authority_run.authority_version, authority_run.status,
           authority_run.canonical_snapshot, authority_run.canonical_snapshot_digest,
           authority_run.updated_at;
end;
$$;

revoke all on function public.read_coop_authority_state(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.read_coop_authority_state(uuid, integer) to service_role;

create or replace function public.persist_coop_authority_transition(
  p_lobby_id uuid,
  p_run_attempt integer,
  p_encounter_id uuid,
  p_actor_user_id uuid,
  p_intent_id uuid,
  p_actor_sequence bigint,
  p_expected_state_version bigint,
  p_intent_digest text,
  p_next_snapshot jsonb,
  p_next_snapshot_digest text
)
returns table (
  state_version bigint,
  canonical_snapshot jsonb,
  canonical_snapshot_digest text,
  replayed boolean
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_lobby public.coop_lobbies%rowtype;
  v_run private.coop_authority_runs%rowtype;
  v_actor private.coop_authority_actors%rowtype;
  v_receipt private.coop_authority_intent_receipts%rowtype;
  v_next_version bigint;
begin
  if p_lobby_id is null or p_run_attempt is null or p_encounter_id is null
     or p_actor_user_id is null or p_intent_id is null then
    raise exception 'complete authority identity required';
  end if;
  if p_actor_sequence is null or p_actor_sequence < 1 then raise exception 'invalid actor sequence'; end if;
  if p_expected_state_version is null or p_expected_state_version < 0 then raise exception 'invalid expected state version'; end if;
  if p_intent_digest is null or p_intent_digest !~ '^[0-9a-f]{64}$' then raise exception 'invalid intent digest'; end if;
  if p_next_snapshot is null or jsonb_typeof(p_next_snapshot) <> 'object' then raise exception 'canonical snapshot object required'; end if;
  if octet_length(p_next_snapshot::text) > 180000 then raise exception 'canonical snapshot too large'; end if;
  if p_next_snapshot_digest is null or p_next_snapshot_digest !~ '^[0-9a-f]{64}$' then raise exception 'invalid snapshot digest'; end if;

  select lobby.* into v_lobby
  from public.coop_lobbies as lobby
  where lobby.id = p_lobby_id
    and lobby.status = 'in_run'
    and lobby.run_attempt = p_run_attempt
    and lobby.expires_at > clock_timestamp()
  for update;
  if v_lobby.id is null then raise exception 'exact active coop attempt required'; end if;

  if not exists (
    select 1
    from public.coop_lobby_members as active_member
    where active_member.lobby_id = p_lobby_id
      and active_member.user_id = p_actor_user_id
      and active_member.left_at is null
  ) then
    raise exception 'active coop membership required';
  end if;

  select receipt.* into v_receipt
  from private.coop_authority_intent_receipts as receipt
  where receipt.lobby_id = p_lobby_id
    and receipt.run_attempt = p_run_attempt
    and receipt.intent_id = p_intent_id;

  if v_receipt.intent_id is not null then
    if v_receipt.encounter_id <> p_encounter_id
       or v_receipt.actor_user_id <> p_actor_user_id
       or v_receipt.actor_sequence <> p_actor_sequence
       or v_receipt.expected_state_version <> p_expected_state_version
       or v_receipt.intent_digest <> p_intent_digest then
      raise exception 'authority intent replay conflict';
    end if;
    return query select v_receipt.result_state_version,
                        v_receipt.result_snapshot,
                        v_receipt.result_snapshot_digest,
                        true;
    return;
  end if;

  select authority_run.* into v_run
  from private.coop_authority_runs as authority_run
  where authority_run.lobby_id = p_lobby_id
    and authority_run.run_attempt = p_run_attempt
    and authority_run.encounter_id = p_encounter_id
  for update;
  if v_run.lobby_id is null or v_run.status not in ('awaiting_canonical_state', 'active') then
    raise exception 'mutable authority encounter required';
  end if;
  if v_run.run_seed <> v_lobby.run_seed then raise exception 'authority run seed conflict'; end if;
  if v_run.state_version <> p_expected_state_version then raise exception 'authority state version conflict'; end if;

  select actor.* into v_actor
  from private.coop_authority_actors as actor
  where actor.lobby_id = p_lobby_id
    and actor.run_attempt = p_run_attempt
    and actor.user_id = p_actor_user_id
  for update;
  if v_actor.user_id is null then raise exception 'authority actor membership required'; end if;
  if p_actor_sequence <> v_actor.last_intent_sequence + 1 then raise exception 'authority actor sequence gap'; end if;

  v_next_version := v_run.state_version + 1;
  update private.coop_authority_runs as authority_run
  set state_version = v_next_version,
      status = 'active',
      canonical_snapshot = p_next_snapshot,
      canonical_snapshot_digest = p_next_snapshot_digest,
      updated_at = clock_timestamp()
  where authority_run.lobby_id = p_lobby_id
    and authority_run.run_attempt = p_run_attempt
    and authority_run.encounter_id = p_encounter_id
    and authority_run.state_version = p_expected_state_version;
  if not found then raise exception 'authority compare-and-swap conflict'; end if;

  update private.coop_authority_actors as actor
  set last_intent_sequence = p_actor_sequence
  where actor.lobby_id = p_lobby_id
    and actor.run_attempt = p_run_attempt
    and actor.user_id = p_actor_user_id;

  insert into private.coop_authority_intent_receipts (
    lobby_id, run_attempt, encounter_id, intent_id, actor_user_id, actor_sequence,
    expected_state_version, intent_digest, result_state_version,
    result_snapshot, result_snapshot_digest
  ) values (
    p_lobby_id, p_run_attempt, p_encounter_id, p_intent_id, p_actor_user_id, p_actor_sequence,
    p_expected_state_version, p_intent_digest, v_next_version,
    p_next_snapshot, p_next_snapshot_digest
  );

  return query select v_next_version, p_next_snapshot, p_next_snapshot_digest, false;
end;
$$;

revoke all on function public.persist_coop_authority_transition(
  uuid, integer, uuid, uuid, uuid, bigint, bigint, text, jsonb, text
) from public, anon, authenticated;
grant execute on function public.persist_coop_authority_transition(
  uuid, integer, uuid, uuid, uuid, bigint, bigint, text, jsonb, text
) to service_role;

comment on function public.persist_coop_authority_transition(
  uuid, integer, uuid, uuid, uuid, bigint, bigint, text, jsonb, text
) is 'Service-role-only persistence for transitions already computed by the trusted reducer. It is not a client endpoint, does not accept completion/clear, and cannot invoke the completion recorder.';

create or replace function public.start_coop_lobby()
returns table (
  lobby_id uuid,
  invite_code text,
  status text,
  run_seed bigint,
  role text,
  ready boolean,
  host_user_id uuid,
  created_at timestamptz,
  expires_at timestamptz,
  started_at timestamptz,
  server_now timestamptz
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_lobby public.coop_lobbies%rowtype;
  v_count integer;
  v_all_ready boolean;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select target_lobby.* into v_lobby
  from public.coop_lobbies as target_lobby
  where target_lobby.host_user_id = v_user_id
    and target_lobby.status in ('waiting', 'ready')
    and target_lobby.expires_at > v_now
  order by target_lobby.updated_at desc
  limit 1
  for update of target_lobby;
  if v_lobby.id is null then raise exception 'host coop lobby required'; end if;

  select count(*), coalesce(bool_and(active_member.ready), false)
  into v_count, v_all_ready
  from public.coop_lobby_members as active_member
  where active_member.lobby_id = v_lobby.id
    and active_member.left_at is null;
  if v_count <> 2 then raise exception 'two active coop players required'; end if;
  if not v_all_ready then raise exception 'both coop players must be ready'; end if;

  update public.coop_lobbies as target_lobby
  set status = 'in_run',
      started_at = v_now,
      updated_at = v_now,
      expires_at = greatest(target_lobby.expires_at, v_now + interval '6 hours')
  where target_lobby.id = v_lobby.id
  returning target_lobby.* into v_lobby;

  perform private.bootstrap_coop_authority_run(v_lobby.id, v_lobby.run_attempt, v_lobby.run_seed);

  return query
  select v_lobby.id, v_lobby.invite_code, v_lobby.status, v_lobby.run_seed,
         active_member.role, active_member.ready, v_lobby.host_user_id,
         v_lobby.created_at, v_lobby.expires_at, v_lobby.started_at, v_now
  from public.coop_lobby_members as active_member
  where active_member.lobby_id = v_lobby.id
    and active_member.user_id = v_user_id
    and active_member.left_at is null;
end;
$$;

revoke all on function public.start_coop_lobby() from public, anon;
grant execute on function public.start_coop_lobby() to authenticated;

create or replace function public.restart_coop_run_attempt()
returns integer
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_lobby public.coop_lobbies%rowtype;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;

  select lobby.* into v_lobby
  from public.coop_lobbies as lobby
  where lobby.host_user_id = v_user_id
    and lobby.status = 'in_run'
    and lobby.expires_at > clock_timestamp()
  order by lobby.updated_at desc
  limit 1
  for update;
  if v_lobby.id is null then raise exception 'active host run required'; end if;
  if v_lobby.run_attempt >= 1000000 then raise exception 'coop run attempt limit reached'; end if;

  update public.coop_lobbies as lobby
  set run_attempt = lobby.run_attempt + 1,
      started_at = clock_timestamp(),
      updated_at = clock_timestamp(),
      expires_at = greatest(lobby.expires_at, clock_timestamp() + interval '6 hours')
  where lobby.id = v_lobby.id
  returning lobby.* into v_lobby;

  perform private.bootstrap_coop_authority_run(v_lobby.id, v_lobby.run_attempt, v_lobby.run_seed);
  return v_lobby.run_attempt;
end;
$$;

revoke all on function public.restart_coop_run_attempt() from public, anon;
grant execute on function public.restart_coop_run_attempt() to authenticated;

select pg_notify('pgrst', 'reload schema');
