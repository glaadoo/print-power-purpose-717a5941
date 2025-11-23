-- Grant schema usage to anon and authenticated roles
grant usage on schema public to anon, authenticated;

-- Grant select permission on orders table
grant select on table public.orders to anon, authenticated;

-- Enable Row Level Security on orders table
alter table public.orders enable row level security;