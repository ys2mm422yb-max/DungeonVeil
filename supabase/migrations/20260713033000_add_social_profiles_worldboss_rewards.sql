alter table public.profiles
  add column if not exists friend_code text,
  add column if not exists current_chapter integer not null default 1,
  add column if not exists current_rank integer not null default 1,
  add column if not exists character_key text not null default 'archer',
  add column if not exists last_active_at timestamptz not null default now();

create unique index if not exists profiles_friend_code_upper_uidx
  on public.profiles (upper(friend_code))
  where friend_code is not null;

create or replace function private.generate_friend_code()
returns text
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_code text;
begin
  loop
    v_code := 'DV-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (select 1 from public.profiles where upper(friend_code) = v_code);
  end loop;
  return v_code;
end;
$$;

update public.profiles
set friend_code = private.generate_friend_code()
where friend_code is null or btrim(friend_code) = '';

alter table public.profiles alter column friend_code set not null;

alter table public.profiles drop constraint if exists profiles_friend_code_format_check;
alter table public.profiles
  add constraint profiles_friend_code_format_check
  check (friend_code ~ '^DV-[A-Z0-9]{6}$');

alter table public.profiles drop constraint if exists profiles_progress_bounds_check;
alter table public.profiles
  add constraint profiles_progress_bounds_check
  check (current_chapter between 1 and 999 and current_rank between 1 and 9999);

create or replace function private.assign_profile_friend_code()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.friend_code is null or btrim(new.friend_code) = '' then
    new.friend_code := private.generate_friend_code();
  elsif tg_op = 'UPDATE' and old.friend_code is not null and new.friend_code is distinct from old.friend_code then
    new.friend_code := old.friend_code;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_assign_friend_code on public.profiles;
create trigger profiles_assign_friend_code
before insert or update of friend_code on public.profiles
for each row execute function private.assign_profile_friend_code();

