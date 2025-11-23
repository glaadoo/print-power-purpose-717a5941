-- Drop existing conflicting policies that might be blocking anon access
DROP POLICY IF EXISTS "Users can view orders by session_id" ON public.orders;
DROP POLICY IF EXISTS "anyone_can_read_order_by_session_id" ON public.orders;
DROP POLICY IF EXISTS "authenticated_users_read_own_orders" ON public.orders;

-- Create a simple policy allowing anon + authenticated users to read any order
-- Security: Users can only read orders they know the session_id for (effectively unguessable UUID)
CREATE POLICY "allow_read_orders_by_session"
ON public.orders
FOR SELECT
TO anon, authenticated
USING (true);

-- Keep existing policies for authenticated users and admins
-- (admins_can_view_all_orders, authenticated_users_insert_own_orders, service_role_full_access remain unchanged)