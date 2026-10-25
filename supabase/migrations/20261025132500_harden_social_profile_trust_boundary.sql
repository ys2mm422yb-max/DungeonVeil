-- Issue #460: public progression and equipment must not be client-authored.
--
-- Historical values in these columns came exclusively from client-controlled
-- inputs. There is no trustworthy way to distinguish legitimate values from
-- forged values, so the safe forward reconciliation is a neutral projection.
-- Trusted server producers may populate these columns in a later migration;
-- browser callers cannot do so after this migration.

revoke insert, update on table public.profiles from authenticated;
grant update (display_name, avatar_key) on table public.profiles to authenticated;

update public.profiles
set current_chapter = 1,
    current_rank = 1,
    public_stats = jsonb_build_object(
      'highestChapter', 1,
      'highestRoom', 1,
      'roomsCleared', 0,
      'enemiesDefeated', 0,
      'bossesDefeated', 0,
      'questsCompleted', 0,
      'playTimeMs', 0,
      'totalDamage', 0,
      'itemsFound', 0,
      'equippedItems', '[]'::jsonb
    ),
    updated_at = now();

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
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  -- p_chapter and p_rank remain in the signature for client compatibility,
  -- but are intentionally not trusted or persisted.
  update public.profiles as profile
  set character_key = case
        when p_character_key ~ '^[a-z0-9_-]{2,24}$' then p_character_key
        else profile.character_key
      end,
      last_active_at = now(),
      updated_at = now()
  where profile.id = auth.uid();

  return query
  select profile.id, profile.display_name, profile.avatar_key,
    profile.friend_code, profile.current_chapter, profile.current_rank,
    profile.character_key, profile.last_active_at
  from public.profiles as profile
  where profile.id = auth.uid();
end;
$$;

create or replace function public.sync_public_profile_stats(p_stats jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  trusted_stats jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  -- p_stats remains in the signature for client compatibility. The server
  -- returns only its stored projection and never copies browser JSON into it.
  select profile.public_stats
  into trusted_stats
  from public.profiles as profile
  where profile.id = auth.uid();

  return coalesce(trusted_stats, '{}'::jsonb);
end;
$$;

revoke all on function public.sync_profile_progress(integer, integer, text)
  from public, anon;
revoke all on function public.sync_public_profile_stats(jsonb)
  from public, anon;
grant execute on function public.sync_profile_progress(integer, integer, text)
  to authenticated;
grant execute on function public.sync_public_profile_stats(jsonb)
  to authenticated;

comment on function public.sync_profile_progress(integer, integer, text) is
  'Compatibility RPC: character selection and presence only; client chapter/rank inputs are ignored.';
comment on function public.sync_public_profile_stats(jsonb) is
  'Compatibility RPC: returns the trusted stored social projection; client JSON is ignored.';
comment on column public.profiles.public_stats is
  'Server-owned social projection. Browser roles have no INSERT/UPDATE authority.';
