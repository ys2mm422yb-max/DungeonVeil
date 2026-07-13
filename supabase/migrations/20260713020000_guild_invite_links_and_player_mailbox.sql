create table if not exists public.guild_invite_links (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  token_hash text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  max_uses integer not null default 25 check (max_uses between 1 and 100),
  use_count integer not null default 0 check (use_count >= 0),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists guild_invite_links_guild_active_idx
  on public.guild_invite_links (guild_id, expires_at desc)
  where revoked_at is null;

alter table public.guild_invite_links enable row level security;
revoke all on public.guild_invite_links from anon, authenticated;

create table if not exists public.player_mailbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('guild_invite', 'system', 'notice', 'reward')),
  title text not null,
  body text not null default '',
  payload jsonb not null default '{}'::jsonb,
  source_key text,
  read_at timestamptz,
  actioned_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists player_mailbox_user_created_idx
  on public.player_mailbox (user_id, created_at desc);
create index if not exists player_mailbox_user_unread_idx
  on public.player_mailbox (user_id, created_at desc)
  where read_at is null;
create unique index if not exists player_mailbox_user_source_key_uidx
  on public.player_mailbox (user_id, source_key)
  where source_key is not null;

alter table public.player_mailbox enable row level security;
revoke all on public.player_mailbox from anon, authenticated;
grant select on public.player_mailbox to authenticated;

