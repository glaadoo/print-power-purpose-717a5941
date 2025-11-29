-- Add tracking fields to orders (idempotent: safe to run once)
alter table public.orders
  add column if not exists tracking_number   text,
  add column if not exists tracking_url      text,
  add column if not exists tracking_carrier  text,
  add column if not exists shipping_status   text default 'pending',
  add column if not exists shipped_at        timestamptz;

-- Index to speed up lookups by tracking number
create index if not exists idx_orders_tracking_number
  on public.orders (tracking_number);

-- Add helpful comments
comment on column public.orders.tracking_number is 'Carrier tracking number for shipment';
comment on column public.orders.tracking_url is 'Direct URL to track shipment on carrier website';
comment on column public.orders.tracking_carrier is 'Shipping carrier name (e.g., UPS, FedEx, USPS)';
comment on column public.orders.shipping_status is 'Shipping status: pending, shipped, in_transit, delivered, failed';
comment on column public.orders.shipped_at is 'Timestamp when order was shipped';