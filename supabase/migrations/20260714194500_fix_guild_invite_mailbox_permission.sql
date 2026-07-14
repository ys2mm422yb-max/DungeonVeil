create or replace function public.accept_guild_invite(p_invite_id uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_invite public.guild_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_invite
  from public.guild_invites
  where id = p_invite_id
    and invited_user_id = auth.uid()
    and status = 'pending'
    and expires_at > now()
  for update;

  if not found then
    raise exception 'invite not found or expired';
  end if;

  insert into public.guild_members (guild_id, user_id, role)
  values (v_invite.guild_id, auth.uid(), 'member');

  update public.guild_invites
  set status = 'accepted'
  where id = p_invite_id;

  return v_invite.guild_id;
end;
$$;

revoke all on function public.accept_guild_invite(uuid) from public;
grant execute on function public.accept_guild_invite(uuid) to authenticated;
