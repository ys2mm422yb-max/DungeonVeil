\set ON_ERROR_STOP on

create schema if not exists test;
create extension if not exists dblink;

create or replace function test.assert_true(ok boolean, message text)
returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'not ok - %', message; end if;
  raise notice 'ok - %', message;
end $$;

create or replace function test.expect_error(statement text, pattern text, message text)
returns void language plpgsql as $$
declare detail text;
begin
  begin
    execute statement;
    raise exception 'statement unexpectedly succeeded';
  exception when others then
    detail := sqlerrm;
    if detail = 'statement unexpectedly succeeded' or detail !~ pattern then
      raise exception 'not ok - % (received: %)', message, detail;
    end if;
  end;
  raise notice 'ok - %', message;
end $$;

grant usage on schema test to anon, authenticated, service_role;
grant execute on function test.assert_true(boolean,text), test.expect_error(text,text,text)
  to anon, authenticated, service_role;

select test.assert_true(
  (select count(*) = 7 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where (n.nspname, p.proname) in (
     ('private','bootstrap_coop_authority_run'), ('public','read_coop_authority_state'),
     ('public','persist_coop_authority_transition'), ('public','start_coop_lobby'),
     ('public','restart_coop_run_attempt'), ('public','persist_coop_authority_transition_and_record'),
     ('public','advance_coop_authority_encounter'))
   and p.prosecdef and p.proconfig @> array['search_path=""']::text[]),
  'all seven authority SECURITY DEFINER routines compile with an empty search_path');

select test.assert_true(
  has_function_privilege('service_role', 'public.read_coop_authority_state(uuid,integer)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.persist_coop_authority_transition(uuid,integer,uuid,uuid,uuid,bigint,bigint,text,jsonb,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.read_coop_authority_state(uuid,integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.read_coop_authority_state(uuid,integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.persist_coop_authority_transition(uuid,integer,uuid,uuid,uuid,bigint,bigint,text,jsonb,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.persist_coop_authority_transition(uuid,integer,uuid,uuid,uuid,bigint,bigint,text,jsonb,text)', 'EXECUTE'),
  'read and persistence RPCs are service-role-only');

select test.assert_true(
  has_function_privilege('service_role', 'public.persist_coop_authority_transition_and_record(uuid,integer,uuid,uuid,uuid,bigint,bigint,text,jsonb,text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.advance_coop_authority_encounter(uuid,integer,uuid,uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.persist_coop_authority_transition_and_record(uuid,integer,uuid,uuid,uuid,bigint,bigint,text,jsonb,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.advance_coop_authority_encounter(uuid,integer,uuid,uuid)', 'EXECUTE'),
  'completion and encounter-advance RPCs are service-role-only');

set role service_role;
select test.expect_error(
  $$insert into private.coop_authority_runs (lobby_id,run_attempt,run_seed) values ('00000000-0000-0000-0000-000000000099',1,1)$$,
  'permission denied', 'service role cannot directly mutate private authority tables');
reset role;

-- A failed start must roll the lobby status back with the failed authority bootstrap.
-- Only the host has a trusted auth identity at first. The lobby/member tables can
-- represent the guest, but the private actor snapshot must reject that untrusted
-- identity through its auth.users foreign key after start_coop_lobby changes status.
insert into auth.users (id) values
  ('10000000-0000-0000-0000-000000000001');
insert into public.coop_lobbies (id, invite_code, host_user_id, run_seed)
values ('00000000-0000-0000-0000-000000000001','BAD001','10000000-0000-0000-0000-000000000001',11);
insert into public.coop_lobby_members (lobby_id,user_id,role,ready)
values ('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','host',true),
       ('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','guest',true);
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
select test.expect_error(
  'select * from public.start_coop_lobby()',
  'violates foreign key constraint',
  'untrusted member identity aborts start');
reset role;
select test.assert_true(
  (select status='waiting' from public.coop_lobbies where id='00000000-0000-0000-0000-000000000001'),
  'failed authority snapshot rolls back lobby start atomically');

insert into auth.users (id) values
  ('10000000-0000-0000-0000-000000000002');
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
select * from public.start_coop_lobby();
reset role;
select test.assert_true((select count(*)=2 from private.coop_authority_actors where lobby_id='00000000-0000-0000-0000-000000000001' and run_attempt=1), 'start snapshots exactly two canonical actors');
select test.assert_true((select count(*)=1 from private.coop_authority_runs where lobby_id='00000000-0000-0000-0000-000000000001' and run_attempt=1), 'start creates one authority run');

