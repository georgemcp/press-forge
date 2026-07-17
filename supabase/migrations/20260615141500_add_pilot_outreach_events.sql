create table if not exists public.pilot_outreach_events (
  id uuid primary key default gen_random_uuid(),
  prospect_email text not null,
  event_type text not null check (event_type in ('first_touch_sent', 'follow_up_sent', 'reply_received', 'pilot_agreed', 'pilot_declined', 'blocked')),
  channel text not null default 'email' check (channel in ('email', 'contact_form', 'phone', 'linkedin', 'in_person', 'other')),
  subject text not null default '',
  notes text not null default '',
  next_step text not null default '',
  first_supported_job text check (first_supported_job is null or first_supported_job in ('flyer', 'poster', 'menu', 'brochure', 'business_card', 'postcard', 'letterhead')),
  event_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pilot_outreach_events_email_event_at_idx
on public.pilot_outreach_events(prospect_email, event_at desc);
create index if not exists pilot_outreach_events_type_event_at_idx
on public.pilot_outreach_events(event_type, event_at desc);
drop trigger if exists set_pilot_outreach_events_updated_at on public.pilot_outreach_events;
create trigger set_pilot_outreach_events_updated_at
before update on public.pilot_outreach_events
for each row execute function public.set_updated_at();
alter table public.pilot_outreach_events enable row level security;
