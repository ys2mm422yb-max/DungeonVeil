\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

select '1..12';

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
