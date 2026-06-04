create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  stripe_customer_id text unique,
  subscription_status text not null default 'none' check (subscription_status in ('none', 'active', 'past_due', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create table public.print_profiles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  market text not null,
  icc_profile text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_print_profiles_updated_at
before update on public.print_profiles
for each row execute function public.set_updated_at();

insert into public.print_profiles (code, label, market, icc_profile)
values
  ('USWebCoatedSWOP', 'US Web Coated SWOP v2', 'US general commercial print', 'USWebCoatedSWOP.icc'),
  ('GRACoL2013', 'GRACoL2013', 'US sheetfed/coated workflows', 'GRACoL2013.icc'),
  ('FOGRA39', 'FOGRA39', 'European coated workflows', 'FOGRA39.icc')
on conflict (code) do nothing;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  product_type text not null check (product_type in ('business_card', 'postcard', 'flyer', 'letterhead')),
  status text not null default 'draft' check (status in ('draft', 'queued', 'processing', 'ready', 'needs_review', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_id_idx on public.projects(user_id);

create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create table public.layout_specs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  spec jsonb not null,
  schema_version text not null default 'layout_spec.v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index layout_specs_project_id_idx on public.layout_specs(project_id);
create index layout_specs_spec_gin_idx on public.layout_specs using gin(spec);

create trigger set_layout_specs_updated_at
before update on public.layout_specs
for each row execute function public.set_updated_at();

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  layout_spec_id uuid references public.layout_specs(id) on delete set null,
  kind text not null check (kind in ('background', 'photo', 'illustration', 'logo', 'icon')),
  provider text not null check (provider in ('openai', 'gemini', 'recraft', 'deterministic')),
  dpi integer not null check (dpi >= 300),
  uri text not null,
  mime_type text not null,
  is_vector boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assets_project_id_idx on public.assets(project_id);
create index assets_layout_spec_id_idx on public.assets(layout_spec_id);

create trigger set_assets_updated_at
before update on public.assets
for each row execute function public.set_updated_at();

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  layout_spec_id uuid references public.layout_specs(id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'passed', 'needs_review', 'failed')),
  pdfx_level text not null check (pdfx_level in ('PDF/X-1a:2001', 'PDF/X-4')),
  icc_profile text not null,
  preflight_report jsonb not null default '{}'::jsonb,
  uri text,
  preview_uri text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exports_project_id_idx on public.exports(project_id);
create index exports_layout_spec_id_idx on public.exports(layout_spec_id);
create index exports_status_idx on public.exports(status);

create trigger set_exports_updated_at
before update on public.exports
for each row execute function public.set_updated_at();

create table public.credits_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  export_id uuid references public.exports(id) on delete set null,
  delta integer not null,
  reason text not null check (reason in ('purchase', 'subscription_grant', 'export_passed', 'refund', 'adjustment')),
  stripe_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index credits_usage_user_id_idx on public.credits_usage(user_id);
create index credits_usage_export_id_idx on public.credits_usage(export_id);
create unique index credits_usage_stripe_session_id_idx on public.credits_usage(stripe_session_id) where stripe_session_id is not null;

create trigger set_credits_usage_updated_at
before update on public.credits_usage
for each row execute function public.set_updated_at();

create table public.email_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_email_signups_updated_at
before update on public.email_signups
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.print_profiles enable row level security;
alter table public.projects enable row level security;
alter table public.layout_specs enable row level security;
alter table public.assets enable row level security;
alter table public.exports enable row level security;
alter table public.credits_usage enable row level security;
alter table public.email_signups enable row level security;

create policy "users can read own profile"
on public.users for select
using (auth.uid() = id);

create policy "users can update own profile"
on public.users for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "authenticated users can read print profiles"
on public.print_profiles for select
to authenticated
using (true);

create policy "users can manage own projects"
on public.projects for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can manage layout specs through project"
on public.layout_specs for all
using (
  exists (
    select 1 from public.projects
    where projects.id = layout_specs.project_id
      and projects.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projects
    where projects.id = layout_specs.project_id
      and projects.user_id = auth.uid()
  )
);

create policy "users can manage assets through project"
on public.assets for all
using (
  exists (
    select 1 from public.projects
    where projects.id = assets.project_id
      and projects.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projects
    where projects.id = assets.project_id
      and projects.user_id = auth.uid()
  )
);

create policy "users can manage exports through project"
on public.exports for all
using (
  exists (
    select 1 from public.projects
    where projects.id = exports.project_id
      and projects.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projects
    where projects.id = exports.project_id
      and projects.user_id = auth.uid()
  )
);

create policy "users can read own credit ledger"
on public.credits_usage for select
using (auth.uid() = user_id);
