begin;

create table public.guild_raid_reward_entitlements (
  id uuid primary key default gen_random_uuid(),
  raid_run_id uuid not null references public.guild_raid_runs(id) on delete cascade,
  guild_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  gold integer not null check (gold >= 0),
  dust integer not null check (dust >= 0),
  rank_xp integer not null check (rank_xp >= 0),
  eligible boolean not null default true,
  ineligible_reason text,
  created_at timestamptz not null default clock_timestamp(),
  claimed_at timestamptz,
  unique (raid_run_id, user_id)
);

create index guild_raid_reward_user_pending_idx
  on public.guild_raid_reward_entitlements (user_id, created_at)
  where claimed_at is null;
create index guild_raid_reward_guild_week_idx
  on public.guild_raid_reward_entitlements (guild_id, created_at desc);

alter table public.guild_raid_reward_entitlements enable row level security;
revoke all on table public.guild_raid_reward_entitlements from anon, authenticated;
grant select on table public.guild_raid_reward_entitlements to authenticated;
create policy guild_raid_reward_read_own
  on public.guild_raid_reward_entitlements
  for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function private.guild_raid_initial_boss_state()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'phase', 'veil-armor', 'revision', 0,
    'maxHealth', 1200000, 'health', 1200000,
    'phaseStartedRevision', 0,
    'attunements', jsonb_build_object('1', null, '2', null, '3', null, '4', null),
    'armorBreakers', '[]'::jsonb,
    'boundEchoes', '{}'::jsonb,
    'collapsePulse', 0,
    'collapseContributors', '[]'::jsonb,
    'damageWindowRevision', 0,
    'damageWindowOpen', false,
    'defeatedAtRevision', null
  );
$$;

create or replace function private.guild_raid_jsonb_add_unique(p_values jsonb, p_value integer)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
  from (
    select distinct value
    from (
      select jsonb_array_elements_text(coalesce(p_values, '[]'::jsonb))::integer as value
      union all select p_value
    ) valueset
  ) unique_values;
$$;

