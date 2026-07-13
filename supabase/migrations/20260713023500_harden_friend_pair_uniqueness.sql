create unique index if not exists friend_requests_pair_uidx
on public.friend_requests (least(sender_id, receiver_id), greatest(sender_id, receiver_id));

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

  select * into v_request
  from public.friend_requests
  where (sender_id = v_me and receiver_id = v_target.id)
     or (sender_id = v_target.id and receiver_id = v_me)
  for update;

  if found and v_request.status = 'pending' then
    if v_request.sender_id = v_me then raise exception 'Anfrage wurde bereits gesendet'; end if;
    raise exception 'Diese Person hat dir bereits eine Anfrage geschickt';
  end if;

  if found then
    update public.friend_requests
    set sender_id = v_me,
        receiver_id = v_target.id,
        status = 'pending',
        created_at = now(),
        updated_at = now(),
        responded_at = null
    where id = v_request.id
    returning * into v_request;
  else
    insert into public.friend_requests(sender_id, receiver_id, status, created_at, updated_at, responded_at)
    values (v_me, v_target.id, 'pending', now(), now(), null)
    on conflict do nothing
    returning * into v_request;

    if v_request.id is null then
      select * into v_request
      from public.friend_requests
      where (sender_id = v_me and receiver_id = v_target.id)
         or (sender_id = v_target.id and receiver_id = v_me)
      for update;
      if v_request.status = 'pending' and v_request.sender_id = v_me then raise exception 'Anfrage wurde bereits gesendet'; end if;
      if v_request.status = 'pending' then raise exception 'Diese Person hat dir bereits eine Anfrage geschickt'; end if;
      update public.friend_requests
      set sender_id = v_me,
          receiver_id = v_target.id,
          status = 'pending',
          created_at = now(),
          updated_at = now(),
          responded_at = null
      where id = v_request.id
      returning * into v_request;
    end if;
  end if;

  select display_name into v_sender_name from public.profiles where id = v_me;

  update public.player_mailbox
  set actioned_at = coalesce(actioned_at, now()), read_at = coalesce(read_at, now())
  where source_key = 'friend-request:' || v_request.id::text;

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
