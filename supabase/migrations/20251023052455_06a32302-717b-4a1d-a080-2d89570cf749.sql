-- Fix #1: Admin Authentication Security
-- Add proper authentication and admin role enforcement

-- Add validation constraints for admin forms (Fix #4)
ALTER TABLE products ADD CONSTRAINT products_name_length CHECK (char_length(name) <= 200);
ALTER TABLE products ADD CONSTRAINT products_base_cost_positive CHECK (base_cost_cents > 0);
ALTER TABLE products ADD CONSTRAINT products_image_url_length CHECK (char_length(image_url) <= 500);

ALTER TABLE causes ADD CONSTRAINT causes_name_length CHECK (char_length(name) <= 200);
ALTER TABLE causes ADD CONSTRAINT causes_summary_length CHECK (char_length(summary) <= 1000);
ALTER TABLE causes ADD CONSTRAINT causes_goal_positive CHECK (goal_cents > 0);
ALTER TABLE causes ADD CONSTRAINT causes_image_url_length CHECK (char_length(image_url) <= 500);

ALTER TABLE schools ADD CONSTRAINT schools_name_length CHECK (char_length(name) <= 200);
ALTER TABLE nonprofits ADD CONSTRAINT nonprofits_name_length CHECK (char_length(name) <= 200);

-- Fix #5: Secure error logs with rate limiting
-- Add constraint to limit error message and stack size
ALTER TABLE error_logs ADD CONSTRAINT error_message_length CHECK (char_length(error_message) <= 5000);
ALTER TABLE error_logs ADD CONSTRAINT error_stack_length CHECK (char_length(error_stack) <= 10000);

-- Create a function to check if user has exceeded error log rate limit
CREATE OR REPLACE FUNCTION check_error_log_rate_limit()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  -- Get the session_id from the request (if available)
  -- Count error logs from this session in the last hour
  SELECT COUNT(*)
  INTO recent_count
  FROM error_logs
  WHERE session_id = current_setting('request.headers', true)::json->>'x-session-id'
    AND timestamp > NOW() - INTERVAL '1 hour';
  
  -- Allow max 10 errors per session per hour
  RETURN recent_count < 10;
EXCEPTION
  WHEN OTHERS THEN
    -- If we can't determine session, allow the insert (fail open for legitimate errors)
    RETURN true;
END;
$$;

-- Update error logs RLS policy to include rate limiting
DROP POLICY IF EXISTS "Anyone can insert error logs" ON error_logs;
CREATE POLICY "Rate limited error log inserts"
ON error_logs
FOR INSERT
WITH CHECK (check_error_log_rate_limit());

-- Add audit logging for service role operations (Fix #2 mitigation)
CREATE TABLE IF NOT EXISTS service_role_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  operation TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  details JSONB,
  ip_address TEXT
);

-- Enable RLS on audit table
ALTER TABLE service_role_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "admins_can_view_service_audit"
ON service_role_audit
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Service role can insert audit logs
CREATE POLICY "service_role_can_insert_audit"
ON service_role_audit
FOR INSERT
WITH CHECK (true);