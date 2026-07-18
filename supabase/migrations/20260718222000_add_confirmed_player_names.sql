alter table public.profiles
  add column if not exists player_name_confirmed_at timestamptz,
  add column if not exists player_name_change_count integer not null default 0;

alter table public.profiles drop constraint if exists profiles_player_name_change_count_check;
alter table public.profiles
  add constraint profiles_player_name_change_count_check
  check (player_name_change_count between 0 and 1000);

create unique index if not exists profiles_confirmed_display_name_lower_uidx
  on public.profiles (lower(btrim(display_name)))
  where player_name_confirmed_at is not null;

create table if not exists public.player_name_changes (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_name text not null,
  next_name text not null,
  charged_gold integer not null default 0 check (charged_gold in (0, 5000)),
  completed_changes_after integer not null check (completed_changes_after between 0 and 1000),
  initial_confirmation boolean not null default false,
  created_at timestamptz not null default clock_timestamp(),
  unique (user_id, id)
);

create index if not exists player_name_changes_user_created_idx
  on public.player_name_changes (user_id, created_at desc);

alter table public.player_name_changes enable row level security;
revoke all on table public.player_name_changes from anon, authenticated;
grant select on table public.player_name_changes to authenticated;

drop policy if exists player_name_changes_read_own on public.player_name_changes;
create policy player_name_changes_read_own
  on public.player_name_changes
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function private.guard_confirmed_player_name()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
     and new.display_name is distinct from old.display_name
     and coalesce(current_setting('dungeon_veil.allow_player_name_update', true), '') <> 'on' then
    new.display_name := old.display_name;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_confirmed_player_name on public.profiles;
create trigger profiles_guard_confirmed_player_name
before update of display_name on public.profiles
for each row execute function private.guard_confirmed_player_name();

create or replace function private.normalized_player_name(p_name text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select btrim(regexp_replace(coalesce(p_name, ''), '[[:space:]]+', ' ', 'g'));
$$;

create or replace function private.validate_player_name(p_name text)
returns text
language plpgsql
immutable
set search_path = pg_catalog, private
as $$
declare
  v_name text := private.normalized_player_name(p_name);
begin
  if char_length(v_name) < 3 or char_length(v_name) > 20 then
    raise exception 'player name must contain 3 to 20 characters';
  end if;
  if v_name !~ '^[A-Za-z0-9ÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß _-]*[A-Za-z0-9ÄÖÜäöüß]$' then
    raise exception 'player name contains invalid characters';
  end if;
  if lower(v_name) in ('admin', 'administrator', 'moderator', 'mod', 'support', 'system', 'dungeon veil', 'dungeonveil', 'openai') then
    raise exception 'player name is reserved';
  end if;
  return v_name;
end;
$$;

create or replace function public.get_my_player_name_state()
returns table (
  user_id uuid,
  display_name text,
  confirmed boolean,
  completed_changes integer,
  next_change_cost integer,
  confirmed_at timestamptz
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  return query
  select p.id,
         p.display_name,
         p.player_name_confirmed_at is not null,
         p.player_name_change_count,
         case
           when p.player_name_confirmed_at is null or p.player_name_change_count = 0 then 0
           else 5000
         end,
         p.player_name_confirmed_at
  from public.profiles p
  where p.id = auth.uid();
end;
$$;

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

  v_initial := v_profile.player_name_confirmed_at is null;
  if not v_initial and lower(btrim(v_profile.display_name)) = lower(v_name) then
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
    p_change_id, v_user_id, coalesce(v_profile.display_name, ''), v_name, v_charge,
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

create or replace function public.list_my_player_name_changes(p_limit integer default 20)
returns table (
  change_id uuid,
  display_name text,
  charged_gold integer,
  completed_changes integer,
  initial_confirmation boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  return query
  select c.id,
         c.next_name,
         c.charged_gold,
         c.completed_changes_after,
         c.initial_confirmation,
         c.created_at
  from public.player_name_changes c
  where c.user_id = auth.uid()
  order by c.created_at desc
  limit least(50, greatest(1, coalesce(p_limit, 20)));
end;
$$;

revoke all on function public.get_my_player_name_state() from public, anon;
revoke all on function public.set_my_player_name(text, uuid) from public, anon;
revoke all on function public.list_my_player_name_changes(integer) from public, anon;

grant execute on function public.get_my_player_name_state() to authenticated;
grant execute on function public.set_my_player_name(text, uuid) to authenticated;
grant execute on function public.list_my_player_name_changes(integer) to authenticated;

notify pgrst, 'reload schema';
