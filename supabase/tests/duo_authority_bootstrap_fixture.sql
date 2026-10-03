\set ON_ERROR_STOP on

drop schema if exists private cascade;
drop schema if exists auth cascade;
drop table if exists public.coop_lobby_members cascade;
drop table if exists public.coop_lobbies cascade;
drop role if exists anon;
drop role if exists authenticated;
drop role if exists service_role;

create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema auth;
create schema private;

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
