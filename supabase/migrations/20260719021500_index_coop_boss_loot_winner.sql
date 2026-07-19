create index if not exists coop_boss_loot_rolls_winner_user_idx
  on public.coop_boss_loot_rolls (winner_user_id)
  where winner_user_id is not null;
