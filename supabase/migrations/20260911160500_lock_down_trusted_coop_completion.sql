-- #461 Slice 2: least-privilege correction for the trusted completion ledger.
-- Keep service_role on the validated recorder RPC only; direct table access would bypass
-- active-run/run_attempt validation and the recorder's idempotent conflict guard.

revoke all on table public.coop_trusted_encounter_completions from service_role;
revoke all on function private.require_trusted_coop_completion(uuid, integer, bigint, integer, integer)
  from service_role;
