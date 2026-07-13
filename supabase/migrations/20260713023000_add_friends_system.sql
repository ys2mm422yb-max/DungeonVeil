create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friend_requests_not_self check (sender_id <> receiver_id),
  constraint friend_requests_sender_receiver_key unique (sender_id, receiver_id)
);

create table if not exists public.friendships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_user_id),
  constraint friendships_not_self check (user_id <> friend_user_id)
);

create index if not exists friend_requests_receiver_pending_idx on public.friend_requests(receiver_id, created_at desc) where status = 'pending';
create index if not exists friend_requests_sender_pending_idx on public.friend_requests(sender_id, created_at desc) where status = 'pending';
create index if not exists friendships_user_created_idx on public.friendships(user_id, created_at desc);

alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;

drop policy if exists friend_requests_read_related on public.friend_requests;
create policy friend_requests_read_related on public.friend_requests for select to authenticated using (sender_id = (select auth.uid()) or receiver_id = (select auth.uid()));

drop policy if exists friendships_read_own on public.friendships;
create policy friendships_read_own on public.friendships for select to authenticated using (user_id = (select auth.uid()));

revoke all on table public.friend_requests from anon;
revoke all on table public.friendships from anon;
grant select on table public.friend_requests to authenticated;
grant select on table public.friendships to authenticated;

alter table public.player_mailbox drop constraint if exists player_mailbox_kind_check;
alter table public.player_mailbox add constraint player_mailbox_kind_check check (kind in ('guild_invite','friend_request','system','notice','reward'));

