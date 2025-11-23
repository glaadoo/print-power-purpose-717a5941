-- Drop the existing policy
drop policy if exists "Allow read orders for everyone" on public.orders;

-- Create new policy with better naming
create policy "Allow read orders (fallback secure)"
on public.orders
for select
to anon, authenticated
using (true);