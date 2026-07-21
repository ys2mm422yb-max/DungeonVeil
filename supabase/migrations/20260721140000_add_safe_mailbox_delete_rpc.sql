-- Allow players to remove only their own completed mailbox entries while
-- keeping direct table DELETE permission disabled for authenticated clients.
-- The p_mail_ids name is retained for compatibility with the already deployed RPC.
create or replace function public.delete_mailbox_messages(p_mail_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_count integer := 0;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;

  if coalesce(cardinality(p_mail_ids), 0) = 0 then
    return 0;
  end if;

  delete from public.player_mailbox mail
  where mail.user_id = v_user
    and mail.id = any(p_mail_ids)
    and (
      mail.actioned_at is not null
      or (
        mail.read_at is not null
        and mail.kind in ('system', 'notice')
        and coalesce(mail.payload ->> 'kind', '') <> 'coop_invite'
      )
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.delete_mailbox_messages(uuid[]) from public;
grant execute on function public.delete_mailbox_messages(uuid[]) to authenticated;