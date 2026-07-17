create table if not exists public.pilot_prospects (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  company_name text,
  contact_name text,
  role text,
  segment text not null check (segment in ('print_shop', 'marketing_team', 'designer', 'checklist_reader', 'account_signup', 'general_launch')),
  source text not null default 'manual_target_list',
  first_supported_job text not null check (first_supported_job in ('flyer', 'poster', 'menu', 'brochure', 'business_card', 'postcard', 'letterhead')),
  likely_pain text not null default '',
  public_contact_path text not null default '',
  status text not null default 'needs_follow_up' check (status in ('needs_follow_up', 'contacted', 'customer', 'vip', 'blocked')),
  priority_score integer not null default 55 check (priority_score between 0 and 100),
  notes text not null default '',
  last_signal_at timestamptz,
  last_contact_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pilot_prospects_status_priority_idx
on public.pilot_prospects(status, priority_score desc, updated_at desc);
create index if not exists pilot_prospects_segment_idx
on public.pilot_prospects(segment, updated_at desc);
drop trigger if exists set_pilot_prospects_updated_at on public.pilot_prospects;
create trigger set_pilot_prospects_updated_at
before update on public.pilot_prospects
for each row execute function public.set_updated_at();
alter table public.pilot_prospects enable row level security;
