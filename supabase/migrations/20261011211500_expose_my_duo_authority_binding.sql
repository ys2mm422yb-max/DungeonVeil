-- Browser clients must discover the exact server-owned run attempt before calling the
-- Duo authority Edge boundary. The caller supplies only the lobby identity; membership,
-- active status, run attempt and seed are resolved from the authenticated database state.
create or replace function public.get_my_coop_authority_binding(p_lobby_id uuid)
returns table (
  lobby_id uuid,
  run_attempt integer,
  run_seed bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select lobby.id, lobby.run_attempt, lobby.run_seed
  from public.coop_lobbies as lobby
  join public.coop_lobby_members as member
    on member.lobby_id = lobby.id
   and member.user_id = auth.uid()
   and member.left_at is null
  where auth.uid() is not null
    and lobby.id = p_lobby_id
    and lobby.status = 'in_run'
  limit 1
$$;

revoke all on function public.get_my_coop_authority_binding(uuid) from public, anon;
grant execute on function public.get_my_coop_authority_binding(uuid) to authenticated;

comment on function public.get_my_coop_authority_binding(uuid) is
  'Returns the authenticated active member current server-owned Duo authority attempt and seed.';

select pg_notify('pgrst', 'reload schema');
