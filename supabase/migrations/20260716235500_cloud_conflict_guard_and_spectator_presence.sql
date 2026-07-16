create or replace function public.upsert_guarded_game_save(
  p_payload jsonb,
  p_save_version integer default 1,
  p_progress_weight bigint default 0,
  p_activity_at bigint default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_payload jsonb;
  current_weight bigint := 0;
  current_activity bigint := 0;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception 'invalid save payload'; end if;
  if octet_length(p_payload::text) > 1500000 then raise exception 'save payload too large'; end if;

  select payload into current_payload
  from public.game_saves
  where user_id = auth.uid()
  for update;

  if found then
    current_weight := greatest(0, coalesce((current_payload->>'progressWeight')::bigint, 0));
    current_activity := greatest(0, coalesce((current_payload->>'activityAt')::bigint, 0));
    if current_activity > greatest(0, p_activity_at)
      or (current_activity = greatest(0, p_activity_at) and current_weight > greatest(0, p_progress_weight))
    then
      return jsonb_build_object('accepted', false, 'payload', current_payload);
    end if;
  end if;

  insert into public.game_saves(user_id, save_version, payload, updated_at)
  values (auth.uid(), greatest(1, p_save_version), p_payload, now())
  on conflict (user_id) do update
    set save_version = excluded.save_version,
        payload = excluded.payload,
        updated_at = now();

  return jsonb_build_object('accepted', true, 'payload', p_payload);
end;
$$;

create table if not exists public.spectator_viewers (
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  viewer_user_id uuid not null references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (host_user_id, viewer_user_id),
  constraint spectator_viewer_not_self check (host_user_id <> viewer_user_id)
);

create index if not exists spectator_viewers_host_seen_idx
  on public.spectator_viewers(host_user_id, last_seen_at desc);

alter table public.spectator_viewers enable row level security;
revoke all on table public.spectator_viewers from public, anon, authenticated;

create or replace function public.heartbeat_spectator_viewer(p_host_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_host_user_id is null or p_host_user_id = auth.uid() then raise exception 'other player required'; end if;
  if not exists (
    select 1 from public.profiles p where p.id = p_host_user_id and p.spectating_allowed
  ) then raise exception 'spectating unavailable'; end if;
  if not exists (
    select 1 from public.friendships f
    where (f.user_id = auth.uid() and f.friend_user_id = p_host_user_id)
       or (f.user_id = p_host_user_id and f.friend_user_id = auth.uid())
  ) and not exists (
    select 1 from public.guild_members mine
    join public.guild_members theirs on theirs.guild_id = mine.guild_id
    where mine.user_id = auth.uid() and theirs.user_id = p_host_user_id
  ) then raise exception 'friendship or shared guild required'; end if;

  delete from public.spectator_viewers
  where host_user_id = p_host_user_id and last_seen_at < now() - interval '12 seconds';

  insert into public.spectator_viewers(host_user_id, viewer_user_id, last_seen_at)
  values (p_host_user_id, auth.uid(), now())
  on conflict (host_user_id, viewer_user_id) do update set last_seen_at = now();
  return true;
end;
$$;

create or replace function public.leave_spectator_viewer(p_host_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  delete from public.spectator_viewers
  where host_user_id = p_host_user_id and viewer_user_id = auth.uid();
  return true;
end;
$$;

create or replace function public.get_my_spectator_viewer_count()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_count integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  delete from public.spectator_viewers
  where host_user_id = auth.uid() and last_seen_at < now() - interval '12 seconds';
  select count(*)::integer into viewer_count
  from public.spectator_viewers
  where host_user_id = auth.uid() and last_seen_at >= now() - interval '12 seconds';
  return coalesce(viewer_count, 0);
end;
$$;

revoke all on function public.upsert_guarded_game_save(jsonb, integer, bigint, bigint) from public, anon;
revoke all on function public.heartbeat_spectator_viewer(uuid) from public, anon;
revoke all on function public.leave_spectator_viewer(uuid) from public, anon;
revoke all on function public.get_my_spectator_viewer_count() from public, anon;
grant execute on function public.upsert_guarded_game_save(jsonb, integer, bigint, bigint) to authenticated;
grant execute on function public.heartbeat_spectator_viewer(uuid) to authenticated;
grant execute on function public.leave_spectator_viewer(uuid) to authenticated;
grant execute on function public.get_my_spectator_viewer_count() to authenticated;
