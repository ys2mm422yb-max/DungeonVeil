create or replace function public.queue_guild_invite_mail()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild public.guilds%rowtype;
begin
  if new.status <> 'pending' then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if old.status = 'pending' and old.expires_at = new.expires_at then
      return new;
    end if;
  end if;

  select * into v_guild from public.guilds where id = new.guild_id;
  if not found then
    return new;
  end if;

  insert into public.player_mailbox (user_id, kind, title, body, payload, source_key, expires_at)
  values (
    new.invited_user_id,
    'guild_invite',
    'Gildeneinladung',
    '[' || v_guild.tag || '] ' || v_guild.name || ' lädt dich in die Gilde ein.',
    jsonb_build_object('invite_id', new.id, 'guild_id', v_guild.id, 'guild_name', v_guild.name, 'guild_tag', v_guild.tag),
    'guild-invite:' || new.id::text,
    new.expires_at
  )
  on conflict (user_id, source_key) where source_key is not null
  do update set
    body = excluded.body,
    payload = excluded.payload,
    expires_at = excluded.expires_at,
    read_at = null,
    actioned_at = null,
    created_at = now();
  return new;
end;
$$;
