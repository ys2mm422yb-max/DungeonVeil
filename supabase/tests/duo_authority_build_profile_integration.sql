\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

select '1..23';

insert into auth.users(id) values
  ('71000000-0000-4000-8000-000000000001'),
  ('71000000-0000-4000-8000-000000000002');

insert into public.coop_lobbies (
  id, invite_code, status, run_seed, run_attempt, host_user_id, expires_at
) values (
  '72000000-0000-4000-8000-000000000001', 'BLD001', 'waiting', 424242, 1,
  '71000000-0000-4000-8000-000000000001', clock_timestamp() + interval '2 hours'
);

insert into public.coop_lobby_members (lobby_id, user_id, role, ready) values
  ('72000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', 'host', false),
  ('72000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000002', 'guest', false);

set role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', false);
select public.set_my_coop_authority_class('mage') = 'mage' as host_class_set \gset
\if :host_class_set
select 'ok 1 - host selects canonical class before run';
\else
select 'not ok 1 - host class selection failed';
\endif

select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000002', false);
select public.set_my_coop_authority_class('warrior') = 'warrior' as guest_class_set \gset
\if :guest_class_set
select 'ok 2 - guest selects canonical class before run';
\else
select 'not ok 2 - guest class selection failed';
\endif

do $$
begin
  begin
    perform public.set_my_coop_authority_class('forged-class');
    raise exception 'unsupported class accepted';
  exception when others then
    if sqlerrm = 'unsupported class accepted' then raise; end if;
  end;
end
$$;
select 'ok 3 - unsupported class fails closed';

reset role;
update public.coop_lobby_members
set ready = true
where lobby_id = '72000000-0000-4000-8000-000000000001';

set role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', false);
select count(*) = 1 as started
from public.start_coop_lobby() \gset
\if :started
select 'ok 4 - exact lobby start seeds authority';
\else
select 'not ok 4 - authority start missing';
\endif
reset role;

select count(*) = 2
       and bool_and(profile.build_revision = 0)
       and bool_and(profile.choice_ordinal = 0)
       and bool_and(profile.build_digest ~ '^[0-9a-f]{64}$') as profiles_seeded
from private.coop_authority_build_profiles as profile
where profile.lobby_id = '72000000-0000-4000-8000-000000000001'
  and profile.run_attempt = 1 \gset
\if :profiles_seeded
select 'ok 5 - actor profiles are seeded from trusted class snapshots';
\else
select 'not ok 5 - actor profiles were not seeded';
\endif

set role service_role;
select * from public.issue_coop_authority_upgrade_offer(
  '72000000-0000-4000-8000-000000000001', 1,
  '71000000-0000-4000-8000-000000000001', 'room:1:clear'
) \gset offer_
reset role;

select cardinality(offered_options) = 3
       and offer_digest ~ '^[0-9a-f]{64}$' as offer_valid,
       offered_options[1] as selected_option
from private.coop_authority_choice_offers
where offer_id = :'offer_offer_id'::uuid \gset
\if :offer_valid
select 'ok 6 - service issues three deterministic catalog options';
\else
select 'not ok 6 - deterministic offer invalid';
\endif

set role service_role;
select replayed as replayed_offer,
       offer_id = :'offer_offer_id'::uuid as same_offer
from public.issue_coop_authority_upgrade_offer(
  '72000000-0000-4000-8000-000000000001', 1,
  '71000000-0000-4000-8000-000000000001', 'room:1:clear'
) \gset
reset role;
\if :replayed_offer
  \if :same_offer
select 'ok 7 - duplicate progression event exactly replays its offer';
  \else
select 'not ok 7 - replay changed offer identity';
  \endif
\else
select 'not ok 7 - duplicate offer was not replayed';
\endif

set role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000002', false);
\set ON_ERROR_STOP off
select * from public.choose_my_coop_authority_upgrade(
  '72000000-0000-4000-8000-000000000001', 1,
  :'offer_offer_id'::uuid, :'selected_option', 0
);
\if :ERROR
select 'ok 8 - actor-bound offer rejects partner choice';
\else
select 'not ok 8 - partner consumed another actor offer';
\endif
\set ON_ERROR_STOP on

select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', false);
\set ON_ERROR_STOP off
select * from public.choose_my_coop_authority_upgrade(
  '72000000-0000-4000-8000-000000000001', 1,
  :'offer_offer_id'::uuid, 'not-offered', 0
);
\if :ERROR
select 'ok 9 - unoffered option fails closed';
\else
select 'not ok 9 - unoffered option was accepted';
\endif
\set ON_ERROR_STOP on

select * from public.choose_my_coop_authority_upgrade(
  '72000000-0000-4000-8000-000000000001', 1,
  :'offer_offer_id'::uuid, :'selected_option', 0
) \gset choice_
\if :choice_replayed
select 'not ok 10 - first choice incorrectly marked replayed';
\else
select 'ok 10 - issued choice advances build revision';
\endif

select replayed as exact_choice_replay,
       build_revision = 1 as exact_revision
