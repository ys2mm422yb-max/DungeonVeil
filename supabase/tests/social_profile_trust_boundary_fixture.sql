\set ON_ERROR_STOP on

drop schema if exists auth cascade;
drop table if exists public.profiles cascade;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;

create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create table public.profiles (
  id uuid primary key references auth.users(id),
  display_name text not null,
  avatar_key text not null default 'archer',
  friend_code text not null,
  current_chapter integer not null default 1,
  current_rank integer not null default 1,
  character_key text not null default 'archer',
  last_active_at timestamptz not null default now(),
  public_stats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy profiles_insert_self on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_read_authenticated on public.profiles for select to authenticated
  using (true);
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to authenticated;
grant select, insert, update on public.profiles to authenticated;

insert into auth.users(id) values ('46000000-0000-4000-8000-000000000001');
insert into public.profiles(
  id, display_name, friend_code, current_chapter, current_rank, public_stats
) values (
  '46000000-0000-4000-8000-000000000001', 'Trust Probe', 'DV-TRUST1', 999, 9999,
  '{"highestChapter":999,"highestRoom":50,"roomsCleared":999999,"equippedItems":[{"id":"forged"}]}'::jsonb
);

-- Minimal dependency schema for the unchanged repository social readers.
alter table public.profiles add column created_at timestamptz not null default now(),
  add column activity_state text not null default 'menu',
  add column activity_chapter integer not null default 1,
  add column activity_room integer not null default 1;
drop table if exists public.friendships, public.guild_members, public.guilds, public.world_boss_contributions cascade;
create table public.friendships (user_id uuid, friend_user_id uuid, created_at timestamptz default now());
create table public.guilds (id uuid primary key, name text, tag text);
create table public.guild_members (user_id uuid, guild_id uuid);
create table public.world_boss_contributions (user_id uuid, damage bigint);
