-- Ensure UUID function exists (Supabase already has this; local PG may need it)
create extension if not exists pgcrypto;

-- cart_items: one row per product in a user's ephemeral cart
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,              -- anonymous cart session stored in localStorage
  product_id uuid not null references public.products(id) on delete cascade,
  qty integer not null check (qty > 0),
  created_at timestamptz not null default now(),
  unique (session_id, product_id)
);

-- Enable RLS (recommended in Supabase)
alter table public.cart_items enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'cart_items' and policyname = 'cart_items open mvp'
  ) then
    create policy "cart_items open mvp"
      on public.cart_items for all
      using (true) with check (true);
  end if;
end $$ language plpgsql;