create or replace function public.send_friend_request(p_display_name text)
returns table(request_id uuid, user_id uuid, display_name text, avatar_key text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_target public.profiles%rowtype;
  v_request public.friend_requests%rowtype;
  v_sender_name text;
begin
  if v_me is null then raise exception 'authentication required'; end if;
  if length(trim(coalesce(p_display_name, ''))) < 2 then raise exception 'Spielername eingeben'; end if;

  select * into v_target
  from public.profiles
  where lower(display_name) = lower(trim(p_display_name))
  order by case when display_name = trim(p_display_name) then 0 else 1 end, created_at asc
  limit 1;

  if not found then raise exception 'Spieler nicht gefunden'; end if;
  if v_target.id = v_me then raise exception 'Du kannst dich nicht selbst hinzufügen'; end if;
  if exists (select 1 from public.friendships where user_id = v_me and friend_user_id = v_target.id) then
    raise exception 'Ihr seid bereits Freunde';
  end if;
  if exists (
    select 1 from public.friend_requests
    where sender_id = v_target.id and receiver_id = v_me and status = 'pending'
  ) then
    raise exception 'Diese Person hat dir bereits eine Anfrage geschickt';
  end if;

  insert into public.friend_requests(sender_id, receiver_id, status, created_at, updated_at, responded_at)
  values (v_me, v_target.id, 'pending', now(), now(), null)
  on conflict (sender_id, receiver_id) do update
    set status = 'pending', updated_at = now(), responded_at = null
  returning * into v_request;

  select display_name into v_sender_name from public.profiles where id = v_me;

  insert into public.player_mailbox(user_id, kind, title, body, payload, source_key, expires_at)
  values (
    v_target.id,
    'friend_request',
    'Neue Freundschaftsanfrage',
    coalesce(v_sender_name, 'Ein Spieler') || ' möchte mit dir befreundet sein.',
    jsonb_build_object('request_id', v_request.id, 'sender_id', v_me, 'sender_name', coalesce(v_sender_name, 'Spieler')),
    'friend-request:' || v_request.id::text,
    now() + interval '30 days'
  )
  on conflict (user_id, source_key) where source_key is not null do update
    set read_at = null,
        actioned_at = null,
        created_at = now(),
        expires_at = excluded.expires_at,
        title = excluded.title,
        body = excluded.body,
        payload = excluded.payload;

  return query select v_request.id, v_target.id, v_target.display_name, v_target.avatar_key;
end;
$$;

create or replace function public.accept_friend_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_request public.friend_requests%rowtype;
  v_receiver_name text;
begin
  if v_me is null then raise exception 'authentication required'; end if;

  select * into v_request
  from public.friend_requests
  where id = p_request_id and receiver_id = v_me and status = 'pending'
  for update;

  if not found then raise exception 'Anfrage nicht gefunden oder bereits erledigt'; end if;

  update public.friend_requests
  set status = 'accepted', updated_at = now(), responded_at = now()
  where id = p_request_id;

  insert into public.friendships(user_id, friend_user_id)
  values (v_me, v_request.sender_id), (v_request.sender_id, v_me)
  on conflict do nothing;

  update public.player_mailbox
  set actioned_at = now(), read_at = coalesce(read_at, now())
  where user_id = v_me and source_key = 'friend-request:' || p_request_id::text;

  select display_name into v_receiver_name from public.profiles where id = v_me;
  insert into public.player_mailbox(user_id, kind, title, body, payload, source_key)
  values (
    v_request.sender_id,
    'notice',
    'Freundschaftsanfrage angenommen',
    coalesce(v_receiver_name, 'Ein Spieler') || ' hat deine Freundschaftsanfrage angenommen.',
    jsonb_build_object('friend_id', v_me, 'friend_name', coalesce(v_receiver_name, 'Spieler')),
    'friend-accepted:' || p_request_id::text
  )
  on conflict (user_id, source_key) where source_key is not null do nothing;

  return v_request.sender_id;
end;
$$;

create or replace function public.decline_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'authentication required'; end if;
  update public.friend_requests
  set status = 'declined', updated_at = now(), responded_at = now()
  where id = p_request_id and receiver_id = v_me and status = 'pending';
  if not found then raise exception 'Anfrage nicht gefunden oder bereits erledigt'; end if;
  update public.player_mailbox
  set actioned_at = now(), read_at = coalesce(read_at, now())
  where user_id = v_me and source_key = 'friend-request:' || p_request_id::text;
end;
$$;

create or replace function public.cancel_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_receiver uuid;
begin
  if v_me is null then raise exception 'authentication required'; end if;
  update public.friend_requests
  set status = 'cancelled', updated_at = now(), responded_at = now()
  where id = p_request_id and sender_id = v_me and status = 'pending'
  returning receiver_id into v_receiver;
  if v_receiver is null then raise exception 'Anfrage nicht gefunden oder bereits erledigt'; end if;
  update public.player_mailbox
  set actioned_at = now(), read_at = coalesce(read_at, now())
  where user_id = v_receiver and source_key = 'friend-request:' || p_request_id::text;
end;
$$;

create or replace function public.remove_friend(p_friend_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'authentication required'; end if;
  delete from public.friendships
  where (user_id = v_me and friend_user_id = p_friend_id)
     or (user_id = p_friend_id and friend_user_id = v_me);
  if not found then raise exception 'Freundschaft nicht gefunden'; end if;
  update public.friend_requests
  set status = 'cancelled', updated_at = now(), responded_at = now()
  where status = 'accepted'
    and ((sender_id = v_me and receiver_id = p_friend_id) or (sender_id = p_friend_id and receiver_id = v_me));
end;
$$;

create or replace function public.list_friends()
returns table(user_id uuid, display_name text, avatar_key text, friends_since timestamptz)
language sql
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.avatar_key, f.created_at
  from public.friendships f
  join public.profiles p on p.id = f.friend_user_id
  where f.user_id = auth.uid()
  order by lower(p.display_name), p.id;
$$;

create or replace function public.list_friend_requests()
returns table(request_id uuid, direction text, user_id uuid, display_name text, avatar_key text, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select r.id,
         case when r.receiver_id = auth.uid() then 'incoming' else 'outgoing' end,
         p.id,
         p.display_name,
         p.avatar_key,
         r.created_at
  from public.friend_requests r
  join public.profiles p on p.id = case when r.receiver_id = auth.uid() then r.sender_id else r.receiver_id end
  where r.status = 'pending' and (r.sender_id = auth.uid() or r.receiver_id = auth.uid())
  order by r.created_at desc;
$$;

revoke execute on function public.send_friend_request(text) from public, anon;
revoke execute on function public.accept_friend_request(uuid) from public, anon;
revoke execute on function public.decline_friend_request(uuid) from public, anon;
revoke execute on function public.cancel_friend_request(uuid) from public, anon;
revoke execute on function public.remove_friend(uuid) from public, anon;
revoke execute on function public.list_friends() from public, anon;
revoke execute on function public.list_friend_requests() from public, anon;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.accept_friend_request(uuid) to authenticated;
grant execute on function public.decline_friend_request(uuid) to authenticated;
grant execute on function public.cancel_friend_request(uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.list_friends() to authenticated;
grant execute on function public.list_friend_requests() to authenticated;
