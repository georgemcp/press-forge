-- Make the billing columns of public.users un-writable for API client roles on
-- INSERT as well as UPDATE.
--
-- State before this migration:
--   * UPDATE: 20260717150000_security_hardening.sql revoked table-level UPDATE from
--     anon/authenticated and granted UPDATE on ten profile columns only, so
--     subscription_status / stripe_customer_id were already not client-updatable.
--   * INSERT: still the default table-level grant plus the policy
--     "users can insert own profile" (auth.uid() = id), so a signed-in user could
--     POST /rest/v1/users with subscription_status = 'active' and any
--     stripe_customer_id. Only the signup trigger handle_new_auth_user (it inserts
--     the row first, so the client insert hits the PK) kept it from being usable.
--
-- Fix: the table already uses column grants, so INSERT gets the same treatment.
-- authenticated may insert only id, email and the ten profile columns it may
-- already update. Everything else (subscription_status, stripe_customer_id,
-- created_at, updated_at and any column added later) falls back to its default and
-- can only be set by service_role / the owner, i.e. the Stripe webhook path and
-- the SECURITY DEFINER signup trigger, none of which are affected by column grants
-- on the client roles. anon gets no INSERT or UPDATE at all (the RLS policies
-- already required auth.uid(), so this changes nothing for it).
--
-- The DO block at the end aborts the migration if any client role can still
-- INSERT or UPDATE a column outside the allow-list, so it also catches a
-- table-level grant inherited from PUBLIC or default privileges.
--
-- Idempotent. Reverse: users_billing_columns_guard_REVERSE.sql (packet).

revoke insert on table public.users from anon, authenticated;
revoke insert (id, email, stripe_customer_id, subscription_status, created_at, updated_at) on table public.users from anon, authenticated;
revoke update on table public.users from anon;

grant insert (
  id,
  email,
  full_name,
  company_name,
  role,
  company_website,
  phone,
  monthly_print_jobs,
  primary_use_case,
  plan_interest,
  marketing_consent,
  onboarding_completed_at
) on table public.users to authenticated;

do $$
declare
  client_role text;
  col record;
  privilege text;
  writable text[] := array[
    'id', 'email', 'full_name', 'company_name', 'role', 'company_website', 'phone',
    'monthly_print_jobs', 'primary_use_case', 'plan_interest', 'marketing_consent',
    'onboarding_completed_at'
  ];
  updatable text[] := array[
    'full_name', 'company_name', 'role', 'company_website', 'phone',
    'monthly_print_jobs', 'primary_use_case', 'plan_interest', 'marketing_consent',
    'onboarding_completed_at'
  ];
begin
  for client_role in select unnest(array['anon', 'authenticated']) loop
    for col in
      select attname
      from pg_attribute
      where attrelid = 'public.users'::regclass and attnum > 0 and not attisdropped
    loop
      foreach privilege in array array['INSERT', 'UPDATE'] loop
        if has_column_privilege(client_role, 'public.users', col.attname, privilege)
           and not (
             client_role = 'authenticated'
             and col.attname = any (case privilege when 'INSERT' then writable else updatable end)
           )
        then
          raise exception 'public.users.%: % is still % on this column', col.attname, client_role, privilege;
        end if;
      end loop;
    end loop;
  end loop;
end;
$$;
