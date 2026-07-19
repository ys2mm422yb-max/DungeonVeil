drop function if exists public.get_my_coop_run_checkpoint(uuid, bigint);

create function public.get_my_coop_run_checkpoint(
  p_lobby_id uuid,
  p_run_seed bigint
)
returns table (
  run_attempt integer,
  snapshot jsonb,
  chapter integer,
  room integer,
  authoritative_chapter integer,
  authoritative_room integer,
  authoritative_room_clear boolean,
  revision bigint,
  updated_at timestamptz,
  used_host_fallback boolean
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_lobby public.coop_lobbies%rowtype;
  v_own public.coop_run_checkpoints%rowtype;
  v_host public.coop_run_checkpoints%rowtype;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;

  select lobby.* into v_lobby
  from public.coop_lobbies lobby
  where lobby.id = p_lobby_id
    and lobby.status = 'in_run'
    and lobby.run_seed = p_run_seed
    and lobby.expires_at > clock_timestamp();

  if v_lobby.id is null then return; end if;
  if not private.is_coop_lobby_member(v_lobby.id) then raise exception 'lobby membership required'; end if;

  select checkpoint.* into v_own
  from public.coop_run_checkpoints checkpoint
  where checkpoint.lobby_id = v_lobby.id
    and checkpoint.run_attempt = v_lobby.run_attempt
    and checkpoint.user_id = v_user_id;

  select checkpoint.* into v_host
  from public.coop_run_checkpoints checkpoint
  where checkpoint.lobby_id = v_lobby.id
    and checkpoint.run_attempt = v_lobby.run_attempt
    and checkpoint.user_id = v_lobby.host_user_id;

  if v_own.user_id is null and v_host.user_id is null then return; end if;

  return query select
    v_lobby.run_attempt,
    coalesce(v_own.snapshot, v_host.snapshot),
    coalesce(v_own.chapter, v_host.chapter, 1),
    coalesce(v_own.room, v_host.room, 1),
    coalesce(v_host.chapter, v_own.chapter, 1),
    coalesce(v_host.room, v_own.room, 1),
    coalesce(v_host.room_clear, v_own.room_clear, false),
    coalesce(v_own.revision, v_host.revision, 0),
    coalesce(v_own.updated_at, v_host.updated_at, v_lobby.started_at, v_lobby.updated_at),
    v_own.user_id is null and v_host.user_id is not null;
end;
$$;

create or replace function public.get_my_coop_room_reward_state(
  p_lobby_id uuid,
  p_run_seed bigint,
  p_chapter integer,
  p_room integer
)
returns table (
  entitlement_id uuid,
  claimed boolean,
  claimed_at timestamptz
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_attempt integer;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if not private.is_coop_lobby_member(p_lobby_id) then raise exception 'lobby membership required'; end if;

  select lobby.run_attempt into v_attempt
  from public.coop_lobbies lobby
  where lobby.id = p_lobby_id
    and lobby.run_seed = p_run_seed
    and lobby.status = 'in_run';

  if v_attempt is null then return; end if;

  return query
  select reward.id,
         reward.claimed_at is not null,
         reward.claimed_at
  from public.coop_room_reward_entitlements reward
  where reward.lobby_id = p_lobby_id
    and reward.run_seed = p_run_seed
    and reward.run_attempt = v_attempt
    and reward.chapter = p_chapter
    and reward.room = p_room
    and reward.user_id = v_user_id
  limit 1;
end;
$$;

revoke all on function public.get_my_coop_run_checkpoint(uuid, bigint) from public, anon;
revoke all on function public.get_my_coop_room_reward_state(uuid, bigint, integer, integer) from public, anon;
grant execute on function public.get_my_coop_run_checkpoint(uuid, bigint) to authenticated;
grant execute on function public.get_my_coop_room_reward_state(uuid, bigint, integer, integer) to authenticated;

notify pgrst, 'reload schema';