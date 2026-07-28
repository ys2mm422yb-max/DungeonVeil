begin;

do $$
declare
  v_current uuid;
  v_repeat uuid;
  v_week_1 uuid;
  v_week_2 uuid;
  v_week_3 uuid;
  v_active integer;
  v_index smallint;
  v_start timestamptz;
  v_end timestamptz;
  v_user_id uuid;
  v_reward_count integer;
begin
  v_current := private.rotate_world_boss_at('2026-07-28 12:00:00+00');
  v_repeat := private.rotate_world_boss_at('2026-07-28 12:05:00+00');

  if v_current <> v_repeat then
    raise exception 'same-period execution created a second event';
  end if;

  select count(*) into v_active
  from public.world_boss_events
  where status = 'active';

  if v_active <> 1 then
    raise exception 'expected one active boss, got %', v_active;
  end if;

  v_week_1 := private.rotate_world_boss_at('2026-08-02 18:00:01+00');
  select rotation_index into v_index from public.world_boss_events where id = v_week_1;
  if v_index <> 1 then raise exception 'expected veil dragon index 1, got %', v_index; end if;

  v_week_2 := private.rotate_world_boss_at('2026-08-09 18:00:01+00');
  select rotation_index into v_index from public.world_boss_events where id = v_week_2;
  if v_index <> 2 then raise exception 'expected deep warden index 2, got %', v_index; end if;

  v_week_3 := private.rotate_world_boss_at('2026-08-16 18:00:01+00');
  select rotation_index into v_index from public.world_boss_events where id = v_week_3;
  if v_index <> 0 then raise exception 'expected ash king index 0, got %', v_index; end if;

  select starts_at, ends_at into v_start, v_end
  from private.world_boss_period('2026-10-25 20:30:00+00');

  if v_start <> '2026-10-25 19:00:00+00' or v_end <> '2026-11-01 19:00:00+00' then
    raise exception 'Europe/Berlin DST contract failed: % -> %', v_start, v_end;
  end if;

  select count(*) into v_active
  from public.world_boss_events
  where status = 'active';

  if v_active <> 1 then
    raise exception 'catch-up produced % active bosses', v_active;
  end if;

  select id into v_user_id from auth.users order by created_at asc limit 1;
  if v_user_id is not null then
    insert into public.world_boss_rewards(event_id, user_id, reward_payload)
    values(v_week_3, v_user_id, '{"test":true}'::jsonb)
    on conflict(event_id, user_id) do nothing;

    insert into public.world_boss_rewards(event_id, user_id, reward_payload)
    values(v_week_3, v_user_id, '{"test":false}'::jsonb)
    on conflict(event_id, user_id) do nothing;

    select count(*) into v_reward_count
    from public.world_boss_rewards
    where event_id = v_week_3 and user_id = v_user_id;

    if v_reward_count <> 1 then
      raise exception 'reward exactly-once contract failed: % rows', v_reward_count;
    end if;
  end if;
end
$$;

rollback;

select 'world boss rotation tests passed' as result;