create or replace function public.sync_profile_progress(
  p_chapter integer,
  p_rank integer,
  p_character_key text default 'archer'
)
returns table (
  id uuid,
  display_name text,
  avatar_key text,
  friend_code text,
  current_chapter integer,
  current_rank integer,
  character_key text,
  last_active_at timestamptz
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  update public.profiles p
  set current_chapter = greatest(p.current_chapter, least(999, greatest(1, coalesce(p_chapter, 1)))),
      current_rank = greatest(p.current_rank, least(9999, greatest(1, coalesce(p_rank, 1)))),
      character_key = case when p_character_key ~ '^[a-z0-9_-]{2,24}$' then p_character_key else p.character_key end,
      last_active_at = now(),
      updated_at = now()
  where p.id = auth.uid();

  return query
  select p.id, p.display_name, p.avatar_key, p.friend_code, p.current_chapter, p.current_rank, p.character_key, p.last_active_at
  from public.profiles p where p.id = auth.uid();
end;
$$;

create or replace function public.get_my_social_profile()
returns table (
  id uuid,
  display_name text,
  avatar_key text,
  friend_code text,
  current_chapter integer,
  current_rank integer,
  character_key text,
  last_active_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.avatar_key, p.friend_code, p.current_chapter, p.current_rank, p.character_key, p.last_active_at
  from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.find_social_profile(p_query text)
returns table (
  id uuid,
  display_name text,
  avatar_key text,
  friend_code text,
  current_chapter integer,
  current_rank integer,
  character_key text,
  last_active_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_query text := btrim(coalesce(p_query, ''));
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if char_length(v_query) < 2 then raise exception 'query too short'; end if;

  return query
  select p.id, p.display_name, p.avatar_key, p.friend_code, p.current_chapter, p.current_rank, p.character_key, p.last_active_at
  from public.profiles p
  where p.id <> auth.uid()
    and (upper(p.friend_code) = upper(v_query) or lower(p.display_name) = lower(v_query))
  order by case when upper(p.friend_code) = upper(v_query) then 0 else 1 end
  limit 1;
end;
$$;

create or replace function public.send_friend_request_by_query(p_query text)
returns table (
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
  v_target public.profiles%rowtype;
  v_request public.friend_requests%rowtype;
  v_sender_name text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select * into v_target
  from public.profiles p
  where p.id <> auth.uid()
    and (upper(p.friend_code) = upper(btrim(coalesce(p_query, ''))) or lower(p.display_name) = lower(btrim(coalesce(p_query, ''))))
  order by case when upper(p.friend_code) = upper(btrim(coalesce(p_query, ''))) then 0 else 1 end
  limit 1;

  if not found then raise exception 'player not found'; end if;
  if exists (
    select 1 from public.friendships f
    where (f.user_id = auth.uid() and f.friend_user_id = v_target.id)
       or (f.user_id = v_target.id and f.friend_user_id = auth.uid())
  ) then raise exception 'already friends'; end if;

  if exists (
    select 1 from public.friend_requests fr
    where fr.status = 'pending'
      and ((fr.sender_id = auth.uid() and fr.receiver_id = v_target.id)
        or (fr.sender_id = v_target.id and fr.receiver_id = auth.uid()))
  ) then raise exception 'friend request already pending'; end if;

  insert into public.friend_requests (sender_id, receiver_id, status)
  values (auth.uid(), v_target.id, 'pending')
  returning * into v_request;

  select display_name into v_sender_name from public.profiles where id = auth.uid();
  insert into public.player_mailbox (user_id, kind, title, body, payload, source_key, expires_at)
  values (
    v_target.id,
    'friend_request',
    'Neue Freundschaftsanfrage',
    coalesce(v_sender_name, 'Ein Spieler') || ' möchte dich als Freund hinzufügen.',
    jsonb_build_object('request_id', v_request.id, 'sender_id', auth.uid()),
    'friend-request:' || v_request.id::text,
    now() + interval '30 days'
  ) on conflict (user_id, source_key) where source_key is not null do nothing;

  return query select v_request.id, v_target.id, v_target.display_name, v_target.avatar_key, v_target.friend_code,
    v_target.current_chapter, v_target.current_rank, v_target.character_key;
end;
$$;

create or replace function public.list_friends_v2()
returns table (
  user_id uuid,
  display_name text,
  avatar_key text,
  friend_code text,
  current_chapter integer,
  current_rank integer,
  character_key text,
  friends_since timestamptz,
  last_active_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with pairs as (
    select f.friend_user_id as friend_id, f.created_at from public.friendships f where f.user_id = auth.uid()
    union all
    select f.user_id as friend_id, f.created_at from public.friendships f where f.friend_user_id = auth.uid()
  ), dedup as (
    select friend_id, min(created_at) as created_at from pairs group by friend_id
  )
  select p.id, p.display_name, p.avatar_key, p.friend_code, p.current_chapter, p.current_rank,
    p.character_key, d.created_at, p.last_active_at
  from dedup d join public.profiles p on p.id = d.friend_id
  order by lower(p.display_name);
$$;

create or replace function public.get_social_profile_card(p_user_id uuid)
returns table (
  id uuid,
  display_name text,
  avatar_key text,
  friend_code text,
  current_chapter integer,
  current_rank integer,
  character_key text,
  last_active_at timestamptz,
  guild_name text,
  guild_tag text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_user_id is null then raise exception 'profile required'; end if;

  if p_user_id <> auth.uid()
    and not exists (
      select 1 from public.friendships f
      where (f.user_id = auth.uid() and f.friend_user_id = p_user_id)
         or (f.user_id = p_user_id and f.friend_user_id = auth.uid())
    )
    and not exists (
      select 1
      from public.guild_members mine
      join public.guild_members theirs on theirs.guild_id = mine.guild_id
      where mine.user_id = auth.uid() and theirs.user_id = p_user_id
    )
  then raise exception 'profile not available'; end if;

  return query
  select p.id, p.display_name, p.avatar_key, p.friend_code, p.current_chapter, p.current_rank,
    p.character_key, p.last_active_at, g.name, g.tag
  from public.profiles p
  left join public.guild_members gm on gm.user_id = p.id
  left join public.guilds g on g.id = gm.guild_id
  where p.id = p_user_id
  limit 1;
end;
$$;

create or replace function public.get_world_boss_social_dashboard(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if not exists (select 1 from public.world_boss_events where id = p_event_id) then raise exception 'event not found'; end if;

  with ranked as (
    select c.user_id, c.damage, c.hits,
      row_number() over (order by c.damage desc, c.updated_at asc) as rank
    from public.world_boss_contributions c where c.event_id = p_event_id
  ), enriched as (
    select r.rank, r.user_id, coalesce(p.display_name, 'Abenteurer') as display_name,
      p.avatar_key, p.friend_code, p.current_chapter, p.current_rank, r.damage, r.hits
    from ranked r left join public.profiles p on p.id = r.user_id
  ), friend_ids as (
    select v_uid as user_id
    union select f.friend_user_id from public.friendships f where f.user_id = v_uid
    union select f.user_id from public.friendships f where f.friend_user_id = v_uid
  ), my_guild as (
    select gm.guild_id from public.guild_members gm where gm.user_id = v_uid limit 1
  ), guild_totals as (
    select gm.guild_id, sum(c.damage)::bigint as damage, sum(c.hits)::bigint as hits
    from public.guild_members gm
    join public.world_boss_contributions c on c.user_id = gm.user_id and c.event_id = p_event_id
    group by gm.guild_id
  ), guild_ranked as (
    select gt.guild_id, gt.damage, gt.hits,
      row_number() over (order by gt.damage desc, gt.guild_id) as rank
    from guild_totals gt
  ), guild_enriched as (
    select gr.rank, gr.guild_id, g.name, g.tag, gr.damage, gr.hits
    from guild_ranked gr join public.guilds g on g.id = gr.guild_id
  )
  select jsonb_build_object(
    'personal', coalesce((select jsonb_build_object('rank', e.rank, 'damage', e.damage, 'hits', e.hits) from enriched e where e.user_id = v_uid), jsonb_build_object('rank', null, 'damage', 0, 'hits', 0)),
    'global', coalesce((select jsonb_agg(to_jsonb(x) order by x.rank) from (select * from enriched order by rank limit 10) x), '[]'::jsonb),
    'friends', coalesce((select jsonb_agg(to_jsonb(x) order by x.damage desc) from (select e.* from enriched e join friend_ids f on f.user_id = e.user_id order by e.damage desc limit 20) x), '[]'::jsonb),
    'guilds', coalesce((select jsonb_agg(to_jsonb(x) order by x.rank) from (select * from guild_enriched order by rank limit 10) x), '[]'::jsonb),
    'myGuild', coalesce((
      select jsonb_build_object(
        'guild_id', ge.guild_id, 'name', ge.name, 'tag', ge.tag,
        'rank', ge.rank, 'damage', ge.damage, 'hits', ge.hits,
        'members', coalesce((
          select jsonb_agg(to_jsonb(m) order by m.damage desc)
          from (
            select e.user_id, e.display_name, e.avatar_key, e.friend_code, e.current_chapter, e.current_rank, e.damage, e.hits
            from enriched e join public.guild_members gm on gm.user_id = e.user_id
            where gm.guild_id = ge.guild_id
            order by e.damage desc limit 30
          ) m
        ), '[]'::jsonb)
      ) from guild_enriched ge join my_guild mg on mg.guild_id = ge.guild_id
    ), null)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.prepare_my_world_boss_notice(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.world_boss_events%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_event from public.world_boss_events where id = p_event_id;
  if not found or v_event.status <> 'active' then return false; end if;

  insert into public.player_mailbox (user_id, kind, title, body, payload, source_key, expires_at)
  values (
    auth.uid(), 'system', 'Der Wochenboss ist erwacht',
    v_event.name || ' ist aktiv. Kämpfe mit Freunden und deiner Gilde um gemeinsame Belohnungen.',
    jsonb_build_object('event_id', v_event.id, 'kind', 'world_boss_started'),
    'world-boss-start:' || v_event.id::text,
    v_event.ends_at + interval '7 days'
  ) on conflict (user_id, source_key) where source_key is not null do nothing;
  return true;
end;
$$;

create or replace function public.prepare_my_world_boss_reward(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.world_boss_events%rowtype;
  v_damage bigint := 0;
  v_hits bigint := 0;
  v_guild_damage bigint := 0;
  v_tier integer := 1;
  v_xp integer;
  v_dust integer;
  v_gold integer;
  v_guild_bonus boolean := false;
  v_payload jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_event from public.world_boss_events where id = p_event_id;
  if not found then raise exception 'event not found'; end if;
  if v_event.status not in ('defeated', 'expired') and v_event.ends_at > now() then return null; end if;

  select coalesce(c.damage, 0), coalesce(c.hits, 0) into v_damage, v_hits
  from public.world_boss_contributions c where c.event_id = p_event_id and c.user_id = auth.uid();
  if v_damage <= 0 then return null; end if;

  if v_damage >= greatest(15000, (v_event.max_hp * 0.03)::bigint) then v_tier := 4;
  elsif v_damage >= greatest(5000, (v_event.max_hp * 0.01)::bigint) then v_tier := 3;
  elsif v_damage >= greatest(1000, (v_event.max_hp * 0.002)::bigint) then v_tier := 2;
  end if;

  select coalesce(sum(c.damage), 0) into v_guild_damage
  from public.guild_members mine
  join public.guild_members members on members.guild_id = mine.guild_id
  join public.world_boss_contributions c on c.user_id = members.user_id and c.event_id = p_event_id
  where mine.user_id = auth.uid();

  v_guild_bonus := v_guild_damage >= greatest(25000, (v_event.max_hp * 0.05)::bigint);
  v_xp := 60 + v_tier * 35 + case when v_event.status = 'defeated' then 45 else 0 end;
  v_dust := 18 + v_tier * 12 + case when v_event.status = 'defeated' then 15 else 0 end + case when v_guild_bonus then 25 else 0 end;
  v_gold := 120 + v_tier * 110 + case when v_event.status = 'defeated' then 180 else 0 end + case when v_guild_bonus then 250 else 0 end;

  v_payload := jsonb_build_object(
    'event_id', p_event_id, 'event_name', v_event.name, 'tier', v_tier,
    'xp', v_xp, 'dust', v_dust, 'gold', v_gold,
    'personal_damage', v_damage, 'hits', v_hits, 'guild_damage', v_guild_damage,
    'guild_bonus', v_guild_bonus, 'boss_defeated', v_event.status = 'defeated'
  );

  insert into public.world_boss_rewards (event_id, user_id, reward_payload)
  values (p_event_id, auth.uid(), v_payload)
  on conflict (event_id, user_id) do nothing;

  select reward_payload into v_payload
  from public.world_boss_rewards where event_id = p_event_id and user_id = auth.uid();

  insert into public.player_mailbox (user_id, kind, title, body, payload, source_key, expires_at)
  values (
    auth.uid(), 'reward', 'Wochenboss-Belohnung bereit',
    'Dein Einsatz gegen ' || v_event.name || ' wurde gewertet. Öffne diese Nachricht, um die Belohnung abzuholen.',
    v_payload,
    'world-boss-reward:' || p_event_id::text,
    now() + interval '90 days'
  ) on conflict (user_id, source_key) where source_key is not null do nothing;

  return v_payload;
end;
$$;

create or replace function public.claim_world_boss_reward(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select reward_payload into v_payload from public.world_boss_rewards
  where event_id = p_event_id and user_id = auth.uid();
  if v_payload is null then v_payload := public.prepare_my_world_boss_reward(p_event_id); end if;
  if v_payload is null then raise exception 'reward not available'; end if;

  update public.world_boss_rewards set claimed_at = coalesce(claimed_at, now())
  where event_id = p_event_id and user_id = auth.uid();
  update public.player_mailbox set actioned_at = coalesce(actioned_at, now()), read_at = coalesce(read_at, now())
  where user_id = auth.uid() and source_key = 'world-boss-reward:' || p_event_id::text;
  return v_payload;
end;
$$;

revoke all on function public.sync_profile_progress(integer, integer, text) from public, anon;
revoke all on function public.get_my_social_profile() from public, anon;
revoke all on function public.find_social_profile(text) from public, anon;
revoke all on function public.send_friend_request_by_query(text) from public, anon;
revoke all on function public.list_friends_v2() from public, anon;
revoke all on function public.get_social_profile_card(uuid) from public, anon;
revoke all on function public.get_world_boss_social_dashboard(uuid) from public, anon;
revoke all on function public.prepare_my_world_boss_notice(uuid) from public, anon;
revoke all on function public.prepare_my_world_boss_reward(uuid) from public, anon;
revoke all on function public.claim_world_boss_reward(uuid) from public, anon;

grant execute on function public.sync_profile_progress(integer, integer, text) to authenticated;
grant execute on function public.get_my_social_profile() to authenticated;
grant execute on function public.find_social_profile(text) to authenticated;
grant execute on function public.send_friend_request_by_query(text) to authenticated;
grant execute on function public.list_friends_v2() to authenticated;
grant execute on function public.get_social_profile_card(uuid) to authenticated;
grant execute on function public.get_world_boss_social_dashboard(uuid) to authenticated;
grant execute on function public.prepare_my_world_boss_notice(uuid) to authenticated;
grant execute on function public.prepare_my_world_boss_reward(uuid) to authenticated;
grant execute on function public.claim_world_boss_reward(uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');
