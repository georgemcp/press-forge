-- Rollback-only test for 20260717210000_users_billing_columns_guard.sql.
-- Run against a database that has ALL repo migrations applied (a branch DB or a
-- scratch replay); everything it does is rolled back:
--   psql -X -v ON_ERROR_STOP=1 -f supabase/tests/users_billing_columns_guard.test.sql "<conn>"
-- Needs a role that can SET ROLE to anon / authenticated / service_role (postgres).
-- Prints "TEST users_billing_columns_guard OK" on success, aborts non-zero otherwise.
begin;

-- two accounts created the way production creates them: through auth.users, so
-- handle_new_auth_user (SECURITY DEFINER, runs as the owner) writes public.users
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@pf-test.invalid'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@pf-test.invalid');

do $$
begin
  if (select count(*) from public.users
      where id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2')
        and subscription_status = 'none' and stripe_customer_id is null) <> 2 then
    raise exception 'FAIL: signup trigger did not create default users rows';
  end if;
end $$;

-- 1. every column outside the allow-list is closed to anon/authenticated, for INSERT and UPDATE
do $$
declare
  r text; c text; p text; granted boolean; expected boolean;
begin
  foreach r in array array['anon', 'authenticated'] loop
    for c in select attname from pg_attribute where attrelid = 'public.users'::regclass and attnum > 0 and not attisdropped loop
      foreach p in array array['INSERT', 'UPDATE'] loop
        granted := has_column_privilege(r, 'public.users', c, p);
        expected := r = 'authenticated' and c = any (case p
          when 'INSERT' then array['id','email','full_name','company_name','role','company_website','phone','monthly_print_jobs','primary_use_case','plan_interest','marketing_consent','onboarding_completed_at']
          else array['full_name','company_name','role','company_website','phone','monthly_print_jobs','primary_use_case','plan_interest','marketing_consent','onboarding_completed_at'] end);
        if granted <> expected then
          raise exception 'FAIL: % % on public.users.% is %, expected %', r, p, c, granted, expected;
        end if;
      end loop;
    end loop;
  end loop;
  -- the billing columns specifically, so a rename of the allow-list cannot hide them
  if has_column_privilege('authenticated', 'public.users', 'subscription_status', 'INSERT')
     or has_column_privilege('authenticated', 'public.users', 'subscription_status', 'UPDATE')
     or has_column_privilege('authenticated', 'public.users', 'stripe_customer_id', 'INSERT')
     or has_column_privilege('authenticated', 'public.users', 'stripe_customer_id', 'UPDATE') then
    raise exception 'FAIL: billing column writable by authenticated';
  end if;
end $$;

-- 2. authenticated, row-less account: billing INSERTs are refused, a profile INSERT works
delete from public.users where id = '00000000-0000-0000-0000-0000000000a1';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
set local role authenticated;

do $$
begin
  begin
    insert into public.users (id, email, subscription_status) values ('00000000-0000-0000-0000-0000000000a1', 'a@pf-test.invalid', 'active');
    raise exception 'FAIL: INSERT with subscription_status was accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.users (id, email, stripe_customer_id) values ('00000000-0000-0000-0000-0000000000a1', 'a@pf-test.invalid', 'cus_forged');
    raise exception 'FAIL: INSERT with stripe_customer_id was accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.users (id, email, created_at) values ('00000000-0000-0000-0000-0000000000a1', 'a@pf-test.invalid', now());
    raise exception 'FAIL: INSERT with created_at was accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.users (id, email, subscription_status) values ('00000000-0000-0000-0000-0000000000a1', 'a@pf-test.invalid', 'none');
    raise exception 'FAIL: INSERT naming subscription_status (even with the default value) was accepted';
  exception when insufficient_privilege then null; end;
  -- upsert on an existing row is an UPDATE of the conflicting columns: also refused
  begin
    insert into public.users (id, email) values ('00000000-0000-0000-0000-0000000000b2', 'x@pf-test.invalid')
    on conflict (id) do update set subscription_status = 'active';
    raise exception 'FAIL: upsert of subscription_status was accepted';
  exception when insufficient_privilege then null; end;
  -- another user's id is still refused by the (unchanged) RLS policy
  begin
    insert into public.users (id, email) values ('00000000-0000-0000-0000-0000000000b2', 'x@pf-test.invalid');
    raise exception 'FAIL: INSERT for another user id was accepted';
  exception when insufficient_privilege or unique_violation then null; end;
