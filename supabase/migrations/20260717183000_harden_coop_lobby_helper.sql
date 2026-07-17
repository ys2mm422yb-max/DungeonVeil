create or replace function private.is_coop_lobby_member(p_lobby_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.coop_lobby_members member
    where member.lobby_id = p_lobby_id
      and member.user_id = auth.uid()
      and member.left_at is null
  );
$$;

revoke all on function private.is_coop_lobby_member(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_coop_lobby_member(uuid) to authenticated;

drop policy if exists coop_lobbies_read_members on public.coop_lobbies;
create policy coop_lobbies_read_members
  on public.coop_lobbies
  for select
  to authenticated
  using (private.is_coop_lobby_member(id));

drop policy if exists coop_lobby_members_read_members on public.coop_lobby_members;
create policy coop_lobby_members_read_members
  on public.coop_lobby_members
  for select
  to authenticated
  using (private.is_coop_lobby_member(lobby_id));

revoke all on function public.is_coop_lobby_member(uuid, uuid) from public, anon, authenticated;
drop function public.is_coop_lobby_member(uuid, uuid);
