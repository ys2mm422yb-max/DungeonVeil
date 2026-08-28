begin;

-- Block 14 least-privilege hardening.
-- PostgreSQL grants EXECUTE on newly created functions to PUBLIC by default.
-- The original Block 14 migration revoked only `anon`, so anonymous clients
-- still inherited EXECUTE through PUBLIC even though the RPCs fail closed on
-- a null auth.uid(). Keep the intended authenticated-only RPC surface explicit.

revoke all on function public.guild_raid_boss_action(uuid, bigint, uuid, jsonb)
  from public, anon;
revoke all on function public.claim_my_guild_raid_reward(uuid)
  from public, anon;

grant execute on function public.guild_raid_boss_action(uuid, bigint, uuid, jsonb)
  to authenticated;
grant execute on function public.claim_my_guild_raid_reward(uuid)
  to authenticated;

commit;
