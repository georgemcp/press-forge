alter table public.export_orders
add column if not exists stripe_payment_intent_id text,
add column if not exists stripe_subscription_id text;

create index if not exists export_orders_stripe_payment_intent_id_idx
on public.export_orders(stripe_payment_intent_id)
where stripe_payment_intent_id is not null;

create index if not exists export_orders_stripe_subscription_id_idx
on public.export_orders(stripe_subscription_id)
where stripe_subscription_id is not null;