create or replace function public.guild_raid_boss_action(
  p_raid_run_id uuid,
  p_expected_state_version bigint,
  p_idempotency_key uuid,
  p_action jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_run public.guild_raid_runs%rowtype;
  v_room public.guild_raid_room_states%rowtype;
  v_participant public.guild_raid_participants%rowtype;
  v_existing jsonb;
  v_state jsonb;
  v_action text;
  v_slot integer;
  v_revision bigint;
  v_window_revision bigint;
  v_phase text;
  v_health integer;
  v_damage integer := 60000;
  v_values jsonb;
  v_count integer;
  v_next_version bigint;
  v_response jsonb;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_raid_run_id is null or p_idempotency_key is null then raise exception 'raid run and idempotency key required'; end if;
  if p_expected_state_version is null or p_expected_state_version < 1 then raise exception 'expected state version required'; end if;
  if p_action is null or jsonb_typeof(p_action) <> 'object' then raise exception 'boss action object required'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_raid_run_id::text || ':' || p_idempotency_key::text, 9414));
  select event.response into v_existing
  from public.guild_raid_run_events event
  where event.raid_run_id = p_raid_run_id and event.idempotency_key = p_idempotency_key;
  if v_existing is not null then return v_existing; end if;

  select * into v_run from public.guild_raid_runs where id = p_raid_run_id for update;
  if v_run.id is null then raise exception 'raid run not found'; end if;
  if v_run.status not in ('created', 'active') then raise exception 'raid run is not mutable'; end if;
  if v_run.state_version <> p_expected_state_version then raise exception 'stale raid state version'; end if;
  if v_run.current_room <> 10 then raise exception 'raid boss requires room 10'; end if;

  select * into v_participant from public.guild_raid_participants
  where raid_run_id = p_raid_run_id and user_id = v_user_id and status in ('active', 'disconnected');
  if v_participant.user_id is null then raise exception 'active raid participation required'; end if;
  v_slot := v_participant.slot;

  select * into v_room from public.guild_raid_room_states
  where raid_run_id = p_raid_run_id and room_number = 10 and room_epoch = v_run.room_epoch for update;
  if v_room.raid_run_id is null then raise exception 'raid room state missing'; end if;
  if not (coalesce(v_room.mechanic_state #>> '{block13,bossHandoffReady}', 'false')::boolean
      and coalesce(v_room.mechanic_state #>> '{block13,phase}', '') = 'cleared')
      and v_room.boss_state is null then
    raise exception 'raid boss not unlocked';
  end if;

  v_state := coalesce(v_room.boss_state, private.guild_raid_initial_boss_state());
  v_action := p_action->>'type';
  v_phase := coalesce(v_state->>'phase', 'veil-armor');
  v_revision := coalesce((v_state->>'revision')::bigint, 0) + 1;
  v_state := jsonb_set(v_state, '{revision}', to_jsonb(v_revision));

  if v_phase = 'defeated' then
    null;
  elsif v_action = 'attune' and v_phase = 'veil-armor' then
    if p_action->>'sigil' not in ('sun','moon') then raise exception 'invalid sigil'; end if;
    v_state := jsonb_set(v_state, array['attunements', v_slot::text], to_jsonb(p_action->>'sigil'));
    select count(*) into v_count from jsonb_each_text(v_state->'attunements') where value = 'sun';
    if v_count = 2 then
      select count(*) into v_count from jsonb_each_text(v_state->'attunements') where value = 'moon';
      if v_count = 2 then
        v_window_revision := coalesce((v_state->>'damageWindowRevision')::bigint, 0) + 1;
        v_state := jsonb_set(jsonb_set(v_state, '{damageWindowOpen}', 'true'::jsonb), '{damageWindowRevision}', to_jsonb(v_window_revision));
      end if;
    end if;
  elsif v_action = 'break-armor' and v_phase = 'veil-armor' then
    if coalesce((v_state->>'damageWindowOpen')::boolean, false) is not true then raise exception 'boss damage window closed'; end if;
    v_values := private.guild_raid_jsonb_add_unique(v_state->'armorBreakers', v_slot);
    v_state := jsonb_set(v_state, '{armorBreakers}', v_values);
    if jsonb_array_length(v_values) = 4 then
      v_state := v_state || jsonb_build_object('phase','split-echoes','phaseStartedRevision',v_revision,'damageWindowOpen',false,'boundEchoes','{}'::jsonb);
    end if;
  elsif v_action = 'bind-echo' and v_phase = 'split-echoes' then
    if coalesce((p_action->>'echo')::integer, 0) not between 1 and 4 then raise exception 'invalid echo'; end if;
    v_state := jsonb_set(v_state, array['boundEchoes', v_slot::text], to_jsonb((p_action->>'echo')::integer));
    select count(distinct value) into v_count from jsonb_each_text(v_state->'boundEchoes');
    if v_count = 4 and jsonb_object_length(v_state->'boundEchoes') = 4 then
      v_window_revision := coalesce((v_state->>'damageWindowRevision')::bigint, 0) + 1;
      v_state := jsonb_set(jsonb_set(v_state, '{damageWindowOpen}', 'true'::jsonb), '{damageWindowRevision}', to_jsonb(v_window_revision));
    end if;
  elsif v_action = 'stabilize-collapse' and v_phase = 'collapse' then
    if coalesce((p_action->>'pulse')::integer, 0) < coalesce((v_state->>'collapsePulse')::integer, 0) then raise exception 'stale collapse pulse'; end if;
    if (p_action->>'pulse')::integer > coalesce((v_state->>'collapsePulse')::integer, 0) then
      v_values := jsonb_build_array(v_slot);
    else
      v_values := private.guild_raid_jsonb_add_unique(v_state->'collapseContributors', v_slot);
    end if;
    v_state := jsonb_set(jsonb_set(v_state, '{collapsePulse}', to_jsonb((p_action->>'pulse')::integer)), '{collapseContributors}', v_values);
    if jsonb_array_length(v_values) = 4 then
      v_window_revision := coalesce((v_state->>'damageWindowRevision')::bigint, 0) + 1;
      v_state := jsonb_set(jsonb_set(v_state, '{damageWindowOpen}', 'true'::jsonb), '{damageWindowRevision}', to_jsonb(v_window_revision));
    end if;
  elsif v_action = 'strike' then
    if coalesce((v_state->>'damageWindowOpen')::boolean, false) is not true then raise exception 'boss damage window closed'; end if;
    if coalesce((p_action->>'windowRevision')::bigint, -1) <> coalesce((v_state->>'damageWindowRevision')::bigint, 0) then raise exception 'stale damage window'; end if;
    v_health := greatest(0, coalesce((v_state->>'health')::integer, 1200000) - v_damage);
    v_state := jsonb_set(v_state, '{health}', to_jsonb(v_health));
    if v_health = 0 then
      v_state := v_state || jsonb_build_object('phase','defeated','damageWindowOpen',false,'defeatedAtRevision',v_revision);
    elsif v_phase = 'veil-armor' and v_health <= 792000 then
      v_state := v_state || jsonb_build_object('phase','split-echoes','phaseStartedRevision',v_revision,'damageWindowOpen',false,'boundEchoes','{}'::jsonb);
    elsif v_phase = 'split-echoes' and v_health <= 396000 then
      v_state := v_state || jsonb_build_object('phase','collapse','phaseStartedRevision',v_revision,'damageWindowOpen',false,'collapseContributors','[]'::jsonb);
    end if;
  else
    raise exception 'action does not match active boss phase';
  end if;

  v_next_version := v_run.state_version + 1;
  update public.guild_raid_room_states
  set boss_state = v_state,
      status = case when v_state->>'phase' = 'defeated' then 'cleared' else 'active' end,
      cleared_at = case when v_state->>'phase' = 'defeated' then coalesce(cleared_at, clock_timestamp()) else cleared_at end,
      version = version + 1
  where raid_run_id = p_raid_run_id and room_number = 10 and room_epoch = v_run.room_epoch;

  update public.guild_raid_participants
  set status = case when v_state->>'phase' = 'defeated' then 'completed' else 'active' end,
      last_seen_at = clock_timestamp(), last_ack_state_version = v_next_version
  where raid_run_id = p_raid_run_id and user_id = v_user_id;

  update public.guild_raid_runs
  set state_version = v_next_version,
      status = case when v_state->>'phase' = 'defeated' then 'completed' else 'active' end,
      completed_at = case when v_state->>'phase' = 'defeated' then coalesce(completed_at, clock_timestamp()) else completed_at end,
      last_server_tick_at = clock_timestamp()
  where id = p_raid_run_id;

  if v_state->>'phase' = 'defeated' then
    insert into public.guild_raid_reward_entitlements (raid_run_id, guild_id, user_id, gold, dust, rank_xp, eligible, ineligible_reason)
    select v_run.id, v_run.guild_id, participant.user_id,
           case when weekly.clears < 3 then 1800 else 0 end,
           case when weekly.clears < 3 then 180 else 0 end,
           case when weekly.clears < 3 then 420 else 0 end,
           weekly.clears < 3,
           case when weekly.clears >= 3 then 'weekly_reward_limit' end
    from public.guild_raid_participants participant
    cross join lateral (
      select count(*)::integer as clears
      from public.guild_raid_reward_entitlements entitlement
      where entitlement.user_id = participant.user_id
        and entitlement.eligible
        and entitlement.created_at >= date_trunc('week', clock_timestamp())
    ) weekly
    where participant.raid_run_id = v_run.id
    on conflict (raid_run_id, user_id) do nothing;
  end if;

  v_response := private.guild_raid_build_run_snapshot(p_raid_run_id, v_user_id);
  insert into public.guild_raid_run_events (raid_run_id, actor_user_id, event_type, idempotency_key, expected_state_version, resulting_state_version, response)
  values (p_raid_run_id, v_user_id, 'boss_action', p_idempotency_key, p_expected_state_version, v_next_version, v_response);
  return v_response;
end;
$$;

create or replace function public.claim_my_guild_raid_reward(p_raid_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_reward public.guild_raid_reward_entitlements%rowtype;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  select * into v_reward
  from public.guild_raid_reward_entitlements
  where raid_run_id = p_raid_run_id and user_id = v_user_id
  for update;
  if v_reward.id is null then raise exception 'raid reward not found'; end if;
  if v_reward.claimed_at is null then
    update public.guild_raid_reward_entitlements set claimed_at = clock_timestamp() where id = v_reward.id
    returning * into v_reward;
  end if;
  return jsonb_build_object(
    'raidRunId', v_reward.raid_run_id,
    'eligible', v_reward.eligible,
    'reason', v_reward.ineligible_reason,
    'gold', v_reward.gold,
    'dust', v_reward.dust,
    'rankXp', v_reward.rank_xp,
    'claimedAt', v_reward.claimed_at
  );
end;
$$;

grant execute on function public.guild_raid_boss_action(uuid,bigint,uuid,jsonb) to authenticated;
grant execute on function public.claim_my_guild_raid_reward(uuid) to authenticated;
revoke execute on function public.guild_raid_boss_action(uuid,bigint,uuid,jsonb) from anon;
revoke execute on function public.claim_my_guild_raid_reward(uuid) from anon;

commit;
