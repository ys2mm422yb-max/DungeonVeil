alter table public.profiles
  add column if not exists display_name_confirmed_at timestamptz;

update public.profiles as profile
set display_name_confirmed_at = coalesce(profile.display_name_confirmed_at, profile.created_at)
from auth.users as account
where account.id = profile.id
  and coalesce(account.raw_app_meta_data ->> 'provider', 'email') = 'email'
  and profile.display_name_confirmed_at is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_explicit_name text := nullif(left(trim(new.raw_user_meta_data ->> 'display_name'), 24), '');
  v_profile_name text;
begin
  v_profile_name := coalesce(
    v_explicit_name,
    nullif(left(trim(new.raw_user_meta_data ->> 'full_name'), 24), ''),
    nullif(left(trim(new.raw_user_meta_data ->> 'name'), 24), ''),
    'Abenteurer'
  );

  insert into public.profiles (id, display_name, display_name_confirmed_at)
  values (
    new.id,
    v_profile_name,
    case when v_explicit_name is not null then clock_timestamp() else null end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.set_ingame_display_name(p_display_name text)
returns table (
  id uuid,
  display_name text,
  display_name_confirmed_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := regexp_replace(trim(coalesce(p_display_name, '')), '[[:space:]]+', ' ', 'g');
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 24 then
    raise exception 'player name must contain 2 to 24 characters';
  end if;
  if v_name ~ '[[:cntrl:]<>]' then
    raise exception 'player name contains unsupported characters';
  end if;

  return query
  update public.profiles as profile
  set display_name = v_name,
      display_name_confirmed_at = coalesce(profile.display_name_confirmed_at, clock_timestamp()),
      updated_at = clock_timestamp()
  where profile.id = v_user_id
  returning profile.id, profile.display_name, profile.display_name_confirmed_at;

  if not found then raise exception 'player profile not found'; end if;
end;
$$;

create or replace function private.protect_profile_name_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if current_user = 'authenticated'
     and new.display_name_confirmed_at is distinct from old.display_name_confirmed_at then
    raise exception 'display name confirmation must use the profile RPC';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_name_confirmation on public.profiles;
create trigger protect_profile_name_confirmation
before update on public.profiles
for each row execute function private.protect_profile_name_confirmation();

revoke all on function public.set_ingame_display_name(text) from public, anon;
grant execute on function public.set_ingame_display_name(text) to authenticated;

select pg_notify('pgrst', 'reload schema');