from public.choose_my_coop_authority_upgrade(
  '72000000-0000-4000-8000-000000000001', 1,
  :'offer_offer_id'::uuid, :'selected_option', 0
) \gset
\if :exact_choice_replay
  \if :exact_revision
select 'ok 11 - exact lost-response choice replay is idempotent';
  \else
select 'not ok 11 - replay returned wrong revision';
  \endif
\else
select 'not ok 11 - exact choice did not replay';
\endif

select build_revision = 1
       and choice_ordinal = 1
       and build_digest ~ '^[0-9a-f]{64}$'
       and (derived_snapshot ->> 'profileVersion') = 'duo-profile-v1'
       and pending_offer is null as reconnect_equal
from public.read_my_coop_authority_build(
  '72000000-0000-4000-8000-000000000001', 1
) \gset
\if :reconnect_equal
select 'ok 12 - reconnect restores exact server-owned build snapshot';
\else
select 'not ok 12 - reconnect build snapshot mismatch';
\endif

reset role;
set role service_role;
select * from public.issue_coop_authority_upgrade_offer(
  '72000000-0000-4000-8000-000000000001', 1,
  '71000000-0000-4000-8000-000000000001', 'room:1:second-boundary'
) \gset boundary_offer_
reset role;

select offered_options[1] as boundary_option
from private.coop_authority_choice_offers
where offer_id = :'boundary_offer_offer_id'::uuid \gset

update private.coop_authority_runs
set status = 'active',
    canonical_snapshot = jsonb_build_object(
      'runId', lobby_id::text, 'runAttempt', run_attempt, 'seed', run_seed,
      'chapter', chapter, 'room', room, 'encounterId', encounter_id::text,
      'version', state_version, 'actors', '[]'::jsonb, 'enemies', '[]'::jsonb,
      'lastClientSeqByActor', '{}'::jsonb, 'completed', false
    ),
    canonical_snapshot_digest = repeat('a', 64)
where lobby_id = '72000000-0000-4000-8000-000000000001'
  and run_attempt = 1;

set role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', false);
\set ON_ERROR_STOP off
select * from public.choose_my_coop_authority_upgrade(
  '72000000-0000-4000-8000-000000000001', 1,
  :'boundary_offer_offer_id'::uuid, :'boundary_option', 1
);
\if :ERROR
select 'ok 13 - active canonical encounter rejects build mutation';
\else
select 'not ok 13 - active canonical encounter accepted build mutation';
\endif
\set ON_ERROR_STOP on

select pending_offer is null as active_offer_hidden
from public.read_my_coop_authority_build(
  '72000000-0000-4000-8000-000000000001', 1
) \gset
\if :active_offer_hidden
select 'ok 14 - reconnect hides offers outside the exact inter-encounter boundary';
\else
select 'not ok 14 - reconnect exposed a stale active-encounter offer';
\endif

select replayed as settled_choice_replay,
       build_revision = 1 as settled_revision
from public.choose_my_coop_authority_upgrade(
  '72000000-0000-4000-8000-000000000001', 1,
  :'offer_offer_id'::uuid, :'selected_option', 0
) \gset
\if :settled_choice_replay
  \if :settled_revision
select 'ok 15 - exact settled choice replay remains idempotent after snapshot materialization';
  \else
select 'not ok 15 - settled replay returned the wrong revision';
  \endif
\else
select 'not ok 15 - settled choice replay was rejected';
\endif

reset role;

-- Complete the canonical encounter through the trusted producer boundary, then
-- advance from its exact proof. The skipped offer must release ordinal 2 while
-- selected ordinal 1 remains durable replay history.
create temporary table skipped_encounter as
select encounter_id
from private.coop_authority_runs
where lobby_id = '72000000-0000-4000-8000-000000000001'
  and run_attempt = 1;

set role service_role;
select * from public.persist_coop_authority_transition_and_record(
  '72000000-0000-4000-8000-000000000001', 1,
  (select encounter_id from skipped_encounter),
  '71000000-0000-4000-8000-000000000001',
  '73000000-0000-4000-8000-000000000001', 1, 0,
  repeat('b', 64),
  jsonb_build_object(
    'runId', '72000000-0000-4000-8000-000000000001',
    'runAttempt', 1,
    'seed', 424242,
    'chapter', 1,
    'room', 1,
    'encounterId', (select encounter_id::text from skipped_encounter),
    'version', 1,
    'actors', '[]'::jsonb,
    'enemies', jsonb_build_array(jsonb_build_object('hp', 0)),
    'lastClientSeqByActor', jsonb_build_object(
      '71000000-0000-4000-8000-000000000001', 1,
      '71000000-0000-4000-8000-000000000002', 0
    ),
    'completed', true
  ),
  repeat('c', 64)
);
select * from public.advance_coop_authority_encounter(
  '72000000-0000-4000-8000-000000000001', 1,
  (select encounter_id from skipped_encounter),
  '71000000-0000-4000-8000-000000000001'
);
reset role;

select chapter = 1
       and room = 2
       and status = 'awaiting_canonical_state'
       and canonical_snapshot is null
       and encounter_id <> (select encounter_id from skipped_encounter)
       as trusted_advance_ready
