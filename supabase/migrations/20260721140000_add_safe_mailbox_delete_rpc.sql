-- Allow players to remove only their own completed mailbox entries while
-- keeping direct table DELETE permission disabled for authenticated clients.
create or replace function public.delete_mailbox_messages(p_ids uuid[])
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

  if coalesce(cardinality(p_ids), 0) = 0 then
    return 0;
  end if;

  delete from public.player_mailbox
  where user_id = v_user
    and id = any(p_ids)
    and (
      actioned_at is not null
      or (
        read_at is not null
        and kind in ('system', 'notice')
        and coalesce(payload ->> 'kind', '') <> 'coop_invite'
      )
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.delete_mailbox_messages(uuid[]) from public;
grant execute on function public.delete_mailbox_messages(uuid[]) to authenticated;
