-- Revoke overly-permissive policy added earlier
DROP POLICY IF EXISTS "allow_order_lookup_by_email" ON public.orders;