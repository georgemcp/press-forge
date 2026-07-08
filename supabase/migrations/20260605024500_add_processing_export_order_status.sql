alter table public.export_orders
drop constraint if exists export_orders_status_check;

alter table public.export_orders
add constraint export_orders_status_check
check (status in ('paid', 'processing', 'consumed', 'refunded', 'expired'));
