create table public.export_orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  stripe_customer_id text,
  customer_email text,
  entitlement text not null check (entitlement in ('export_credit', 'subscription')),
  checkout_mode text not null check (checkout_mode in ('payment', 'subscription')),
  status text not null default 'paid' check (status in ('paid', 'consumed', 'refunded', 'expired')),
  proof_job_id text,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index export_orders_status_idx on public.export_orders(status);
create index export_orders_customer_email_idx on public.export_orders(customer_email) where customer_email is not null;

create trigger set_export_orders_updated_at
before update on public.export_orders
for each row execute function public.set_updated_at();

alter table public.export_orders enable row level security;