drop policy if exists player_mailbox_read_own on public.player_mailbox;
create policy player_mailbox_read_own
  on public.player_mailbox for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.create_guild_invite_link(
  p_guild_id uuid,
  p_expires_hours integer default 168,
  p_max_uses integer default 25
)
returns table(token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_token text;
  v_expires timestamptz;
  v_hours integer;
  v_max_uses integer;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if not private.is_guild_officer(p_guild_id) then raise exception 'guild officer role required'; end if;
  v_hours := greatest(1, least(coalesce(p_expires_hours, 168), 720));
  v_max_uses := greatest(1, least(coalesce(p_max_uses, 25), 100));
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  v_expires := now() + make_interval(hours => v_hours);
  insert into public.guild_invite_links (guild_id, token_hash, created_by, expires_at, max_uses)
  values (p_guild_id, encode(extensions.digest(v_token, 'sha256'), 'hex'), v_user, v_expires, v_max_uses);
  return query select v_token, v_expires;
end;
$$;

create or replace function public.claim_guild_invite_link(p_token text)
returns table(invite_id uuid, guild_id uuid, guild_name text, guild_tag text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_link public.guild_invite_links%rowtype;
  v_invite public.guild_invites%rowtype;
  v_guild public.guilds%rowtype;
  v_new_claim boolean := false;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce(length(trim(p_token)), 0) < 32 then raise exception 'invalid invite link'; end if;
  if exists (select 1 from public.guild_members where user_id = v_user) then raise exception 'you already belong to a guild'; end if;

  select l.* into v_link from public.guild_invite_links l
  where l.token_hash = encode(extensions.digest(trim(p_token), 'sha256'), 'hex')
    and l.revoked_at is null and l.expires_at > now() and l.use_count < l.max_uses
  for update;
  if not found then raise exception 'invite link is invalid or expired'; end if;

  select * into v_guild from public.guilds where id = v_link.guild_id;
  if not found then raise exception 'guild not found'; end if;

  select i.* into v_invite from public.guild_invites i
  where i.guild_id = v_link.guild_id and i.invited_user_id = v_user
  for update;

  if found then
    if v_invite.status <> 'pending' or v_invite.expires_at <= now() then
      update public.guild_invites
      set status = 'pending', invited_by = v_link.created_by,
          expires_at = least(v_link.expires_at, now() + interval '7 days'), created_at = now()
      where id = v_invite.id returning * into v_invite;
      v_new_claim := true;
    end if;
  else
    insert into public.guild_invites (guild_id, invited_user_id, invited_by, status, expires_at)
    values (v_link.guild_id, v_user, v_link.created_by, 'pending', least(v_link.expires_at, now() + interval '7 days'))
    returning * into v_invite;
    v_new_claim := true;
  end if;

  if v_new_claim then update public.guild_invite_links set use_count = use_count + 1 where id = v_link.id; end if;
  return query select v_invite.id, v_guild.id, v_guild.name, v_guild.tag, v_invite.expires_at;
end;
$$;

create or replace function public.mark_mailbox_read(p_ids uuid[] default null)
returns integer language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_count integer;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  update public.player_mailbox set read_at = coalesce(read_at, now())
  where user_id = v_user and read_at is null and (p_ids is null or id = any(p_ids));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.mark_mailbox_actioned(p_mail_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  update public.player_mailbox
  set actioned_at = coalesce(actioned_at, now()), read_at = coalesce(read_at, now())
  where id = p_mail_id and user_id = auth.uid();
end;
$$;

create or replace function public.queue_guild_invite_mail()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_guild public.guilds%rowtype;
begin
  if new.status <> 'pending' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'pending' and old.expires_at = new.expires_at then return new; end if;
  select * into v_guild from public.guilds where id = new.guild_id;
  if not found then return new; end if;
  insert into public.player_mailbox (user_id, kind, title, body, payload, source_key, expires_at)
  values (
    new.invited_user_id, 'guild_invite', 'Gildeneinladung',
    '[' || v_guild.tag || '] ' || v_guild.name || ' lädt dich in die Gilde ein.',
    jsonb_build_object('invite_id', new.id, 'guild_id', v_guild.id, 'guild_name', v_guild.name, 'guild_tag', v_guild.tag),
    'guild-invite:' || new.id::text, new.expires_at
  )
  on conflict (user_id, source_key) where source_key is not null do update set
    body = excluded.body, payload = excluded.payload, expires_at = excluded.expires_at,
    read_at = null, actioned_at = null, created_at = now();
  return new;
end;
$$;

drop trigger if exists guild_invites_mailbox_trigger on public.guild_invites;
create trigger guild_invites_mailbox_trigger
after insert or update of status, expires_at on public.guild_invites
for each row execute function public.queue_guild_invite_mail();

create or replace function public.accept_guild_invite(p_invite_id uuid)
returns uuid language plpgsql set search_path = public as $$
declare v_invite public.guild_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_invite from public.guild_invites
  where id = p_invite_id and invited_user_id = auth.uid() and status = 'pending' and expires_at > now()
  for update;
  if not found then raise exception 'invite not found or expired'; end if;
  insert into public.guild_members (guild_id, user_id, role) values (v_invite.guild_id, auth.uid(), 'member');
  update public.guild_invites set status = 'accepted' where id = p_invite_id;
  update public.player_mailbox
  set actioned_at = coalesce(actioned_at, now()), read_at = coalesce(read_at, now())
  where user_id = auth.uid() and source_key = 'guild-invite:' || p_invite_id::text;
  return v_invite.guild_id;
end;
$$;

insert into public.player_mailbox (user_id, kind, title, body, payload, source_key)
select i.invited_user_id, 'guild_invite', 'Gildeneinladung',
       '[' || g.tag || '] ' || g.name || ' lädt dich in die Gilde ein.',
       jsonb_build_object('invite_id', i.id, 'guild_id', g.id, 'guild_name', g.name, 'guild_tag', g.tag),
       'guild-invite:' || i.id::text
from public.guild_invites i join public.guilds g on g.id = i.guild_id
where i.status = 'pending' and i.expires_at > now()
on conflict (user_id, source_key) where source_key is not null do nothing;

insert into public.player_mailbox (user_id, kind, title, body, payload, source_key)
select p.id, 'system', 'Der Weltboss ist da',
       'Der Wochenriss wurde aus dem Hauptmenü entfernt. Wöchentliche Herausforderungen laufen jetzt über den Weltboss und das Postfach informiert dich über wichtige Neuigkeiten.',
       jsonb_build_object('section', 'world_boss'), 'system:worldboss-replaces-weekly-rift'
from public.profiles p
on conflict (user_id, source_key) where source_key is not null do nothing;

revoke all on function public.create_guild_invite_link(uuid, integer, integer) from public;
revoke all on function public.claim_guild_invite_link(text) from public;
revoke all on function public.mark_mailbox_read(uuid[]) from public;
revoke all on function public.mark_mailbox_actioned(uuid) from public;
grant execute on function public.create_guild_invite_link(uuid, integer, integer) to authenticated;
grant execute on function public.claim_guild_invite_link(text) to authenticated;
grant execute on function public.mark_mailbox_read(uuid[]) to authenticated;
grant execute on function public.mark_mailbox_actioned(uuid) to authenticated;
