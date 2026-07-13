revoke execute on function public.create_guild_invite_link(uuid, integer, integer) from anon;
revoke execute on function public.claim_guild_invite_link(text) from anon;
revoke execute on function public.mark_mailbox_read(uuid[]) from anon;
revoke execute on function public.mark_mailbox_actioned(uuid) from anon;
revoke execute on function public.queue_guild_invite_mail() from anon, authenticated;

grant execute on function public.create_guild_invite_link(uuid, integer, integer) to authenticated;
grant execute on function public.claim_guild_invite_link(text) to authenticated;
grant execute on function public.mark_mailbox_read(uuid[]) to authenticated;
grant execute on function public.mark_mailbox_actioned(uuid) to authenticated;
