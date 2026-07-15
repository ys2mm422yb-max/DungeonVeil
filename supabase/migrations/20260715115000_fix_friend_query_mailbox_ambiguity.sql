create or replace function public.send_friend_request_by_query(p_query text)
returns table(
  request_id uuid,
  user_id uuid,
  display_name text,
  avatar_key text,
  friend_code text,
  current_chapter integer,
  current_rank integer,
  character_key text
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_me uuid := auth.uid();
  v_query text := btrim(coalesce(p_query, ''));
  v_target public.profiles%rowtype;
  v_request public.friend_requests%rowtype;
  v_sender_name text;
  v_mail_source text;
begin
  if v_me is null then
    raise exception 'authentication required';
  end if;
  if char_length(v_query) < 2 then
    raise exception 'query too short';
  end if;

  select p.* into v_target
  from public.profiles as p
  where upper(p.friend_code) = upper(v_query)
     or lower(p.display_name) = lower(v_query)
  order by
    case when upper(p.friend_code) = upper(v_query) then 0 else 1 end,
    p.created_at asc
  limit 1;

  if not found then
    raise exception 'player not found';
  end if;
  if v_target.id = v_me then
    raise exception 'cannot add yourself';
  end if;
  if exists (
    select 1
    from public.friendships as f
    where (f.user_id = v_me and f.friend_user_id = v_target.id)
       or (f.user_id = v_target.id and f.friend_user_id = v_me)
  ) then
    raise exception 'already friends';
  end if;

  select fr.* into v_request
  from public.friend_requests as fr
  where fr.status = 'pending'
    and (
      (fr.sender_id = v_me and fr.receiver_id = v_target.id)
      or (fr.sender_id = v_target.id and fr.receiver_id = v_me)
    )
  order by fr.created_at desc
  limit 1
  for update;

  if found then
    if v_request.sender_id = v_me then
      raise exception 'friend request already pending';
    end if;
    raise exception 'incoming friend request already pending';
  end if;

  update public.friend_requests as fr
  set status = 'pending',
      created_at = now(),
      updated_at = now(),
      responded_at = null
  where fr.sender_id = v_me
    and fr.receiver_id = v_target.id
  returning fr.* into v_request;

  if not found then
    insert into public.friend_requests (sender_id, receiver_id, status, created_at, updated_at, responded_at)
    values (v_me, v_target.id, 'pending', now(), now(), null)
    on conflict (sender_id, receiver_id) do update
      set status = 'pending',
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          responded_at = null
    returning * into v_request;
  end if;

  select p.display_name into v_sender_name
  from public.profiles as p
  where p.id = v_me;

  v_mail_source := 'friend-request:' || v_request.id::text;

  update public.player_mailbox as m
  set read_at = null,
      actioned_at = null,
      created_at = now(),
      expires_at = now() + interval '30 days',
      title = 'Neue Freundschaftsanfrage',
      body = coalesce(v_sender_name, 'Ein Spieler') || ' möchte dich als Freund hinzufügen.',
      payload = jsonb_build_object(
        'request_id', v_request.id,
        'sender_id', v_me,
        'sender_name', coalesce(v_sender_name, 'Spieler')
      )
  where m.user_id = v_target.id
    and m.source_key = v_mail_source;

  if not found then
    insert into public.player_mailbox (user_id, kind, title, body, payload, source_key, expires_at)
    values (
      v_target.id,
      'friend_request',
      'Neue Freundschaftsanfrage',
      coalesce(v_sender_name, 'Ein Spieler') || ' möchte dich als Freund hinzufügen.',
      jsonb_build_object(
        'request_id', v_request.id,
        'sender_id', v_me,
        'sender_name', coalesce(v_sender_name, 'Spieler')
      ),
      v_mail_source,
      now() + interval '30 days'
    )
    on conflict do nothing;
  end if;

  return query
  select
    v_request.id,
    v_target.id,
    v_target.display_name,
    v_target.avatar_key,
    v_target.friend_code,
    v_target.current_chapter,
    v_target.current_rank,
    v_target.character_key;
end;
$$;

revoke execute on function public.send_friend_request_by_query(text) from public, anon;
grant execute on function public.send_friend_request_by_query(text) to authenticated;
