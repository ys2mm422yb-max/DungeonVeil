create or replace function private.queue_friend_acceptance_notice()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_friend_name text;
begin
  if new.status = 'accepted' and old.status is distinct from new.status then
    select display_name into v_friend_name from public.profiles where id = new.receiver_id;
    insert into public.player_mailbox (user_id, kind, title, body, payload, source_key, expires_at)
    values (
      new.sender_id,
      'system',
      'Freundschaft bestätigt',
      coalesce(v_friend_name, 'Ein Abenteurer') || ' hat deine Freundschaftsanfrage angenommen.',
      jsonb_build_object('kind', 'friend_accepted', 'friend_id', new.receiver_id, 'request_id', new.id),
      'friend-accepted:' || new.id::text,
      now() + interval '30 days'
    ) on conflict (user_id, source_key) where source_key is not null do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists friend_requests_acceptance_mail on public.friend_requests;
create trigger friend_requests_acceptance_mail
after update of status on public.friend_requests
for each row execute function private.queue_friend_acceptance_notice();

create or replace function private.queue_guild_acceptance_notice()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_player_name text;
  v_guild_name text;
  v_guild_tag text;
begin
  if new.status = 'accepted' and old.status is distinct from new.status then
    select display_name into v_player_name from public.profiles where id = new.invited_user_id;
    select name, tag into v_guild_name, v_guild_tag from public.guilds where id = new.guild_id;
    insert into public.player_mailbox (user_id, kind, title, body, payload, source_key, expires_at)
    values (
      new.invited_by,
      'system',
      'Gildeneinladung angenommen',
      coalesce(v_player_name, 'Ein Abenteurer') || ' ist [' || coalesce(v_guild_tag, '') || '] ' || coalesce(v_guild_name, 'deiner Gilde') || ' beigetreten.',
      jsonb_build_object('kind', 'guild_invite_accepted', 'guild_id', new.guild_id, 'member_id', new.invited_user_id, 'invite_id', new.id),
      'guild-invite-accepted:' || new.id::text,
      now() + interval '30 days'
    ) on conflict (user_id, source_key) where source_key is not null do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists guild_invites_acceptance_mail on public.guild_invites;
create trigger guild_invites_acceptance_mail
after update of status on public.guild_invites
for each row execute function private.queue_guild_acceptance_notice();

select pg_notify('pgrst', 'reload schema');
