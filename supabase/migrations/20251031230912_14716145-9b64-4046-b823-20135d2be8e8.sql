-- Add admin access policies for orders table
CREATE POLICY "admins_can_view_all_orders"
ON public.orders
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin access policies for donations table
CREATE POLICY "admins_can_view_all_donations"
ON public.donations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));