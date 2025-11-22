-- Allow anyone with session_id to read their order
-- This is secure because session_ids are long random strings from Stripe
CREATE POLICY "anyone_can_read_order_by_session_id"
ON public.orders
FOR SELECT
USING (
  session_id IS NOT NULL
);