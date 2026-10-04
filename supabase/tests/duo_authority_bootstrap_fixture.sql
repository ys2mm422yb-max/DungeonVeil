\set ON_ERROR_STOP on

drop schema if exists private cascade;
drop schema if exists auth cascade;
drop table if exists public.coop_lobby_members cascade;
drop table if exists public.coop_lobbies cascade;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;
create schema auth;
create schema private;

create table auth.users (
  id uuid primary key
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create table public.coop_lobbies (
  id uuid primary key,
  invite_code text not null unique,
  status text not null default 'waiting',
  run_seed bigint not null default 1,
  run_attempt integer not null default 1,
  host_user_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default (clock_timestamp() + interval '1 hour'),
  started_at timestamptz
);

create table public.coop_lobby_members (
  lobby_id uuid not null references public.coop_lobbies(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('host', 'guest')),
  ready boolean not null default false,
  joined_at timestamptz not null default clock_timestamp(),
  left_at timestamptz,
  primary key (lobby_id, user_id)
);

create table public.coop_trusted_encounter_completions (
  lobby_id uuid not null references public.coop_lobbies(id) on delete cascade,
  run_attempt integer not null,
  run_seed bigint not null,
  chapter integer not null,
  room integer not null,
  authority_version text not null,
  final_state_seq bigint not null,
  completion_digest text not null,
  primary key (lobby_id, run_attempt, run_seed, chapter, room)
);

create or replace function public.record_trusted_coop_completion(
  p_lobby_id uuid, p_run_attempt integer, p_run_seed bigint,
  p_chapter integer, p_room integer, p_authority_version text,
  p_final_state_seq bigint, p_completion_digest text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.coop_trusted_encounter_completions (
    lobby_id, run_attempt, run_seed, chapter, room,
    authority_version, final_state_seq, completion_digest
  ) values (
    p_lobby_id, p_run_attempt, p_run_seed, p_chapter, p_room,
    p_authority_version, p_final_state_seq, p_completion_digest
  ) on conflict do nothing;
  return found;
end;
$$;

revoke all on function public.record_trusted_coop_completion(
  uuid, integer, bigint, integer, integer, text, bigint, text
) from public, anon, authenticated;
grant execute on function public.record_trusted_coop_completion(
  uuid, integer, bigint, integer, integer, text, bigint, text
) to service_role;

grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to authenticated;
grant select, insert, update, delete on public.coop_lobbies, public.coop_lobby_members to authenticated, service_role;

create or replace function public.start_coop_lobby()
returns table (
  lobby_id uuid, invite_code text, status text, run_seed bigint, role text,
  ready boolean, host_user_id uuid, created_at timestamptz, expires_at timestamptz,
  started_at timestamptz, server_now timestamptz
)
language sql
as $$ select null::uuid, null::text, null::text, null::bigint, null::text,
             null::boolean, null::uuid, null::timestamptz, null::timestamptz,
             null::timestamptz, null::timestamptz where false $$;

create or replace function public.restart_coop_run_attempt()
returns integer
language sql
as $$ select 0 $$;
