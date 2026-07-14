create table if not exists public.guild_messages (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 400),
  created_at timestamptz not null default now()
);

create index if not exists guild_messages_guild_created_idx
  on public.guild_messages (guild_id, created_at desc);
create index if not exists guild_messages_user_idx
  on public.guild_messages (user_id);

alter table public.guild_messages enable row level security;
revoke all on public.guild_messages from anon, authenticated;
grant select, insert on public.guild_messages to authenticated;

drop policy if exists guild_messages_read_members on public.guild_messages;
create policy guild_messages_read_members
  on public.guild_messages for select to authenticated
  using (
    exists (
      select 1 from public.guild_members gm
      where gm.guild_id = guild_messages.guild_id
        and gm.user_id = (select auth.uid())
    )
  );

drop policy if exists guild_messages_send_members on public.guild_messages;
create policy guild_messages_send_members
  on public.guild_messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.guild_members gm
      where gm.guild_id = guild_messages.guild_id
        and gm.user_id = (select auth.uid())
    )
  );
