-- #461 Slice 4: atomically connect the trusted Edge reducer persistence to the
-- already fail-closed trusted-completion ledger. Repo-only until the complete
-- producer/reconnect/reward journey is independently accepted.

alter function public.record_trusted_coop_completion(
  uuid, integer, bigint, integer, integer, text, bigint, text
) set search_path = '';

create or replace function public.persist_coop_authority_transition_and_record(
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
set search_path = ''
as $$
declare
  v_result record;
  v_run private.coop_authority_runs%rowtype;
  v_completed boolean;
begin
  select * into v_result
  from public.persist_coop_authority_transition(
    p_lobby_id, p_run_attempt, p_encounter_id, p_actor_user_id, p_intent_id,
    p_actor_sequence, p_expected_state_version, p_intent_digest,
    p_next_snapshot, p_next_snapshot_digest
  );

  select authority_run.* into v_run
  from private.coop_authority_runs as authority_run
  where authority_run.lobby_id = p_lobby_id
    and authority_run.run_attempt = p_run_attempt;
  if v_run.lobby_id is null then raise exception 'persisted authority run required'; end if;

  -- The exact receipt is durable across encounter advance. This is the lost-response
  -- recovery path: it returns the already committed result but can never mutate the
  -- current encounter or create a second proof.
  if v_result.replayed and v_run.encounter_id <> p_encounter_id then
    if v_result.canonical_snapshot ->> 'runId' is distinct from p_lobby_id::text
       or (v_result.canonical_snapshot ->> 'runAttempt')::integer is distinct from p_run_attempt
       or v_result.canonical_snapshot ->> 'encounterId' is distinct from p_encounter_id::text
       or (v_result.canonical_snapshot ->> 'version')::bigint is distinct from v_result.state_version then
      raise exception 'canonical replay binding conflict';
    end if;
    return query select v_result.state_version,
                        v_result.canonical_snapshot,
                        v_result.canonical_snapshot_digest,
                        true;
    return;
  end if;
  if v_run.encounter_id <> p_encounter_id then raise exception 'authority encounter conflict'; end if;

  if v_result.canonical_snapshot ->> 'runId' is distinct from p_lobby_id::text
     or (v_result.canonical_snapshot ->> 'runAttempt')::integer is distinct from p_run_attempt
     or (v_result.canonical_snapshot ->> 'seed')::bigint is distinct from v_run.run_seed
     or (v_result.canonical_snapshot ->> 'chapter')::integer is distinct from v_run.chapter
     or (v_result.canonical_snapshot ->> 'room')::integer is distinct from v_run.room
     or v_result.canonical_snapshot ->> 'encounterId' is distinct from p_encounter_id::text
     or (v_result.canonical_snapshot ->> 'version')::bigint is distinct from v_result.state_version then
    raise exception 'canonical completion binding conflict';
  end if;

  v_completed := coalesce((v_result.canonical_snapshot ->> 'completed')::boolean, false);
  if v_completed then
    if jsonb_typeof(v_result.canonical_snapshot -> 'enemies') <> 'array'
       or jsonb_array_length(v_result.canonical_snapshot -> 'enemies') < 1
       or exists (
         select 1
         from jsonb_array_elements(v_result.canonical_snapshot -> 'enemies') as enemy
         where coalesce((enemy ->> 'hp')::numeric, 1) > 0
       ) then
      raise exception 'canonical completion requires zero living enemies';
    end if;

    perform public.record_trusted_coop_completion(
      p_lobby_id,
      p_run_attempt,
      v_run.run_seed,
      v_run.chapter,
      v_run.room,
      v_run.authority_version,
      v_result.state_version,
      v_result.canonical_snapshot_digest
    );

    update private.coop_authority_runs as authority_run
    set status = 'completed',
        completed_at = coalesce(authority_run.completed_at, clock_timestamp()),
        updated_at = clock_timestamp()
    where authority_run.lobby_id = p_lobby_id
      and authority_run.run_attempt = p_run_attempt
      and authority_run.encounter_id = p_encounter_id;
  end if;

  return query select v_result.state_version,
                      v_result.canonical_snapshot,
                      v_result.canonical_snapshot_digest,
                      v_result.replayed;
end;
$$;

revoke all on function public.persist_coop_authority_transition_and_record(
  uuid, integer, uuid, uuid, uuid, bigint, bigint, text, jsonb, text
) from public, anon, authenticated;
grant execute on function public.persist_coop_authority_transition_and_record(
  uuid, integer, uuid, uuid, uuid, bigint, bigint, text, jsonb, text
) to service_role;

comment on function public.persist_coop_authority_transition_and_record(
  uuid, integer, uuid, uuid, uuid, bigint, bigint, text, jsonb, text
) is 'Service-role-only atomic CAS plus trusted completion recorder boundary. Completion identity is derived from the durable authority run and persisted canonical snapshot, never from client checkpoint fields.';

create or replace function public.advance_coop_authority_encounter(
  p_lobby_id uuid,
  p_run_attempt integer,
  p_completed_encounter_id uuid,
  p_actor_user_id uuid
)
returns table (
  chapter integer,
  room integer,
  encounter_id uuid,
  state_version bigint,
  status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lobby public.coop_lobbies%rowtype;
  v_run private.coop_authority_runs%rowtype;
  v_next_chapter integer;
  v_next_room integer;
  v_next_encounter_id uuid := gen_random_uuid();
begin
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
    from public.coop_lobby_members as member
    where member.lobby_id = p_lobby_id
      and member.user_id = p_actor_user_id
      and member.left_at is null
  ) then
    raise exception 'active coop membership required';
  end if;

  select authority_run.* into v_run
  from private.coop_authority_runs as authority_run
  where authority_run.lobby_id = p_lobby_id
    and authority_run.run_attempt = p_run_attempt
  for update;
  if v_run.lobby_id is null
     or v_run.encounter_id <> p_completed_encounter_id
     or v_run.status <> 'completed' then
    raise exception 'exact completed authority encounter required';
  end if;
  if v_run.run_seed <> v_lobby.run_seed then raise exception 'authority run seed conflict'; end if;
  if not exists (
    select 1
    from public.coop_trusted_encounter_completions as proof
    where proof.lobby_id = v_run.lobby_id
      and proof.run_attempt = v_run.run_attempt
      and proof.run_seed = v_run.run_seed
      and proof.chapter = v_run.chapter
      and proof.room = v_run.room
      and proof.authority_version = v_run.authority_version
      and proof.final_state_seq = v_run.state_version
      and proof.completion_digest = v_run.canonical_snapshot_digest
  ) then
    raise exception 'exact trusted completion proof required';
  end if;

  if v_run.room = 50 then
    v_next_chapter := v_run.chapter + 1;
    v_next_room := 1;
  else
    v_next_chapter := v_run.chapter;
    v_next_room := v_run.room + 1;
  end if;

  update private.coop_authority_runs as authority_run
  set chapter = v_next_chapter,
      room = v_next_room,
      encounter_id = v_next_encounter_id,
      state_version = 0,
      status = 'awaiting_canonical_state',
      canonical_snapshot = null,
      canonical_snapshot_digest = null,
      completed_at = null,
      updated_at = clock_timestamp()
  where authority_run.lobby_id = p_lobby_id
    and authority_run.run_attempt = p_run_attempt
    and authority_run.encounter_id = p_completed_encounter_id
    and authority_run.status = 'completed';
  if not found then raise exception 'authority encounter advance conflict'; end if;

  return query select v_next_chapter, v_next_room, v_next_encounter_id,
                      0::bigint, 'awaiting_canonical_state'::text;
end;
$$;

revoke all on function public.advance_coop_authority_encounter(uuid, integer, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.advance_coop_authority_encounter(uuid, integer, uuid, uuid)
  to service_role;

comment on function public.advance_coop_authority_encounter(uuid, integer, uuid, uuid) is
  'Service-role-only encounter advance. Progression is derived from an exact durable completion and matching trusted proof; callers cannot supply chapter or room.';

select pg_notify('pgrst', 'reload schema');
