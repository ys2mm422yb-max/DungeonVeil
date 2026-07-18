create or replace function public.submit_coop_loot_choice(
  p_drop_id uuid,
  p_choice text
)
returns boolean
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_drop public.coop_loot_drops%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_choice not in ('claim', 'pass') then raise exception 'invalid loot choice'; end if;

  select drop_row.* into v_drop
  from public.coop_loot_drops drop_row
  where drop_row.id = p_drop_id
  for update;

  if v_drop.id is null then raise exception 'loot drop not found'; end if;
  if not public.is_coop_lobby_member(v_drop.lobby_id, v_user_id) then raise exception 'not a lobby member'; end if;

  perform private.resolve_coop_loot_drop(v_drop.id);
  select drop_row.* into v_drop from public.coop_loot_drops drop_row where drop_row.id = p_drop_id;

  if v_drop.status = 'resolved' or v_now >= v_drop.deadline_at then
    perform private.resolve_coop_loot_drop(v_drop.id);
    return false;
  end if;

  insert into public.coop_loot_choices (drop_id, user_id, choice, submitted_at)
  values (v_drop.id, v_user_id, p_choice, v_now)
  on conflict (drop_id, user_id) do update
    set choice = excluded.choice,
        roll = null,
        submitted_at = excluded.submitted_at;

  perform private.resolve_coop_loot_drop(v_drop.id);
  return true;
end;
$$;

revoke all on function public.submit_coop_loot_choice(uuid, text) from public, anon;
grant execute on function public.submit_coop_loot_choice(uuid, text) to authenticated;
