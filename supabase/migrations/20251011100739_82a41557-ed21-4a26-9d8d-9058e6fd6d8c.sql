-- Drop existing orders table and recreate with new structure
drop table if exists public.orders cascade;

-- === ORDERS TABLE CREATION ===
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  session_id text unique not null,
  status text not null default 'completed',
  customer_email text,
  currency text not null default 'usd',
  amount_total_cents integer not null default 0,
  donation_cents integer not null default 0,
  quantity integer not null default 1,
  product_name text,
  cause_id text,
  cause_name text,
  receipt_url text,
  created_at timestamptz not null default now()
);

create index orders_order_number_idx on public.orders(order_number);
create index orders_session_id_idx on public.orders(session_id);

-- === ENABLE ROW LEVEL SECURITY ===
alter table public.orders enable row level security;

-- ======================================================
-- ============== POLICIES ==============================
-- ======================================================

-- 1️⃣ ALLOW SERVICE ROLE FULL ACCESS
create policy "service_role_full_access"
on public.orders
as permissive
for all
to service_role
using (true)
with check (true);

-- 2️⃣ ALLOW AUTHENTICATED USERS TO READ THEIR OWN ORDERS
create policy "authenticated_users_read_own_orders"
on public.orders
for select
to authenticated
using (
  (auth.jwt() ->> 'email')::text is not null
  and customer_email = (auth.jwt() ->> 'email')::text
);

-- 3️⃣ ALLOW AUTHENTICATED USERS TO INSERT THEIR OWN ORDERS
create policy "authenticated_users_insert_own_orders"
on public.orders
for insert
to authenticated
with check (
  (auth.jwt() ->> 'email')::text is not null
  and customer_email = (auth.jwt() ->> 'email')::text
);

-- 4️⃣ PREVENT PUBLIC ACCESS
revoke all on public.orders from anon;

comment on table public.orders is
'RLS enabled. Authenticated users see their own orders only. service_role has full access.';