begin;

-- Block 10: dedicated four-player guild raid lobby.
-- This schema is intentionally separate from the existing two-player coop lobby.

create table public.guild_raid_lobbies (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  leader_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'forming' check (status in ('forming', 'ready', 'starting', 'started', 'dissolved')),
  raid_run_id uuid unique,
  version bigint not null default 1 check (version >= 1),
  expires_at timestamptz not null default (clock_timestamp() + interval '2 hours'),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint guild_raid_lobbies_started_run_check check (
    (status = 'started' and raid_run_id is not null)
    or (status <> 'started' and raid_run_id is null)
  )
);

create unique index guild_raid_lobbies_active_leader_uidx
  on public.guild_raid_lobbies (leader_user_id)
  where status in ('forming', 'ready', 'starting');
create index guild_raid_lobbies_guild_status_idx
  on public.guild_raid_lobbies (guild_id, status, updated_at desc);

create table public.guild_raid_lobby_members (
  lobby_id uuid not null references public.guild_raid_lobbies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint,
  status text not null default 'joined' check (status in ('joined', 'ready', 'left_before_start', 'removed_before_start')),
  ready boolean not null default false,
  invited_by uuid not null references auth.users(id) on delete restrict,
  joined_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (lobby_id, user_id),
  constraint guild_raid_lobby_members_slot_check check (slot is null or slot between 1 and 4),
  constraint guild_raid_lobby_members_active_shape_check check (
    (status in ('joined', 'ready') and slot is not null and joined_at is not null and ready = (status = 'ready'))
    or (status in ('left_before_start', 'removed_before_start') and slot is null and ready = false)
  )
);

create unique index guild_raid_lobby_members_slot_uidx
  on public.guild_raid_lobby_members (lobby_id, slot)
  where slot is not null;
create unique index guild_raid_lobby_members_active_user_uidx
  on public.guild_raid_lobby_members (user_id)
  where status in ('joined', 'ready');
create index guild_raid_lobby_members_lobby_status_idx
  on public.guild_raid_lobby_members (lobby_id, status, slot);

create table public.guild_raid_invitations (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.guild_raid_lobbies(id) on delete cascade,
  guild_id uuid not null references public.guilds(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  expires_at timestamptz not null default (clock_timestamp() + interval '30 minutes'),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (lobby_id, target_user_id)
);

create index guild_raid_invitations_target_status_idx
  on public.guild_raid_invitations (target_user_id, status, created_at desc);
create index guild_raid_invitations_lobby_status_idx
  on public.guild_raid_invitations (lobby_id, status, created_at);

create table public.guild_raid_runs (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  lobby_id uuid not null unique references public.guild_raid_lobbies(id) on delete restrict,
  status text not null default 'created' check (status in ('created', 'active', 'completed', 'abandoned', 'failed')),
  current_room smallint not null default 1 check (current_room between 1 and 10),
  room_epoch bigint not null default 1 check (room_epoch >= 1),
  state_version bigint not null default 1 check (state_version >= 1),
  started_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  abandoned_at timestamptz,
  last_server_tick_at timestamptz not null default clock_timestamp(),
  reward_seed bigint not null check (reward_seed >= 0)
);

alter table public.guild_raid_lobbies
  add constraint guild_raid_lobbies_raid_run_fk
  foreign key (raid_run_id) references public.guild_raid_runs(id) on delete restrict;

create table public.guild_raid_participants (
  raid_run_id uuid not null references public.guild_raid_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot between 1 and 4),
  status text not null default 'active' check (status in ('active', 'disconnected', 'completed', 'abandoned')),
  joined_run_at timestamptz not null default clock_timestamp(),
  last_seen_at timestamptz not null default clock_timestamp(),
  disconnect_deadline_at timestamptz,
  last_ack_state_version bigint not null default 0 check (last_ack_state_version >= 0),
  contribution jsonb not null default '{}'::jsonb check (jsonb_typeof(contribution) = 'object'),
  primary key (raid_run_id, user_id),
  unique (raid_run_id, slot)
);

create unique index guild_raid_participants_active_user_uidx
  on public.guild_raid_participants (user_id)
  where status in ('active', 'disconnected');