from private.coop_authority_runs
where lobby_id = '72000000-0000-4000-8000-000000000001'
  and run_attempt = 1 \gset
\if :trusted_advance_ready
select 'ok 16 - trusted completion advances to the next empty authority boundary';
\else
select 'not ok 16 - trusted completion did not open the next authority boundary';
\endif

set role service_role;
select * from public.issue_coop_authority_upgrade_offer(
  '72000000-0000-4000-8000-000000000001', 1,
  '71000000-0000-4000-8000-000000000001', 'room:2:clear'
) \gset next_offer_
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', false);
select pending_offer ->> 'offerId' = :'next_offer_offer_id'
       and (pending_offer ->> 'choiceOrdinal')::integer = 2
       and (
         select count(*) = 1
         from private.coop_authority_choice_offers as offer
         where offer.lobby_id = '72000000-0000-4000-8000-000000000001'
           and offer.run_attempt = 1
           and offer.user_id = '71000000-0000-4000-8000-000000000001'
           and offer.selected_option is null
       )
       and not exists (
         select 1
         from private.coop_authority_choice_offers as offer
         where offer.offer_id = :'boundary_offer_offer_id'::uuid
       ) as next_offer_visible
from public.read_my_coop_authority_build(
  '72000000-0000-4000-8000-000000000001', 1
) \gset
\if :next_offer_visible
select 'ok 17 - next boundary issues exactly one visible offer and expires the skipped row';
\else
select 'not ok 17 - skipped offer still blocks or leaks into the next boundary';
\endif

\set ON_ERROR_STOP off
select * from public.choose_my_coop_authority_upgrade(
  '72000000-0000-4000-8000-000000000001', 1,
  :'boundary_offer_offer_id'::uuid, :'boundary_option', 1
);
\if :ERROR
select 'ok 18 - expired skipped offer cannot be selected after trusted advance';
\else
select 'not ok 18 - expired skipped offer remained selectable';
\endif
\set ON_ERROR_STOP on
reset role;

set role service_role;
select replayed
       and offer_id = :'next_offer_offer_id'::uuid
       and (
         select count(*) = 1
         from private.coop_authority_choice_offers as offer
         where offer.offer_id = :'next_offer_offer_id'::uuid
       ) as deterministic_next_replay
from public.issue_coop_authority_upgrade_offer(
  '72000000-0000-4000-8000-000000000001', 1,
  '71000000-0000-4000-8000-000000000001', 'room:2:clear'
) \gset
reset role;
\if :deterministic_next_replay
select 'ok 19 - exact next-boundary offer replay is idempotent without duplicates';
\else
select 'not ok 19 - next-boundary offer replay changed identity or duplicated';
\endif

set role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', false);
select replayed
       and build_revision = 1
       and choice_ordinal = 1 as selected_history_replays
from public.choose_my_coop_authority_upgrade(
  '72000000-0000-4000-8000-000000000001', 1,
  :'offer_offer_id'::uuid, :'selected_option', 0
) \gset
\if :selected_history_replays
select 'ok 20 - selected exact replay history survives trusted encounter advance';
\else
select 'not ok 20 - selected exact replay history was lost during stale cleanup';
\endif
reset role;

set role service_role;
select jsonb_array_length(actors) = 2
       and (actors -> 0) ? 'build_revision'
       and (actors -> 0) ? 'build_digest'
       and (actors -> 0) ? 'derived_snapshot'
       and (actors -> 1) ? 'derived_snapshot' as authority_build_bound
from public.read_coop_authority_state(
  '72000000-0000-4000-8000-000000000001', 1
) \gset
\if :authority_build_bound
select 'ok 21 - authority read binds trusted build provenance for every actor';
\else
select 'not ok 21 - authority read omitted trusted build provenance';
\endif
reset role;

select (private.canonical_duo_build_snapshot('warrior', '{}'::jsonb) ->> 'maxHp')::integer = 150
       and (private.canonical_duo_build_snapshot('mage', '{}'::jsonb) ->> 'maxHp')::integer = 80
       and (private.canonical_duo_build_snapshot('archer', '{}'::jsonb) ->> 'maxHp')::integer = 100
       as browser_hp_parity \gset
\if :browser_hp_parity
select 'ok 22 - server class HP baselines match shipped browser classes';
\else
select 'not ok 22 - server class HP baselines drift from browser classes';
\endif

update private.coop_authority_build_profiles
set build_digest = repeat('0', 64)
where lobby_id = '72000000-0000-4000-8000-000000000001'
  and run_attempt = 1
  and user_id = '71000000-0000-4000-8000-000000000002';

set role service_role;
select count(*) = 0 as corrupt_profile_hidden
from public.read_coop_authority_state(
  '72000000-0000-4000-8000-000000000001', 1
) \gset
\if :corrupt_profile_hidden
select 'ok 23 - corrupt actor build digest fails the complete authority read closed';
\else
select 'not ok 23 - corrupt actor build digest leaked partial authority state';
\endif
reset role;
