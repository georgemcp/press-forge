create table if not exists public.pilot_evidence_records (
  id uuid primary key default gen_random_uuid(),
  prospect_email text not null,
  job_type text not null check (job_type in ('flyer', 'poster', 'menu', 'brochure', 'business_card', 'postcard', 'letterhead')),
  source_material text not null default '',
  printer_spec text not null default '',
  tested_path text not null default 'unknown' check (tested_path in ('dummy_proof', 'export_credit', 'pro', 'unknown')),
  checks_summary text not null default '',
  report_clarity text not null default '',
  outcome text not null check (outcome in ('review_only', 'needs_revision', 'used_after_review', 'not_fit', 'blocked')),
  quote_permission text not null default 'none' check (quote_permission in ('none', 'anonymous', 'attributed')),
  public_claim_status text not null default 'not_approved' check (public_claim_status in ('not_approved', 'approved_internal', 'approved_public')),
  product_version text not null default '',
  notes text not null default '',
  evidence_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pilot_evidence_records_email_evidence_at_idx
on public.pilot_evidence_records(prospect_email, evidence_at desc);

create index if not exists pilot_evidence_records_outcome_evidence_at_idx
on public.pilot_evidence_records(outcome, evidence_at desc);

create index if not exists pilot_evidence_records_claim_status_evidence_at_idx
on public.pilot_evidence_records(public_claim_status, evidence_at desc);

drop trigger if exists set_pilot_evidence_records_updated_at on public.pilot_evidence_records;
create trigger set_pilot_evidence_records_updated_at
before update on public.pilot_evidence_records
for each row execute function public.set_updated_at();

alter table public.pilot_evidence_records enable row level security;
