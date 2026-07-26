begin;

create table if not exists public.guild_raid_lobbies (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  leader_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'open' check (status in ('open','starting','started','closed')),
  version bigint not null default 1,
  run_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists guild_raid_lobbies_one_active_per_guild
  on public.guild_raid_lobbies(guild_id)
  where status in ('open','starting');

create table if not exists public.guild_raid_lobby_members (
  lobby_id uuid not null references public.guild_raid_lobbies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot between 1 and 4),
  ready boolean not null default false,
  connected boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (lobby_id, user_id),
  unique (lobby_id, slot)
);

create unique index if not exists guild_raid_members_one_active_lobby
  on public.guild_raid_lobby_members(user_id);

create table if not exists public.guild_raid_invitations (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.guild_raid_lobbies(id) on delete cascade,
  invited_user_id uuid not null references auth.users(id) on delete cascade,
  invited_by_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled','expired')),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists guild_raid_invites_one_pending
  on public.guild_raid_invitations(lobby_id, invited_user_id)
  where status = 'pending';

create table if not exists public.guild_raid_runs (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null unique references public.guild_raid_lobbies(id) on delete restrict,
  guild_id uuid not null references public.guilds(id) on delete restrict,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  idempotency_key text not null,
  status text not null default 'created' check (status in ('created','active','completed','abandoned')),
  created_at timestamptz not null default now(),
  unique (created_by_user_id, idempotency_key)
);

alter table public.guild_raid_lobbies enable row level security;
alter table public.guild_raid_lobby_members enable row level security;
alter table public.guild_raid_invitations enable row level security;
alter table public.guild_raid_runs enable row level security;

create or replace function public.guild_raid_snapshot(p_lobby_id uuid)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'lobby_id', l.id,
    'guild_id', l.guild_id,
    'status', l.status,
    'version', l.version,
    'leader_user_id', l.leader_user_id,
    'run_id', l.run_id,
    'slots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slot', m.slot,
        'user_id', m.user_id,
        'display_name', coalesce(p.display_name, 'Abenteurer'),
        'avatar_key', p.avatar_key,
        'ready', m.ready,
        'connected', m.connected
      ) order by m.slot)
      from public.guild_raid_lobby_members m
      left join public.player_profiles p on p.id = m.user_id
      where m.lobby_id = l.id
    ), '[]'::jsonb)
  )
  from public.guild_raid_lobbies l
  where l.id = p_lobby_id;
$$;

create or replace function public.guild_raid_create_or_get_lobby()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_guild uuid;
  v_lobby uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  select gm.guild_id into v_guild from public.guild_members gm where gm.user_id = v_user limit 1;
  if v_guild is null then raise exception 'guild membership required'; end if;

  select m.lobby_id into v_lobby from public.guild_raid_lobby_members m
  join public.guild_raid_lobbies l on l.id = m.lobby_id
  where m.user_id = v_user and l.status in ('open','starting') limit 1;

  if v_lobby is null then
    select id into v_lobby from public.guild_raid_lobbies where guild_id = v_guild and status in ('open','starting') limit 1 for update;
    if v_lobby is null then
      insert into public.guild_raid_lobbies(guild_id, leader_user_id) values (v_guild, v_user) returning id into v_lobby;
    end if;
    if not exists (select 1 from public.guild_raid_lobby_members where lobby_id = v_lobby and user_id = v_user) then
      insert into public.guild_raid_lobby_members(lobby_id, user_id, slot)
      select v_lobby, v_user, s from generate_series(1,4) s
      where not exists (select 1 from public.guild_raid_lobby_members where lobby_id = v_lobby and slot = s)
      order by s limit 1;
      update public.guild_raid_lobbies set version = version + 1, updated_at = now() where id = v_lobby;
    end if;
  end if;
  return public.guild_raid_snapshot(v_lobby);
end;
$$;

create or replace function public.guild_raid_get_lobby_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_lobby uuid;
begin
  select lobby_id into v_lobby from public.guild_raid_lobby_members where user_id = auth.uid() limit 1;
  if v_lobby is null then return null; end if;
  return public.guild_raid_snapshot(v_lobby);
end;
$$;

