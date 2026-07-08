alter table public.export_orders
add column if not exists amount_total_cents integer check (amount_total_cents is null or amount_total_cents >= 0),
add column if not exists currency text check (currency is null or length(currency) between 3 and 12);

create index if not exists export_orders_amount_total_cents_idx
on public.export_orders(amount_total_cents)
where amount_total_cents is not null;

create table if not exists public.account_management (
  email text primary key,
  status text not null default 'lead' check (status in ('lead', 'customer', 'vip', 'churn_risk', 'blocked')),
  notes text not null default '',
  last_contact_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_account_management_updated_at on public.account_management;
create trigger set_account_management_updated_at
before update on public.account_management
for each row execute function public.set_updated_at();

alter table public.account_management enable row level security;

create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor text not null default 'admin',
  action text not null,
  target_type text not null,
  target_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_events_created_at_idx
on public.admin_audit_events(created_at desc);

create index if not exists admin_audit_events_target_idx
on public.admin_audit_events(target_type, target_id, created_at desc);

alter table public.admin_audit_events enable row level security;
