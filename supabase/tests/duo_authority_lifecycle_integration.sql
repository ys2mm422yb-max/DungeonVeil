\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

select '1..26';

select c.relrowsecurity and c.relforcerowsecurity
       and not has_table_privilege('anon', 'private.coop_authority_attempt_receipts', 'SELECT')
       and not has_table_privilege('authenticated', 'private.coop_authority_attempt_receipts', 'SELECT')
       and not has_table_privilege('service_role', 'private.coop_authority_attempt_receipts', 'SELECT') as receipt_table_hardened
from pg_class as c
join pg_namespace as n on n.oid = c.relnamespace
where n.nspname = 'private' and c.relname = 'coop_authority_attempt_receipts' \gset
\if :receipt_table_hardened
select 'ok 1 - lifecycle receipts are private and forced-RLS';
\else
select 'not ok 1 - lifecycle receipt table is not hardened';
\endif

select has_function_privilege('authenticated', 'public.restart_coop_authority_attempt(uuid,integer,uuid)', 'EXECUTE')
       and not has_function_privilege('anon', 'public.restart_coop_authority_attempt(uuid,integer,uuid)', 'EXECUTE')
       and not has_function_privilege('service_role', 'public.restart_coop_authority_attempt(uuid,integer,uuid)', 'EXECUTE')
       and has_function_privilege('authenticated', 'public.exit_my_coop_authority_attempt(uuid,integer,uuid)', 'EXECUTE')
       and not has_function_privilege('anon', 'public.exit_my_coop_authority_attempt(uuid,integer,uuid)', 'EXECUTE')
       and not has_function_privilege('service_role', 'public.exit_my_coop_authority_attempt(uuid,integer,uuid)', 'EXECUTE') as lifecycle_acl \gset
\if :lifecycle_acl
select 'ok 2 - only authenticated callers can execute lifecycle RPCs';
\else
select 'not ok 2 - lifecycle RPC grants are too broad or incomplete';
\endif

select count(*) = 2
       and bool_and(p.prosecdef)
       and bool_and(p.proconfig @> array['search_path=""']::text[]) as hardened_functions
from pg_proc as p
join pg_namespace as n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('restart_coop_authority_attempt', 'exit_my_coop_authority_attempt') \gset
\if :hardened_functions
select 'ok 3 - lifecycle RPCs are security-definer functions with empty search path';
\else
select 'not ok 3 - lifecycle RPC hardening mismatch';
\endif

insert into auth.users(id) values
  ('81000000-0000-4000-8000-000000000001'),
  ('81000000-0000-4000-8000-000000000002'),
  ('81000000-0000-4000-8000-000000000003'),
  ('81000000-0000-4000-8000-000000000004');

insert into public.coop_lobbies (
  id, invite_code, status, run_seed, run_attempt, host_user_id, expires_at
) values
  ('82000000-0000-4000-8000-000000000001', 'RST001', 'waiting', 818181, 1,
   '81000000-0000-4000-8000-000000000001', clock_timestamp() + interval '2 hours'),
  ('82000000-0000-4000-8000-000000000002', 'EXT001', 'waiting', 828282, 1,
   '81000000-0000-4000-8000-000000000003', clock_timestamp() + interval '2 hours');

insert into public.coop_lobby_members (lobby_id, user_id, role, ready) values
  ('82000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', 'host', false),
  ('82000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000002', 'guest', false),
  ('82000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000003', 'host', false),
  ('82000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000004', 'guest', false);

set role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', false);
select public.set_my_coop_authority_class('mage');
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', false);
select public.set_my_coop_authority_class('warrior');
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000003', false);
select public.set_my_coop_authority_class('archer');
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000004', false);
select public.set_my_coop_authority_class('mage');
reset role;

update public.coop_lobby_members
set ready = true
where lobby_id in (
  '82000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000002'
);

set role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', false);
select count(*) = 1 as restart_lobby_started from public.start_coop_lobby() \gset
reset role;
\if :restart_lobby_started
select 'ok 4 - restart fixture begins as an exact active Duo attempt';
\else
select 'not ok 4 - restart fixture did not start';
\endif

select encounter_id as old_encounter_id
from private.coop_authority_runs
where lobby_id = '82000000-0000-4000-8000-000000000001' and run_attempt = 1 \gset restart_

