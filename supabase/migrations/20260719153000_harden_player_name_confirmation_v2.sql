create or replace function public.set_my_player_name(p_display_name text, p_change_id uuid)
returns table (
  change_id uuid,
  user_id uuid,
  display_name text,
  confirmed boolean,
  initial_confirmation boolean,
  completed_changes integer,
  next_change_cost integer,
  charged_gold integer,
  confirmed_at timestamptz
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_existing public.player_name_changes%rowtype;
  v_name text;
  v_previous_name text;
  v_initial boolean;
  v_charge integer;
  v_after integer;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_change_id is null then raise exception 'change id required'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 6201));

  select * into v_existing
  from public.player_name_changes
  where id = p_change_id and user_id = v_user_id;

  if v_existing.id is not null then
    select * into v_profile from public.profiles where id = v_user_id;
    return query
    select v_existing.id,
           v_user_id,
           v_existing.next_name,
           true,
           v_existing.initial_confirmation,
           v_existing.completed_changes_after,
           case when v_existing.completed_changes_after = 0 then 0 else 5000 end,
           v_existing.charged_gold,
           v_profile.player_name_confirmed_at;
    return;
  end if;

  v_name := private.validate_player_name(p_display_name);
  select * into v_profile
  from public.profiles
  where id = v_user_id
  for update;

  if v_profile.id is null then raise exception 'profile not found'; end if;

  v_previous_name := coalesce(v_profile.display_name, '');
  v_initial := v_profile.player_name_confirmed_at is null;
  if not v_initial and lower(btrim(v_previous_name)) = lower(v_name) then
    raise exception 'choose a different player name';
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.id <> v_user_id
      and p.player_name_confirmed_at is not null
      and lower(btrim(p.display_name)) = lower(v_name)
  ) then
    raise exception 'player name is already taken';
  end if;

  if v_initial then
    v_charge := 0;
    v_after := v_profile.player_name_change_count;
  else
    v_charge := case when v_profile.player_name_change_count = 0 then 0 else 5000 end;
    v_after := v_profile.player_name_change_count + 1;
  end if;

  perform set_config('dungeon_veil.allow_player_name_update', 'on', true);
  begin
    update public.profiles p
    set display_name = v_name,
        player_name_confirmed_at = coalesce(p.player_name_confirmed_at, clock_timestamp()),
        player_name_change_count = v_after,
        updated_at = clock_timestamp()
    where p.id = v_user_id
    returning * into v_profile;
  exception when unique_violation then
    raise exception 'player name is already taken';
  end;

  insert into public.player_name_changes (
    id, user_id, previous_name, next_name, charged_gold,
    completed_changes_after, initial_confirmation, created_at
  ) values (
    p_change_id, v_user_id, v_previous_name, v_name, v_charge,
    v_after, v_initial, clock_timestamp()
  );

  return query
  select p_change_id,
         v_user_id,
         v_name,
         true,
         v_initial,
         v_after,
         case when v_after = 0 then 0 else 5000 end,
         v_charge,
         v_profile.player_name_confirmed_at;
end;
$$;

revoke all on function public.set_my_player_name(text, uuid) from public, anon;
grant execute on function public.set_my_player_name(text, uuid) to authenticated;

comment on function public.set_my_player_name(text, uuid) is
  'Confirms or changes the unique player-selected in-game name idempotently. Google/profile metadata remains unconfirmed until this RPC is called.';

notify pgrst, 'reload schema';
