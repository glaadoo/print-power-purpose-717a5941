-- Remove the overly permissive policy that exposes all orders publicly
DROP POLICY IF EXISTS "Allow read orders (fallback secure)" ON orders;

-- Add a session-based policy for guest checkout to read their own order
-- This uses the x-ppp-session-id header to allow guests to view orders they created
CREATE POLICY "guest_read_own_order_by_session" ON orders
  FOR SELECT
  USING (session_id = current_setting('request.headers', true)::json->>'x-ppp-session-id');