update private.coop_authority_runs
set status = 'active',
    state_version = 9,
    canonical_snapshot = jsonb_build_object(
      'runId', lobby_id::text,
      'runAttempt', run_attempt,
      'encounterId', encounter_id::text,
      'version', 9,
      'lifecycle', 'team-defeated',
      'actors', '[]'::jsonb,
      'enemies', '[]'::jsonb,
      'completed', false
    ),
    canonical_snapshot_digest = repeat('d', 64)
where lobby_id = '82000000-0000-4000-8000-000000000001' and run_attempt = 1;

select status = 'active' and canonical_snapshot ->> 'lifecycle' = 'team-defeated' as defeat_materialized
from private.coop_authority_runs
where lobby_id = '82000000-0000-4000-8000-000000000001' and run_attempt = 1 \gset
\if :defeat_materialized
select 'ok 5 - retry is gated by durable canonical team defeat';
\else
select 'not ok 5 - canonical team defeat fixture missing';
\endif

set role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', false);
\set ON_ERROR_STOP off
select * from public.restart_coop_authority_attempt(
  '82000000-0000-4000-8000-000000000001', 1, '83000000-0000-4000-8000-000000000001'
);
\if :ERROR
select 'ok 6 - guest retry fails closed';
\else
select 'not ok 6 - guest restarted a host-owned run';
\endif
\set ON_ERROR_STOP on

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', false);
select * from public.restart_coop_authority_attempt(
  '82000000-0000-4000-8000-000000000001', 1, '83000000-0000-4000-8000-000000000002'
) \gset restarted_
\if :restarted_replayed
select 'not ok 7 - first host retry was incorrectly marked replayed';
\else
select 'ok 7 - host retry commits a fresh authority attempt';
\endif

select :'restarted_run_attempt'::integer = 2
       and :'restarted_status' = 'awaiting_canonical_state'
       and :'restarted_encounter_id'::uuid <> :'restart_old_encounter_id'::uuid as fresh_attempt \gset
\if :fresh_attempt
select 'ok 8 - retry returns a distinct attempt and encounter';
\else
select 'not ok 8 - retry did not produce a fresh attempt';
\endif

select replayed and run_attempt = 2 and encounter_id = :'restarted_encounter_id'::uuid as retry_replayed
from public.restart_coop_authority_attempt(
  '82000000-0000-4000-8000-000000000001', 1, '83000000-0000-4000-8000-000000000002'
) \gset
\if :retry_replayed
select 'ok 9 - exact lost-response retry replays its durable receipt';
\else
select 'not ok 9 - exact retry did not replay';
\endif
reset role;

select run_attempt = 2 as attempt_once
from public.coop_lobbies where id = '82000000-0000-4000-8000-000000000001' \gset
\if :attempt_once
select 'ok 10 - exact replay does not increment the attempt twice';
\else
select 'not ok 10 - exact replay mutated the attempt';
\endif

set role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', false);
\set ON_ERROR_STOP off
select * from public.restart_coop_authority_attempt(
  '82000000-0000-4000-8000-000000000001', 1, '83000000-0000-4000-8000-000000000003'
);
\if :ERROR
select 'ok 11 - stale source attempt with a different request fails closed';
\else
select 'not ok 11 - stale source attempt created another run';
\endif
\set ON_ERROR_STOP on
reset role;

set role service_role;
select count(*) = 0 as old_state_hidden
from public.read_coop_authority_state('82000000-0000-4000-8000-000000000001', 1) \gset
\if :old_state_hidden
select 'ok 12 - old attempt is no longer readable through the authority boundary';
\else
select 'not ok 12 - old authority state remained readable';
\endif

\set ON_ERROR_STOP off
select * from public.persist_coop_authority_transition(
  '82000000-0000-4000-8000-000000000001', 1, :'restart_old_encounter_id'::uuid,
  '81000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000004',
  1, 9, repeat('e', 64), '{}'::jsonb, repeat('f', 64)
);
\if :ERROR
select 'ok 13 - old-attempt intent persistence fails closed';
\else
select 'not ok 13 - old-attempt intent mutated authority state';
\endif
\set ON_ERROR_STOP on
reset role;

select status = 'invalidated' as old_invalidated
from private.coop_authority_runs
where lobby_id = '82000000-0000-4000-8000-000000000001' and run_attempt = 1 \gset
\if :old_invalidated
select 'ok 14 - prior mutable authority attempt is invalidated';
\else
select 'not ok 14 - prior authority attempt was not invalidated';
\endif

select run.status = 'awaiting_canonical_state'
       and count(distinct actor.user_id) = 2
       and count(distinct profile.user_id) = 2 as fresh_seeded