-- Reentrant private bootstrap is stable while the attempt remains untouched.
select test.assert_true(
  private.bootstrap_coop_authority_run('00000000-0000-0000-0000-000000000001',1,11)
  = (select encounter_id from private.coop_authority_runs where lobby_id='00000000-0000-0000-0000-000000000001' and run_attempt=1),
  'reentrant bootstrap returns the existing untouched encounter');

-- Reconnect read is read-only.
create temporary table before_read as
select (select count(*) from private.coop_authority_runs) runs,
       (select count(*) from private.coop_authority_actors) actors,
       (select count(*) from private.coop_authority_intent_receipts) receipts;
set role service_role;
select * from public.read_coop_authority_state('00000000-0000-0000-0000-000000000001',1);
reset role;
select test.assert_true((select (runs,actors,receipts)=((select count(*) from private.coop_authority_runs),(select count(*) from private.coop_authority_actors),(select count(*) from private.coop_authority_intent_receipts)) from before_read), 'reconnect read creates and completes nothing');

-- First transition and replay/idempotency/conflict boundaries. ACLs are asserted above;
-- semantic calls run as the disposable database owner so test arguments can inspect private state.
select * from public.persist_coop_authority_transition(
  '00000000-0000-0000-0000-000000000001',1,
  (select encounter_id from private.coop_authority_runs where lobby_id='00000000-0000-0000-0000-000000000001' and run_attempt=1),
  '10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',1,0,
  repeat('a',64),'{}'::jsonb,repeat('b',64));
select test.assert_true((select replayed from public.persist_coop_authority_transition(
  '00000000-0000-0000-0000-000000000001',1,
  (select encounter_id from private.coop_authority_runs where lobby_id='00000000-0000-0000-0000-000000000001' and run_attempt=1),
  '10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',1,0,
  repeat('a',64),'{}'::jsonb,repeat('b',64))), 'identical replay returns the stable recorded result');
select test.expect_error($q$select * from public.persist_coop_authority_transition(
  '00000000-0000-0000-0000-000000000001',1,
  (select encounter_id from private.coop_authority_runs where lobby_id='00000000-0000-0000-0000-000000000001' and run_attempt=1),
  '10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',1,0,
  repeat('c',64),'{}'::jsonb,repeat('b',64))$q$, 'authority intent replay conflict', 'conflicting replay fails closed');
select test.expect_error($q$select * from public.persist_coop_authority_transition(
  '00000000-0000-0000-0000-000000000001',1,
  (select encounter_id from private.coop_authority_runs where lobby_id='00000000-0000-0000-0000-000000000001' and run_attempt=1),
  '10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002',3,1,
  repeat('d',64),'{}'::jsonb,repeat('e',64))$q$, 'authority actor sequence gap', 'sequence gaps fail closed');
select test.expect_error($q$select * from public.persist_coop_authority_transition(
  '00000000-0000-0000-0000-000000000001',1,
  (select encounter_id from private.coop_authority_runs where lobby_id='00000000-0000-0000-0000-000000000001' and run_attempt=1),
  '10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003',1,0,
  repeat('f',64),'{}'::jsonb,repeat('0',64))$q$, 'authority state version conflict', 'stale state versions fail closed');

-- A canonical terminal transition atomically writes the trusted proof. The next encounter
-- derives its coordinates from that exact proof; the caller supplies neither chapter nor room.
select * from public.persist_coop_authority_transition_and_record(
  '00000000-0000-0000-0000-000000000001',1,
  (select encounter_id from private.coop_authority_runs where lobby_id='00000000-0000-0000-0000-000000000001' and run_attempt=1),
  '10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000010',1,1,
  repeat('7',64),
  jsonb_build_object('runId','00000000-0000-0000-0000-000000000001','runAttempt',1,'seed',11,
    'chapter',1,'room',1,'encounterId',(select encounter_id::text from private.coop_authority_runs where lobby_id='00000000-0000-0000-0000-000000000001' and run_attempt=1),
    'version',2,'actors','[]'::jsonb,'enemies',jsonb_build_array(jsonb_build_object('hp',0)),'lastClientSeqByActor','{}'::jsonb,'completed',true),
  repeat('8',64));