create table public.guild_raid_room_states (
  raid_run_id uuid not null references public.guild_raid_runs(id) on delete cascade,
  room_number smallint not null check (room_number between 1 and 10),
  room_epoch bigint not null check (room_epoch >= 1),
  status text not null default 'pending' check (status in ('pending', 'active', 'cleared', 'failed')),
  mechanic_state jsonb not null default '{}'::jsonb check (jsonb_typeof(mechanic_state) = 'object'),
  enemy_state jsonb not null default '{}'::jsonb check (jsonb_typeof(enemy_state) = 'object'),
  boss_state jsonb,
  started_at timestamptz,
  cleared_at timestamptz,
  version bigint not null default 1 check (version >= 1),
  primary key (raid_run_id, room_number, room_epoch)
);

create table public.guild_raid_lobby_events (
  id bigint generated always as identity primary key,
  lobby_id uuid not null references public.guild_raid_lobbies(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (char_length(event_type) between 3 and 64),
  idempotency_key uuid not null unique,
  lobby_version bigint not null check (lobby_version >= 1),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default clock_timestamp()
);

create index guild_raid_lobby_events_lobby_id_idx
  on public.guild_raid_lobby_events (lobby_id, id desc);

alter table public.guild_raid_lobbies enable row level security;
alter table public.guild_raid_lobby_members enable row level security;
alter table public.guild_raid_invitations enable row level security;
alter table public.guild_raid_runs enable row level security;
alter table public.guild_raid_participants enable row level security;
alter table public.guild_raid_room_states enable row level security;
alter table public.guild_raid_lobby_events enable row level security;

revoke all on table public.guild_raid_lobbies from anon, authenticated;
revoke all on table public.guild_raid_lobby_members from anon, authenticated;
revoke all on table public.guild_raid_invitations from anon, authenticated;
revoke all on table public.guild_raid_runs from anon, authenticated;
revoke all on table public.guild_raid_participants from anon, authenticated;
revoke all on table public.guild_raid_room_states from anon, authenticated;
revoke all on table public.guild_raid_lobby_events from anon, authenticated;

grant select on table public.guild_raid_lobbies to authenticated;
grant select on table public.guild_raid_lobby_members to authenticated;
grant select on table public.guild_raid_invitations to authenticated;
grant select on table public.guild_raid_runs to authenticated;
grant select on table public.guild_raid_participants to authenticated;
grant select on table public.guild_raid_room_states to authenticated;

create or replace function private.is_guild_raid_lobby_member(p_lobby_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.guild_raid_lobby_members member
    where member.lobby_id = p_lobby_id
      and member.user_id = auth.uid()
      and member.status in ('joined', 'ready')
  );
$$;

create or replace function private.is_guild_raid_run_participant(p_raid_run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.guild_raid_participants participant
    where participant.raid_run_id = p_raid_run_id
      and participant.user_id = auth.uid()
  );
$$;

revoke all on function private.is_guild_raid_lobby_member(uuid) from public, anon, authenticated;
revoke all on function private.is_guild_raid_run_participant(uuid) from public, anon, authenticated;

create policy guild_raid_lobbies_read_participants
  on public.guild_raid_lobbies
  for select to authenticated
  using (private.is_guild_raid_lobby_member(id));

create policy guild_raid_lobby_members_read_participants
  on public.guild_raid_lobby_members
  for select to authenticated
  using (private.is_guild_raid_lobby_member(lobby_id));

create policy guild_raid_invitations_read_related
  on public.guild_raid_invitations
  for select to authenticated
  using (
    target_user_id = (select auth.uid())
    or private.is_guild_raid_lobby_member(lobby_id)
  );

create policy guild_raid_runs_read_participants
  on public.guild_raid_runs
  for select to authenticated
  using (private.is_guild_raid_run_participant(id));

create policy guild_raid_participants_read_run_participants
  on public.guild_raid_participants
  for select to authenticated
  using (private.is_guild_raid_run_participant(raid_run_id));

create policy guild_raid_room_states_read_run_participants
  on public.guild_raid_room_states
  for select to authenticated
  using (private.is_guild_raid_run_participant(raid_run_id));

create or replace function private.guild_raid_build_snapshot(p_lobby_id uuid, p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'lobbyId', lobby.id,
    'guildId', lobby.guild_id,
    'guildName', guild.name,
    'guildTag', guild.tag,
    'leaderUserId', lobby.leader_user_id,
    'status', lobby.status,
    'raidRunId', lobby.raid_run_id,
    'version', lobby.version,
    'expiresAt', lobby.expires_at,
    'serverNow', clock_timestamp(),
    'viewerUserId', p_user_id,
    'viewerIsLeader', lobby.leader_user_id = p_user_id,
    'memberCount', (
      select count(*)::integer
      from public.guild_raid_lobby_members member
      where member.lobby_id = lobby.id and member.status in ('joined', 'ready')
    ),
    'readyCount', (
      select count(*)::integer
      from public.guild_raid_lobby_members member
      where member.lobby_id = lobby.id and member.status = 'ready'
    ),
    'canStart', lobby.leader_user_id = p_user_id
      and lobby.status = 'ready'
      and (
        select count(*) = 4 and bool_and(member.ready)
        from public.guild_raid_lobby_members member
        where member.lobby_id = lobby.id and member.status in ('joined', 'ready')
      ),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'userId', member.user_id,
        'slot', member.slot,
        'status', member.status,
        'ready', member.ready,
        'joinedAt', member.joined_at,
        'displayName', coalesce(profile.display_name, 'Abenteurer'),
        'avatarKey', profile.avatar_key,
        'guildRole', guild_member.role,
        'isLeader', member.user_id = lobby.leader_user_id
      ) order by member.slot)
      from public.guild_raid_lobby_members member
      left join public.profiles profile on profile.id = member.user_id
      left join public.guild_members guild_member
        on guild_member.guild_id = lobby.guild_id and guild_member.user_id = member.user_id
      where member.lobby_id = lobby.id and member.status in ('joined', 'ready')
    ), '[]'::jsonb),
    'invitations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'invitationId', invitation.id,
        'targetUserId', invitation.target_user_id,
        'displayName', coalesce(profile.display_name, 'Abenteurer'),
        'avatarKey', profile.avatar_key,
        'status', invitation.status,
        'expiresAt', invitation.expires_at
      ) order by invitation.created_at)
      from public.guild_raid_invitations invitation
      left join public.profiles profile on profile.id = invitation.target_user_id
      where invitation.lobby_id = lobby.id
        and invitation.status = 'pending'
        and invitation.expires_at > clock_timestamp()
        and (lobby.leader_user_id = p_user_id or invitation.target_user_id = p_user_id)
    ), '[]'::jsonb)
  )
  from public.guild_raid_lobbies lobby
  join public.guilds guild on guild.id = lobby.guild_id
  where lobby.id = p_lobby_id;
