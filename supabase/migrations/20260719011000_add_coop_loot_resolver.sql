create or replace function private.resolve_coop_loot_drop(p_drop_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_drop public.coop_loot_drops%rowtype;
  v_now timestamptz := clock_timestamp();
  v_member_count integer := 0;
  v_choice_count integer := 0;
  v_claim_count integer := 0;
  v_host_user_id uuid;
  v_guest_user_id uuid;
  v_host_roll integer;
  v_guest_roll integer;
  v_winner uuid;
  v_resolution text;
begin
  select drop_row.* into v_drop
  from public.coop_loot_drops drop_row
  where drop_row.id = p_drop_id
  for update;

  if v_drop.id is null or v_drop.status = 'resolved' then return; end if;

  select count(*) into v_member_count
  from public.coop_lobby_members member
  where member.lobby_id = v_drop.lobby_id and member.left_at is null;

  if v_member_count < 1 then return; end if;

  if v_now >= v_drop.deadline_at then
    insert into public.coop_loot_choices (drop_id, user_id, choice, submitted_at)
    select v_drop.id, member.user_id, 'pass', v_now
    from public.coop_lobby_members member
    where member.lobby_id = v_drop.lobby_id and member.left_at is null
    on conflict (drop_id, user_id) do nothing;
  end if;

  select count(*) into v_choice_count
  from public.coop_loot_choices choice_row
  where choice_row.drop_id = v_drop.id;

  if v_choice_count < v_member_count then return; end if;

  select count(*) into v_claim_count
  from public.coop_loot_choices choice_row
  where choice_row.drop_id = v_drop.id and choice_row.choice = 'claim';

  if v_claim_count = 0 then
    v_resolution := case when v_now >= v_drop.deadline_at then 'timeout' else 'all_pass' end;
  elsif v_claim_count = 1 then
    v_resolution := 'single_claim';
    select choice_row.user_id into v_winner
    from public.coop_loot_choices choice_row
    where choice_row.drop_id = v_drop.id and choice_row.choice = 'claim'
    limit 1;
  else
    v_resolution := 'contested';
    select member.user_id into v_host_user_id
    from public.coop_lobby_members member
    where member.lobby_id = v_drop.lobby_id and member.role = 'host' and member.left_at is null
    limit 1;
    select member.user_id into v_guest_user_id
    from public.coop_lobby_members member
    where member.lobby_id = v_drop.lobby_id and member.role = 'guest' and member.left_at is null
    limit 1;

    v_host_roll := 1 + floor(random() * 100)::integer;
    v_guest_roll := 1 + floor(random() * 100)::integer;
    while v_host_roll = v_guest_roll loop
      v_guest_roll := 1 + floor(random() * 100)::integer;
    end loop;

    update public.coop_loot_choices
    set roll = case
      when user_id = v_host_user_id then v_host_roll
      when user_id = v_guest_user_id then v_guest_roll
      else roll
    end
    where drop_id = v_drop.id and choice = 'claim';

    v_winner := case when v_host_roll > v_guest_roll then v_host_user_id else v_guest_user_id end;
  end if;

  update public.coop_loot_drops
  set status = 'resolved',
      resolution = v_resolution,
      winner_user_id = v_winner,
      resolved_at = v_now
  where id = v_drop.id;
end;
$$;

revoke all on function private.resolve_coop_loot_drop(uuid) from public, anon, authenticated;
