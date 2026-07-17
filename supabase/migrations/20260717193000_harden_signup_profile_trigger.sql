-- Keep public profile creation inside the auth transaction so unauthenticated
-- signup requests never need service-role access to public.users.

alter table public.users
alter column marketing_consent set default false;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata jsonb;
  monthly_print_jobs_value text;
  primary_use_case_value text;
  plan_interest_value text;
begin
  metadata := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  monthly_print_jobs_value := metadata ->> 'monthly_print_jobs';
  primary_use_case_value := metadata ->> 'primary_use_case';
  plan_interest_value := metadata ->> 'plan_interest';

  insert into public.users (
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
  )
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(left(btrim(metadata ->> 'full_name'), 120), ''),
    nullif(left(btrim(metadata ->> 'company_name'), 140), ''),
    nullif(left(btrim(metadata ->> 'role'), 100), ''),
    nullif(left(btrim(metadata ->> 'company_website'), 180), ''),
    nullif(left(btrim(metadata ->> 'phone'), 40), ''),
    case
      when monthly_print_jobs_value in ('1-3', '4-10', '11-25', '26-plus') then monthly_print_jobs_value
      else null
    end,
    case
      when primary_use_case_value in ('business_cards', 'flyers', 'posters', 'brochures', 'postcards', 'letterhead', 'mixed_print') then primary_use_case_value
      else null
    end,
    case
      when plan_interest_value in ('demo', 'single_export', 'pro') then plan_interest_value
      else 'demo'
    end,
    coalesce(metadata ->> 'marketing_consent' = 'true', false),
    now()
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.users.full_name),
    company_name = coalesce(excluded.company_name, public.users.company_name),
    role = coalesce(excluded.role, public.users.role),
    company_website = coalesce(excluded.company_website, public.users.company_website),
    phone = coalesce(excluded.phone, public.users.phone),
    monthly_print_jobs = coalesce(excluded.monthly_print_jobs, public.users.monthly_print_jobs),
    primary_use_case = coalesce(excluded.primary_use_case, public.users.primary_use_case),
    plan_interest = coalesce(excluded.plan_interest, public.users.plan_interest),
    marketing_consent = excluded.marketing_consent,
    onboarding_completed_at = coalesce(public.users.onboarding_completed_at, excluded.onboarding_completed_at),
    updated_at = now();

  return new;
end;
$$;
