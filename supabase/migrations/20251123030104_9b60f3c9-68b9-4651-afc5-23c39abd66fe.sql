-- 1) Make sure anon + authenticated can SELECT from orders
grant usage on schema public to anon, authenticated;
grant select on table public.orders to anon, authenticated;

-- 2) Turn ON Row Level Security for orders
alter table public.orders enable row level security;

-- 3) Clean up old policies (optional but avoids conflicts)
drop policy if exists "Allow read orders for anon" on public.orders;
drop policy if exists "Allow read own order by session" on public.orders;
drop policy if exists "allow_read_orders_by_session" on public.orders;

-- 4) TEMP: allow reading all orders (just to confirm it works)
create policy "Allow read orders for everyone"
on public.orders
for select
to anon, authenticated
using (true);