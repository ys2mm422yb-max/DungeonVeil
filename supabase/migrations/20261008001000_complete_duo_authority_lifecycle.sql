-- #461 complete server-owned Duo retry/exit lifecycle contracts.
-- REPO ONLY. Apply only after the complete authority cutover is independently accepted.

create table private.coop_authority_attempt_receipts (
  lobby_id uuid not null,
  source_run_attempt integer not null check (source_run_attempt > 0),
  action text not null check (action in ('restart', 'exit')),
  request_id uuid not null,
  actor_user_id uuid not null,
  result_run_attempt integer,
  result_encounter_id uuid,
  result_status text not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (lobby_id, source_run_attempt, action, request_id)
);

alter table private.coop_authority_attempt_receipts enable row level security;
alter table private.coop_authority_attempt_receipts force row level security;
revoke all on private.coop_authority_attempt_receipts from public, anon, authenticated, service_role;

create or replace function public.restart_coop_authority_attempt(
  p_lobby_id uuid,
  p_run_attempt integer,
  p_request_id uuid
)
returns table (
  run_attempt integer,
  run_seed bigint,
  encounter_id uuid,
  status text,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_lobby public.coop_lobbies%rowtype;
  v_run private.coop_authority_runs%rowtype;
  v_receipt private.coop_authority_attempt_receipts%rowtype;
  v_encounter_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_run_attempt < 1 then raise exception 'positive run attempt required'; end if;

  select receipt.* into v_receipt
  from private.coop_authority_attempt_receipts as receipt
  where receipt.lobby_id = p_lobby_id
    and receipt.source_run_attempt = p_run_attempt
    and receipt.action = 'restart'
    and receipt.request_id = p_request_id;
  if v_receipt.lobby_id is not null then
    if v_receipt.actor_user_id <> v_user_id then raise exception 'restart receipt actor conflict'; end if;
    return query select v_receipt.result_run_attempt,
                        (select lobby.run_seed from public.coop_lobbies as lobby where lobby.id = p_lobby_id),
                        v_receipt.result_encounter_id,
                        v_receipt.result_status,
                        true;
    return;
  end if;

  select lobby.* into v_lobby
  from public.coop_lobbies as lobby
  where lobby.id = p_lobby_id
    and lobby.run_attempt = p_run_attempt
    and lobby.status = 'in_run'
    and lobby.expires_at > clock_timestamp()
  for update;
  if v_lobby.id is null then
    select receipt.* into v_receipt
    from private.coop_authority_attempt_receipts as receipt
    where receipt.lobby_id = p_lobby_id
      and receipt.source_run_attempt = p_run_attempt
      and receipt.action = 'restart'
      and receipt.request_id = p_request_id;
    if v_receipt.lobby_id is not null and v_receipt.actor_user_id = v_user_id then
      return query select v_receipt.result_run_attempt,
                          (select lobby.run_seed from public.coop_lobbies as lobby where lobby.id = p_lobby_id),
                          v_receipt.result_encounter_id,
                          v_receipt.result_status,
                          true;
      return;
    end if;
    raise exception 'exact active coop attempt required';
  end if;
  if v_lobby.host_user_id <> v_user_id then raise exception 'active host run required'; end if;
  if not exists (
    select 1 from public.coop_lobby_members as member
    where member.lobby_id = p_lobby_id
      and member.user_id = v_user_id
      and member.role = 'host'
      and member.left_at is null
  ) then
    raise exception 'active host membership required';
  end if;
  if v_lobby.run_attempt >= 1000000 then raise exception 'coop run attempt limit reached'; end if;

  select authority_run.* into v_run
  from private.coop_authority_runs as authority_run
  where authority_run.lobby_id = p_lobby_id
    and authority_run.run_attempt = p_run_attempt
  for update;
  if v_run.lobby_id is null
     or v_run.status <> 'active'
     or coalesce(v_run.canonical_snapshot ->> 'lifecycle', '') <> 'team-defeated' then
    raise exception 'canonical team defeat required';
  end if;

  update public.coop_lobbies as lobby
  set run_attempt = lobby.run_attempt + 1,
      started_at = clock_timestamp(),
      updated_at = clock_timestamp(),
      expires_at = greatest(lobby.expires_at, clock_timestamp() + interval '6 hours')
  where lobby.id = p_lobby_id
    and lobby.run_attempt = p_run_attempt
  returning lobby.* into v_lobby;
  if v_lobby.id is null then raise exception 'authority restart conflict'; end if;

  v_encounter_id := private.bootstrap_coop_authority_run(v_lobby.id, v_lobby.run_attempt, v_lobby.run_seed);

  insert into private.coop_authority_attempt_receipts (
    lobby_id, source_run_attempt, action, request_id, actor_user_id,
    result_run_attempt, result_encounter_id, result_status
  ) values (
    p_lobby_id, p_run_attempt, 'restart', p_request_id, v_user_id,
    v_lobby.run_attempt, v_encounter_id, 'awaiting_canonical_state'
  );

  return query select v_lobby.run_attempt, v_lobby.run_seed, v_encounter_id,
                      'awaiting_canonical_state'::text, false;
end;
$$;

revoke all on function public.restart_coop_authority_attempt(uuid, integer, uuid)
  from public, anon, service_role;
grant execute on function public.restart_coop_authority_attempt(uuid, integer, uuid)
  to authenticated;

create or replace function public.exit_my_coop_authority_attempt(
  p_lobby_id uuid,
  p_run_attempt integer,
  p_request_id uuid
)
returns table (
  run_attempt integer,
  status text,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_lobby public.coop_lobbies%rowtype;
  v_receipt private.coop_authority_attempt_receipts%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_run_attempt < 1 then raise exception 'positive run attempt required'; end if;

  select receipt.* into v_receipt
  from private.coop_authority_attempt_receipts as receipt
  where receipt.lobby_id = p_lobby_id
    and receipt.source_run_attempt = p_run_attempt
    and receipt.action = 'exit'
    and receipt.request_id = p_request_id;
  if v_receipt.lobby_id is not null then
    if v_receipt.actor_user_id <> v_user_id then raise exception 'exit receipt actor conflict'; end if;
    return query select v_receipt.result_run_attempt, v_receipt.result_status, true;
    return;
  end if;

  select lobby.* into v_lobby
  from public.coop_lobbies as lobby
  where lobby.id = p_lobby_id
    and lobby.run_attempt = p_run_attempt
    and lobby.status = 'in_run'
  for update;
  if v_lobby.id is null then
    select receipt.* into v_receipt
    from private.coop_authority_attempt_receipts as receipt
    where receipt.lobby_id = p_lobby_id
      and receipt.source_run_attempt = p_run_attempt
      and receipt.action = 'exit'
      and receipt.request_id = p_request_id;
    if v_receipt.lobby_id is not null and v_receipt.actor_user_id = v_user_id then
      return query select v_receipt.result_run_attempt, v_receipt.result_status, true;
      return;
    end if;
    raise exception 'exact active coop attempt required';
  end if;
  if not exists (
    select 1 from public.coop_lobby_members as member
    where member.lobby_id = p_lobby_id
      and member.user_id = v_user_id
      and member.left_at is null
  ) then
    raise exception 'active coop membership required';
  end if;

  update public.coop_lobbies as lobby
  set status = 'closed',
      updated_at = v_now
  where lobby.id = p_lobby_id
    and lobby.run_attempt = p_run_attempt
    and lobby.status = 'in_run';
  if not found then raise exception 'authority exit conflict'; end if;

  update public.coop_lobby_members as member
  set left_at = coalesce(member.left_at, v_now)
  where member.lobby_id = p_lobby_id
    and member.left_at is null;

  update private.coop_authority_runs as authority_run
  set status = 'invalidated',
      updated_at = v_now
  where authority_run.lobby_id = p_lobby_id
    and authority_run.run_attempt = p_run_attempt
    and authority_run.status <> 'invalidated';

  insert into private.coop_authority_attempt_receipts (
    lobby_id, source_run_attempt, action, request_id, actor_user_id,
    result_run_attempt, result_status
  ) values (
    p_lobby_id, p_run_attempt, 'exit', p_request_id, v_user_id,
    p_run_attempt, 'closed'
  );

  return query select p_run_attempt, 'closed'::text, false;
end;
$$;

revoke all on function public.exit_my_coop_authority_attempt(uuid, integer, uuid)
  from public, anon, service_role;
grant execute on function public.exit_my_coop_authority_attempt(uuid, integer, uuid)
  to authenticated;

comment on function public.restart_coop_authority_attempt(uuid, integer, uuid) is
  'Authenticated host-only idempotent retry after canonical team defeat. Creates a fresh authority attempt and invalidates the prior mutable attempt.';
comment on function public.exit_my_coop_authority_attempt(uuid, integer, uuid) is
  'Authenticated idempotent Duo exit. Atomically closes the lobby, leaves both run members and invalidates the exact authority attempt.';

select pg_notify('pgrst', 'reload schema');