end $$;

-- the columns the app is allowed to set still work
insert into public.users (id, email, full_name, company_name, role, company_website, phone, monthly_print_jobs, primary_use_case, plan_interest, marketing_consent, onboarding_completed_at)
values ('00000000-0000-0000-0000-0000000000a1', 'a@pf-test.invalid', 'A', 'Co', 'Owner', 'https://example.invalid', '555', '4-10', 'flyers', 'pro', true, now());

do $$
begin
  if (select subscription_status || '/' || coalesce(stripe_customer_id, '-') from public.users where id = '00000000-0000-0000-0000-0000000000a1') <> 'none/-' then
    raise exception 'FAIL: legitimate INSERT did not get the billing defaults';
  end if;
end $$;

-- 3. authenticated UPDATE of its own row: profile columns yes, billing no
update public.users set full_name = 'A2', company_name = 'Co2', role = 'Founder', company_website = null, phone = null,
  monthly_print_jobs = '1-3', primary_use_case = 'postcards', plan_interest = 'demo', marketing_consent = false,
  onboarding_completed_at = now()
where id = '00000000-0000-0000-0000-0000000000a1';

do $$
declare col text;
begin
  foreach col in array array['subscription_status', 'stripe_customer_id', 'email', 'id', 'created_at', 'updated_at'] loop
    begin
      execute format('update public.users set %I = %I where id = %L', col, col, '00000000-0000-0000-0000-0000000000a1');
      raise exception 'FAIL: UPDATE of % was accepted', col;
    exception when insufficient_privilege then null; end;
  end loop;
  begin
    update public.users set subscription_status = 'active' where id = '00000000-0000-0000-0000-0000000000a1';
    raise exception 'FAIL: UPDATE subscription_status = active was accepted';
  exception when insufficient_privilege then null; end;
end $$;

reset role;

-- 4. a column added later is closed by default
alter table public.users add column export_credits integer not null default 0;
set local role authenticated;
do $$
begin
  begin
    insert into public.users (id, email, export_credits) values (gen_random_uuid(), 'n@pf-test.invalid', 99);
    raise exception 'FAIL: INSERT of a newly added column was accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.users set export_credits = 99 where id = '00000000-0000-0000-0000-0000000000a1';
    raise exception 'FAIL: UPDATE of a newly added column was accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- 5. anon cannot write public.users at all
select set_config('request.jwt.claim.sub', '', true);
set local role anon;
do $$
begin
  begin
    insert into public.users (id, email) values (gen_random_uuid(), 'anon@pf-test.invalid');
    raise exception 'FAIL: anon INSERT was accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.users set full_name = 'x';
    raise exception 'FAIL: anon UPDATE was accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- 6. the server paths are untouched: Stripe webhook (service_role) and the signup trigger (owner)
set local role service_role;
update public.users set subscription_status = 'active', stripe_customer_id = 'cus_real_1' where id = '00000000-0000-0000-0000-0000000000b2';
do $$
begin
  if (select subscription_status || '/' || stripe_customer_id from public.users where id = '00000000-0000-0000-0000-0000000000b2') <> 'active/cus_real_1' then
    raise exception 'FAIL: service_role could not activate the subscription';
  end if;
end $$;
reset role;

insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-0000000000c3', 'c@pf-test.invalid', '{"full_name":"C","plan_interest":"pro"}');
do $$
begin
  if (select subscription_status || '/' || plan_interest from public.users where id = '00000000-0000-0000-0000-0000000000c3') <> 'none/pro' then
    raise exception 'FAIL: signup trigger no longer creates the row';
  end if;
end $$;

-- 7. the signed-in user cannot see or change another user's row through the policies
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.users where id = '00000000-0000-0000-0000-0000000000b2') <> 0 then
    raise exception 'FAIL: authenticated can read another user''s row';
  end if;
end $$;
reset role;

select 'TEST users_billing_columns_guard OK' as result;
rollback;
