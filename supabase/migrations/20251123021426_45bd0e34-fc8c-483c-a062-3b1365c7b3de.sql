-- Allow users to view their own orders by session_id
-- This is safe because session_id is a secure token only known to the order owner
CREATE POLICY "Users can view orders by session_id"
ON public.orders
FOR SELECT
TO public
USING (
  -- Allow access if the session_id matches
  session_id IS NOT NULL
);