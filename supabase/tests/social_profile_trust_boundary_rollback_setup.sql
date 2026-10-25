\set ON_ERROR_STOP on
create function public.social_trust_rollback_probe() returns trigger
language plpgsql as $$ begin
  raise exception 'forced reconciliation rollback probe';
end $$;
create trigger social_trust_rollback_probe before update on public.profiles
for each row execute function public.social_trust_rollback_probe();