create or replace function public.guild_raid_invite_member(p_invited_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_lobby uuid; v_guild uuid;
begin
  select l.id, l.guild_id into v_lobby, v_guild from public.guild_raid_lobbies l where l.leader_user_id = auth.uid() and l.status = 'open' limit 1;
  if v_lobby is null then raise exception 'leader lobby required'; end if;
  if not exists (select 1 from public.guild_members where guild_id = v_guild and user_id = p_invited_user_id) then raise exception 'same guild membership required'; end if;
  if (select count(*) from public.guild_raid_lobby_members where lobby_id = v_lobby) >= 4 then raise exception 'lobby full'; end if;
  insert into public.guild_raid_invitations(lobby_id, invited_user_id, invited_by_user_id)
  values (v_lobby, p_invited_user_id, auth.uid())
  on conflict (lobby_id, invited_user_id) where status = 'pending' do update set expires_at = now() + interval '30 minutes', updated_at = now();
end;
$$;

create or replace function public.guild_raid_accept_invitation(p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_inv public.guild_raid_invitations%rowtype; v_slot int; v_guild uuid;
begin
  select * into v_inv from public.guild_raid_invitations where id = p_invitation_id for update;
  if v_inv.id is null or v_inv.invited_user_id <> auth.uid() then raise exception 'invitation unavailable'; end if;
  if v_inv.status = 'accepted' then return public.guild_raid_snapshot(v_inv.lobby_id); end if;
  if v_inv.status <> 'pending' or v_inv.expires_at <= now() then raise exception 'invitation expired'; end if;
  select guild_id into v_guild from public.guild_raid_lobbies where id = v_inv.lobby_id and status = 'open' for update;
  if v_guild is null then raise exception 'lobby unavailable'; end if;
  if not exists (select 1 from public.guild_members where guild_id = v_guild and user_id = auth.uid()) then raise exception 'same guild membership required'; end if;
  if exists (select 1 from public.guild_raid_lobby_members where user_id = auth.uid()) then raise exception 'already in active raid lobby'; end if;
  select s into v_slot from generate_series(1,4) s where not exists (select 1 from public.guild_raid_lobby_members where lobby_id = v_inv.lobby_id and slot = s) order by s limit 1;
  if v_slot is null then raise exception 'lobby full'; end if;
  insert into public.guild_raid_lobby_members(lobby_id,user_id,slot) values (v_inv.lobby_id,auth.uid(),v_slot);
  update public.guild_raid_invitations set status='accepted',updated_at=now() where id=p_invitation_id;
  update public.guild_raid_lobbies set version=version+1,updated_at=now() where id=v_inv.lobby_id;
  return public.guild_raid_snapshot(v_inv.lobby_id);
end;
$$;

create or replace function public.guild_raid_decline_invitation(p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_lobby uuid;
begin
  update public.guild_raid_invitations set status='declined',updated_at=now()
  where id=p_invitation_id and invited_user_id=auth.uid() and status='pending'
  returning lobby_id into v_lobby;
  if v_lobby is null then return null; end if;
  return public.guild_raid_snapshot(v_lobby);
end;
$$;

create or replace function public.guild_raid_set_ready(p_ready boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_lobby uuid;
begin
  update public.guild_raid_lobby_members set ready=p_ready where user_id=auth.uid() returning lobby_id into v_lobby;
  if v_lobby is null then raise exception 'not in lobby'; end if;
  update public.guild_raid_lobbies set version=version+1,updated_at=now() where id=v_lobby and status='open';
  return public.guild_raid_snapshot(v_lobby);
end;
$$;

create or replace function public.guild_raid_leave_lobby()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_lobby uuid; v_was_leader boolean; v_next uuid;
begin
  select m.lobby_id, l.leader_user_id=auth.uid() into v_lobby,v_was_leader from public.guild_raid_lobby_members m join public.guild_raid_lobbies l on l.id=m.lobby_id where m.user_id=auth.uid() for update;
  if v_lobby is null then return; end if;
  delete from public.guild_raid_lobby_members where lobby_id=v_lobby and user_id=auth.uid();
  update public.guild_raid_lobby_members set ready=false where lobby_id=v_lobby;
  if not exists(select 1 from public.guild_raid_lobby_members where lobby_id=v_lobby) then
    update public.guild_raid_lobbies set status='closed',version=version+1,updated_at=now() where id=v_lobby;
  elsif v_was_leader then
    select user_id into v_next from public.guild_raid_lobby_members where lobby_id=v_lobby order by slot,joined_at,user_id limit 1;
    update public.guild_raid_lobbies set leader_user_id=v_next,version=version+1,updated_at=now() where id=v_lobby;
  else
    update public.guild_raid_lobbies set version=version+1,updated_at=now() where id=v_lobby;
  end if;
end;
$$;

create or replace function public.guild_raid_start_lobby(p_idempotency_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_lobby public.guild_raid_lobbies%rowtype; v_run uuid;
begin
  if nullif(trim(p_idempotency_key),'') is null then raise exception 'idempotency key required'; end if;
  select * into v_lobby from public.guild_raid_lobbies where leader_user_id=auth.uid() and status in ('open','starting','started') limit 1 for update;
  if v_lobby.id is null then raise exception 'leader lobby required'; end if;
  if v_lobby.run_id is not null then return public.guild_raid_snapshot(v_lobby.id); end if;
  if (select count(*) from public.guild_raid_lobby_members where lobby_id=v_lobby.id) <> 4 then raise exception 'exactly four members required'; end if;
  if exists(select 1 from public.guild_raid_lobby_members where lobby_id=v_lobby.id and not ready) then raise exception 'all members must be ready'; end if;
  insert into public.guild_raid_runs(lobby_id,guild_id,created_by_user_id,idempotency_key)
  values(v_lobby.id,v_lobby.guild_id,auth.uid(),p_idempotency_key)
  on conflict (created_by_user_id,idempotency_key) do update set idempotency_key=excluded.idempotency_key
  returning id into v_run;
  update public.guild_raid_lobbies set status='started',run_id=v_run,version=version+1,updated_at=now() where id=v_lobby.id;
  return public.guild_raid_snapshot(v_lobby.id);
end;
$$;

create or replace function public.guild_raid_list_invitations()
returns table(id uuid,lobby_id uuid,invited_user_id uuid,invited_display_name text,status text,expires_at timestamptz)
language sql
security definer
set search_path = public, pg_temp
as $$
  select i.id,i.lobby_id,i.invited_user_id,coalesce(p.display_name,'Abenteurer'),
    case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end,
    i.expires_at
  from public.guild_raid_invitations i
  left join public.player_profiles p on p.id=i.invited_user_id
  where i.invited_user_id=auth.uid() or i.invited_by_user_id=auth.uid();
$$;

create policy guild_raid_lobbies_read_participants on public.guild_raid_lobbies for select to authenticated using (exists(select 1 from public.guild_raid_lobby_members m where m.lobby_id=id and m.user_id=auth.uid()));
create policy guild_raid_members_read_participants on public.guild_raid_lobby_members for select to authenticated using (exists(select 1 from public.guild_raid_lobby_members me where me.lobby_id=lobby_id and me.user_id=auth.uid()));
create policy guild_raid_invitations_read_scoped on public.guild_raid_invitations for select to authenticated using (invited_user_id=auth.uid() or invited_by_user_id=auth.uid());
create policy guild_raid_runs_read_participants on public.guild_raid_runs for select to authenticated using (exists(select 1 from public.guild_raid_lobby_members m where m.lobby_id=lobby_id and m.user_id=auth.uid()));

revoke all on public.guild_raid_lobbies, public.guild_raid_lobby_members, public.guild_raid_invitations, public.guild_raid_runs from anon, authenticated;
grant select on public.guild_raid_lobbies, public.guild_raid_lobby_members, public.guild_raid_invitations, public.guild_raid_runs to authenticated;
grant execute on function public.guild_raid_create_or_get_lobby() to authenticated;
grant execute on function public.guild_raid_get_lobby_snapshot() to authenticated;
grant execute on function public.guild_raid_invite_member(uuid) to authenticated;
grant execute on function public.guild_raid_accept_invitation(uuid) to authenticated;
grant execute on function public.guild_raid_decline_invitation(uuid) to authenticated;
grant execute on function public.guild_raid_set_ready(boolean) to authenticated;
grant execute on function public.guild_raid_leave_lobby() to authenticated;
grant execute on function public.guild_raid_start_lobby(text) to authenticated;
grant execute on function public.guild_raid_list_invitations() to authenticated;

commit;
