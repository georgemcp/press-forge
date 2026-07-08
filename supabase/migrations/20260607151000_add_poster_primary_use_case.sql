do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.users'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%primary_use_case%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.users drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.users
add constraint users_primary_use_case_check
check (
  primary_use_case is null
  or primary_use_case in ('business_cards', 'flyers', 'posters', 'postcards', 'letterhead', 'mixed_print')
);