$$;

revoke all on function private.guild_raid_build_snapshot(uuid, uuid) from public, anon, authenticated;

create or replace function public.guild_raid_get_snapshot(p_lobby_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_lobby_id uuid := p_lobby_id;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;

  if v_lobby_id is null then
    select member.lobby_id into v_lobby_id
    from public.guild_raid_lobby_members member
    join public.guild_raid_lobbies lobby on lobby.id = member.lobby_id
    where member.user_id = v_user_id
      and member.status in ('joined', 'ready')
      and lobby.status in ('forming', 'ready', 'starting', 'started')
    order by lobby.updated_at desc
    limit 1;
  end if;

  if v_lobby_id is null then return null; end if;
  if not exists (
    select 1 from public.guild_raid_lobby_members member
    where member.lobby_id = v_lobby_id and member.user_id = v_user_id and member.status in ('joined', 'ready')
  ) and not exists (
    select 1 from public.guild_raid_invitations invitation
    where invitation.lobby_id = v_lobby_id and invitation.target_user_id = v_user_id
      and invitation.status = 'pending' and invitation.expires_at > clock_timestamp()
  ) then
    raise exception 'raid lobby access denied';
  end if;

  return private.guild_raid_build_snapshot(v_lobby_id, v_user_id);
end;
$$;

create or replace function public.guild_raid_list_my_invitations()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'invitationId', invitation.id,
    'lobbyId', invitation.lobby_id,
    'guildId', invitation.guild_id,
    'guildName', guild.name,
    'guildTag', guild.tag,
    'leaderUserId', lobby.leader_user_id,
    'leaderName', coalesce(profile.display_name, 'Abenteurer'),
    'expiresAt', invitation.expires_at
  ) order by invitation.created_at desc), '[]'::jsonb)
  from public.guild_raid_invitations invitation
  join public.guild_raid_lobbies lobby on lobby.id = invitation.lobby_id
  join public.guilds guild on guild.id = invitation.guild_id
  left join public.profiles profile on profile.id = lobby.leader_user_id
  where auth.uid() is not null
    and invitation.target_user_id = auth.uid()
    and invitation.status = 'pending'
    and invitation.expires_at > clock_timestamp()
    and lobby.status in ('forming', 'ready');
$$;

commit;
