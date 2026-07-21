create or replace function public.delete_mailbox_messages(p_mail_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
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

revoke all on function public.delete_mailbox_messages(uuid[]) from public, anon;
grant execute on function public.delete_mailbox_messages(uuid[]) to authenticated;

select pg_notify('pgrst', 'reload schema');