select test.assert_true(
  (select count(*)=1 from public.coop_trusted_encounter_completions
   where lobby_id='00000000-0000-0000-0000-000000000001' and run_attempt=1 and chapter=1 and room=1),
  'terminal transition creates exactly one trusted completion proof');
create temporary table completed_encounter as
select encounter_id from private.coop_authority_runs
where lobby_id='00000000-0000-0000-0000-000000000001' and run_attempt=1;
select * from public.advance_coop_authority_encounter(
  '00000000-0000-0000-0000-000000000001',1,
  (select encounter_id from completed_encounter),
  '10000000-0000-0000-0000-000000000001');
select test.assert_true(
  (select chapter=1 and room=2 and state_version=0 and status='awaiting_canonical_state'
          and canonical_snapshot is null and completed_at is null
   from private.coop_authority_runs
   where lobby_id='00000000-0000-0000-0000-000000000001' and run_attempt=1),
  'exact trusted proof advances to a fresh server-derived encounter');
select test.assert_true((select replayed from public.persist_coop_authority_transition_and_record(
  '00000000-0000-0000-0000-000000000001',1,
  (select encounter_id from completed_encounter),
  '10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000010',1,1,
  repeat('7',64),'{}'::jsonb,repeat('8',64))),
  'lost terminal response replays exactly after the partner advances');
select test.expect_error($q$select * from public.advance_coop_authority_encounter(
  '00000000-0000-0000-0000-000000000001',1,
  (select encounter_id from completed_encounter),
  '10000000-0000-0000-0000-000000000001')$q$,
  'exact completed authority encounter required', 'completed encounter cannot advance twice');

-- Restart invalidates the prior attempt and old-attempt replay cannot mutate it.
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
select public.restart_coop_run_attempt();
reset role;
select test.assert_true((select status='invalidated' from private.coop_authority_runs where lobby_id='00000000-0000-0000-0000-000000000001' and run_attempt=1), 'restart invalidates the prior mutable attempt');
select test.expect_error($q$select * from public.persist_coop_authority_transition(
  '00000000-0000-0000-0000-000000000001',1,
  (select encounter_id from private.coop_authority_runs where lobby_id='00000000-0000-0000-0000-000000000001' and run_attempt=1),
  '10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000004',2,1,
  repeat('1',64),'{}'::jsonb,repeat('2',64))$q$, 'exact active coop attempt required', 'old-attempt transition fails after restart');

-- Two concurrent compare-and-swap requests with the same version serialize to one winner.
select dblink_connect('cas1','dbname='||current_database());
select dblink_connect('cas2','dbname='||current_database());
select dblink_send_query('cas1', format($q$select state_version from public.persist_coop_authority_transition(
  '00000000-0000-0000-0000-000000000001',2,'%s','10000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',1,0,repeat('3',64),'{}'::jsonb,repeat('4',64))$q$,
  (select encounter_id from private.coop_authority_runs where lobby_id='00000000-0000-0000-0000-000000000001' and run_attempt=2)));
select dblink_send_query('cas2', format($q$select state_version from public.persist_coop_authority_transition(
  '00000000-0000-0000-0000-000000000001',2,'%s','10000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000002',1,0,repeat('5',64),'{}'::jsonb,repeat('6',64))$q$,
  (select encounter_id from private.coop_authority_runs where lobby_id='00000000-0000-0000-0000-000000000001' and run_attempt=2)));
select * from dblink_get_result('cas1', false) as result(state_version bigint);
select * from dblink_get_result('cas2', false) as result(state_version bigint);
select test.assert_true((select state_version=1 from private.coop_authority_runs where lobby_id='00000000-0000-0000-0000-000000000001' and run_attempt=2), 'concurrent CAS advances the run exactly once');
select test.assert_true((select count(*)=1 from private.coop_authority_intent_receipts where lobby_id='00000000-0000-0000-0000-000000000001' and run_attempt=2), 'concurrent CAS records exactly one winning receipt');
select dblink_disconnect('cas1');
select dblink_disconnect('cas2');

select test.assert_true(not exists (
  select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','private') and p.proname in (
    'bootstrap_coop_authority_run','read_coop_authority_state','persist_coop_authority_transition',
    'persist_coop_authority_transition_and_record','advance_coop_authority_encounter',
    'start_coop_lobby','restart_coop_run_attempt')
  and not (p.proconfig @> array['search_path=""']::text[])
), 'no new SECURITY DEFINER routine retains a writable-schema search path');
