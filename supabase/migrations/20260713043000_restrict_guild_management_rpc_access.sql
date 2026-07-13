revoke all on function public.leave_guild() from public, anon;
revoke all on function public.transfer_guild_ownership(uuid, uuid) from public, anon;
grant execute on function public.leave_guild() to authenticated;
grant execute on function public.transfer_guild_ownership(uuid, uuid) to authenticated;
select pg_notify('pgrst', 'reload schema');
