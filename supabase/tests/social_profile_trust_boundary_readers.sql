\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

-- Actor 1 has a trusted projection from the preceding integration test.
insert into auth.users(id) values
  ('46000000-0000-4000-8000-000000000002'),
  ('46000000-0000-4000-8000-000000000003'),
  ('46000000-0000-4000-8000-000000000004');
insert into public.profiles(id, display_name, friend_code)
select u.id, 'Reader Probe', u.id::text from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
insert into public.friendships(user_id, friend_user_id) values
  ('46000000-0000-4000-8000-000000000002', '46000000-0000-4000-8000-000000000001');
insert into public.guilds values ('46000000-0000-4000-8000-000000000010', 'Trust Guild', 'TRUST');
insert into public.guild_members values
  ('46000000-0000-4000-8000-000000000003', '46000000-0000-4000-8000-000000000010'),
  ('46000000-0000-4000-8000-000000000001', '46000000-0000-4000-8000-000000000010');
revoke all on function public.get_social_profile_card(uuid), public.list_friends_v2() from public, anon;
grant execute on function public.get_social_profile_card(uuid), public.list_friends_v2() to authenticated;

set role authenticated;
select set_config('request.jwt.claim.sub', '46000000-0000-4000-8000-000000000001', false);
do $$ declare card record; begin
  select * into strict card from public.get_social_profile_card(auth.uid());
  if card.current_chapter <> 3 or card.current_rank <> 7 or card.highest_chapter <> 3
     or card.equipped_items <> '[{"id":"server-owned"}]'::jsonb then
    raise exception 'self reader lost trusted projection';
  end if;
end $$;
select 'reader ok 1 - actual self reader retains trusted projection';

select set_config('request.jwt.claim.sub', '46000000-0000-4000-8000-000000000002', false);
do $$ declare card record; friend record; begin
  select * into strict card from public.get_social_profile_card('46000000-0000-4000-8000-000000000001');
  select * into strict friend from public.list_friends_v2();
  if card.highest_chapter <> 3 or friend.highest_chapter <> 3 or friend.highest_room <> 8 then
    raise exception 'friend reader lost trusted projection';
  end if;
end $$;
select 'reader ok 2 - actual friend card and friend list remain functional';

select set_config('request.jwt.claim.sub', '46000000-0000-4000-8000-000000000003', false);
do $$ declare card record; begin
  select * into strict card from public.get_social_profile_card('46000000-0000-4000-8000-000000000001');
  if card.guild_tag <> 'TRUST' or card.highest_chapter <> 3 then raise exception 'guild reader failed'; end if;
end $$;
select 'reader ok 3 - actual guild peer reader remains functional';

select set_config('request.jwt.claim.sub', '46000000-0000-4000-8000-000000000004', false);
do $$ begin
  perform public.get_social_profile_card('46000000-0000-4000-8000-000000000001');
  raise exception 'stranger access unexpectedly accepted';
exception when raise_exception then
  if sqlerrm <> 'profile not available' then raise; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  perform public.get_social_profile_card('46000000-0000-4000-8000-000000000001');
  raise exception 'missing identity unexpectedly accepted';
exception when raise_exception then
  if sqlerrm <> 'authentication required' then raise; end if;
end $$;
select 'reader ok 4 - stranger and missing identity remain denied';
reset role;

-- Read the neutralized fixture through the actual achievement/equipment reader.
update public.profiles set current_chapter = 1, current_rank = 1,
  public_stats = '{"highestChapter":1,"highestRoom":1,"equippedItems":[]}' where id = '46000000-0000-4000-8000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub', '46000000-0000-4000-8000-000000000001', false);
do $$ declare card record; begin
  perform public.sync_profile_progress(999, 9999, 'mage');
  perform public.sync_public_profile_stats('{"highestChapter":999,"equippedItems":[{"id":"forged"}]}');
  select * into strict card from public.get_social_profile_card(auth.uid());
  if card.achievement_keys && array['first_steps', 'veil_walker']
     or card.highest_chapter <> 1 or card.equipped_items <> '[]'::jsonb then
    raise exception 'forged achievement or equipment escaped through actual reader';
  end if;
end $$;
select 'reader ok 5 - actual consumer cannot expose forged achievements or equipment';
