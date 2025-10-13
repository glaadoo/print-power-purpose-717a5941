-- Create role enum
create type public.app_role as enum ('admin', 'user');

-- Create user_roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Security definer function to check roles (prevents RLS recursion)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- RLS policy: users can view their own roles
create policy "users_can_view_own_roles"
on public.user_roles
for select
to authenticated
using (user_id = auth.uid());

-- === UPDATE PRODUCTS TABLE POLICIES ===

-- Allow admins to insert products
create policy "admins_can_insert_products"
on public.products
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update products
create policy "admins_can_update_products"
on public.products
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete products
create policy "admins_can_delete_products"
on public.products
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- === UPDATE CAUSES TABLE POLICIES ===

-- Allow admins to insert causes
create policy "admins_can_insert_causes"
on public.causes
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update causes
create policy "admins_can_update_causes"
on public.causes
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete causes
create policy "admins_can_delete_causes"
on public.causes
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));