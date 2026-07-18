create table if not exists public.coop_loot_drops (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.coop_lobbies(id) on delete cascade,
  run_seed bigint not null check (run_seed >= 0),
  chapter integer not null check (chapter between 1 and 999),
  room integer not null check (room in (10, 20, 30, 40, 50)),
  equipment_id text not null check (equipment_id ~ '^[a-z0-9-]{2,64}$'),
  source text not null check (source in ('forge', 'hunt', 'warden', 'ritual', 'depth')),
  rarity text not null check (rarity in ('common', 'rare', 'epic')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolution text check (resolution in ('single_claim', 'contested', 'all_pass', 'timeout')),
  winner_user_id uuid references auth.users(id) on delete set null,
  compensation_dust integer not null default 0 check (compensation_dust between 0 and 500),
  salvage_dust integer not null default 0 check (salvage_dust between 0 and 500),
  deadline_at timestamptz not null default (clock_timestamp() + interval '30 seconds'),
  created_at timestamptz not null default clock_timestamp(),
  resolved_at timestamptz,
  unique (lobby_id, run_seed, chapter, room)
);

create index if not exists coop_loot_drops_open_idx
  on public.coop_loot_drops (lobby_id, status, deadline_at);

create table if not exists public.coop_loot_choices (
  drop_id uuid not null references public.coop_loot_drops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  choice text not null check (choice in ('claim', 'pass')),
  roll smallint check (roll between 1 and 100),
  submitted_at timestamptz not null default clock_timestamp(),
  acknowledged_at timestamptz,
  primary key (drop_id, user_id)
);

alter table public.coop_loot_drops enable row level security;
alter table public.coop_loot_choices enable row level security;

revoke all on table public.coop_loot_drops from public, anon, authenticated;
revoke all on table public.coop_loot_choices from public, anon, authenticated;
