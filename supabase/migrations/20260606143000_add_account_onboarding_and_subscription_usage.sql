alter table public.users
add column if not exists full_name text,
add column if not exists company_name text,
add column if not exists role text,
add column if not exists company_website text,
add column if not exists phone text,
add column if not exists monthly_print_jobs text check (monthly_print_jobs is null or monthly_print_jobs in ('1-3', '4-10', '11-25', '26-plus')),
add column if not exists primary_use_case text check (primary_use_case is null or primary_use_case in ('business_cards', 'flyers', 'postcards', 'letterhead', 'mixed_print')),
add column if not exists plan_interest text check (plan_interest is null or plan_interest in ('demo', 'single_export', 'pro')),
add column if not exists marketing_consent boolean not null default true,
add column if not exists onboarding_completed_at timestamptz;

create index if not exists users_company_name_idx
on public.users(lower(company_name))
where company_name is not null;

create index if not exists users_plan_interest_idx
on public.users(plan_interest)
where plan_interest is not null;

create policy "users can insert own profile"
on public.users for insert
with check (auth.uid() = id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    email,
    full_name,
    company_name,
    role,
    onboarding_completed_at
  )
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'company_name',
    new.raw_user_meta_data ->> 'role',
    now()
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.users.full_name, excluded.full_name),
    company_name = coalesce(public.users.company_name, excluded.company_name),
    role = coalesce(public.users.role, excluded.role),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create table if not exists public.subscription_export_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  stripe_subscription_id text not null,
  stripe_session_id text not null,
  proof_job_id text not null unique,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscription_export_usage_user_id_idx
on public.subscription_export_usage(user_id);

create index if not exists subscription_export_usage_subscription_period_idx
on public.subscription_export_usage(stripe_subscription_id, period_start, period_end, status);

drop trigger if exists set_subscription_export_usage_updated_at on public.subscription_export_usage;
create trigger set_subscription_export_usage_updated_at
before update on public.subscription_export_usage
for each row execute function public.set_updated_at();

alter table public.subscription_export_usage enable row level security;

create policy "users can read own subscription export usage"
on public.subscription_export_usage for select
using (auth.uid() = user_id);