from private.coop_authority_runs as run
join private.coop_authority_actors as actor
  on actor.lobby_id = run.lobby_id and actor.run_attempt = run.run_attempt
join private.coop_authority_build_profiles as profile
  on profile.lobby_id = actor.lobby_id and profile.run_attempt = actor.run_attempt and profile.user_id = actor.user_id
where run.lobby_id = '82000000-0000-4000-8000-000000000001' and run.run_attempt = 2
group by run.status \gset
\if :fresh_seeded
select 'ok 15 - fresh retry snapshots both actors and trusted builds';
\else
select 'not ok 15 - fresh retry provenance is incomplete';
\endif

select count(*) = 0 as restart_no_reward
from public.coop_trusted_encounter_completions
where lobby_id = '82000000-0000-4000-8000-000000000001' \gset
\if :restart_no_reward
select 'ok 16 - retry mints no completion or reward proof';
\else
select 'not ok 16 - retry minted a completion proof';
\endif

set role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000003', false);
select count(*) = 1 as exit_lobby_started from public.start_coop_lobby() \gset
reset role;
\if :exit_lobby_started
select 'ok 17 - exit fixture begins as an exact active Duo attempt';
\else
select 'not ok 17 - exit fixture did not start';
\endif

set role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000004', false);
select * from public.exit_my_coop_authority_attempt(
  '82000000-0000-4000-8000-000000000002', 1, '83000000-0000-4000-8000-000000000005'
) \gset exited_
\if :exited_replayed
select 'not ok 18 - first member exit was incorrectly marked replayed';
\else
select 'ok 18 - an active guest can atomically exit the Duo run';
\endif

select replayed and status = 'closed' and run_attempt = 1 as exit_replayed
from public.exit_my_coop_authority_attempt(
  '82000000-0000-4000-8000-000000000002', 1, '83000000-0000-4000-8000-000000000005'
) \gset
\if :exit_replayed
select 'ok 19 - exact lost-response exit replays its durable receipt';
\else
select 'not ok 19 - exact exit did not replay';
\endif
reset role;

select status = 'closed' as lobby_closed
from public.coop_lobbies where id = '82000000-0000-4000-8000-000000000002' \gset
\if :lobby_closed
select 'ok 20 - exit closes the exact lobby';
\else
select 'not ok 20 - exit left the lobby active';
\endif

select count(*) = 2 and bool_and(left_at is not null) as all_left
from public.coop_lobby_members where lobby_id = '82000000-0000-4000-8000-000000000002' \gset
\if :all_left
select 'ok 21 - exit terminalizes both active memberships';
\else
select 'not ok 21 - active membership survived exit';
\endif

select status = 'invalidated' as exit_invalidated
from private.coop_authority_runs
where lobby_id = '82000000-0000-4000-8000-000000000002' and run_attempt = 1 \gset
\if :exit_invalidated
select 'ok 22 - exit invalidates the authority attempt';
\else
select 'not ok 22 - exit left authority mutable';
\endif

set role service_role;
select count(*) = 0 as exit_state_hidden
from public.read_coop_authority_state('82000000-0000-4000-8000-000000000002', 1) \gset
reset role;
\if :exit_state_hidden
select 'ok 23 - exited authority state is no longer readable';
\else
select 'not ok 23 - exited authority state remained readable';
\endif

select count(*) = 0 as exit_no_reward
from public.coop_trusted_encounter_completions
where lobby_id = '82000000-0000-4000-8000-000000000002' \gset
\if :exit_no_reward
select 'ok 24 - exit mints no completion or reward proof';
\else
select 'not ok 24 - exit minted a completion proof';
\endif

set role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000004', false);
\set ON_ERROR_STOP off
select * from public.exit_my_coop_authority_attempt(
  '82000000-0000-4000-8000-000000000002', 1, '83000000-0000-4000-8000-000000000006'
);
\if :ERROR
select 'ok 25 - stale exit with a different request fails closed';
\else
select 'not ok 25 - stale exit bypassed the receipt contract';
\endif
\set ON_ERROR_STOP on
reset role;

select count(*) = 2
       and count(*) filter (where action = 'restart') = 1
       and count(*) filter (where action = 'exit') = 1 as receipts_exact
from private.coop_authority_attempt_receipts
where lobby_id in (
  '82000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000002'
) \gset
\if :receipts_exact
select 'ok 26 - only the two successful lifecycle transitions persist receipts';
\else
select 'not ok 26 - lifecycle receipt cardinality mismatch';
\endif
