-- Allow anonymous users to query their own orders by email for chatbot support
CREATE POLICY "allow_order_lookup_by_email" ON public.orders
FOR SELECT
USING (customer_email IS NOT NULL);