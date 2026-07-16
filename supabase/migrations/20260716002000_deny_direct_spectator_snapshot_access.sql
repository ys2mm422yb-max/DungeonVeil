drop policy if exists spectator_snapshots_deny_direct_access on public.spectator_snapshots;
create policy spectator_snapshots_deny_direct_access
on public.spectator_snapshots
for all
to public
using (false)
with check (false);
