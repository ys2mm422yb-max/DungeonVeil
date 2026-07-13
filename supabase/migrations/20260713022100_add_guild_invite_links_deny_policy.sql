drop policy if exists guild_invite_links_no_direct_access on public.guild_invite_links;
create policy guild_invite_links_no_direct_access
  on public.guild_invite_links for all to authenticated
  using (false)
  with check (false);
