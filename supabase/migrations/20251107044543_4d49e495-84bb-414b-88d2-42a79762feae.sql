-- Fix critical security issues

-- 1. Restrict donations table - only show user's own donations
DROP POLICY IF EXISTS "Anyone can view donations" ON donations;
CREATE POLICY "Users can view own donations"
ON donations
FOR SELECT
USING (auth.uid()::text = customer_email OR auth.jwt()->>'email' = customer_email);

CREATE POLICY "Admins can view all donations"
ON donations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 2. Restrict admin_sessions - service role only
DROP POLICY IF EXISTS "Public can read admin sessions" ON admin_sessions;
DROP POLICY IF EXISTS "Anyone can read sessions" ON admin_sessions;

-- 3. Fix contact_inquiries - admin only
DROP POLICY IF EXISTS "Authenticated users can read contact inquiries" ON contact_inquiries;
DROP POLICY IF EXISTS "Authenticated users can update contact inquiries" ON contact_inquiries;

CREATE POLICY "Admins can view contact inquiries"
ON contact_inquiries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update contact inquiries"
ON contact_inquiries
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 4. Create monitoring/logging table
CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL DEFAULT now(),
  level text NOT NULL CHECK (level IN ('info', 'warn', 'error', 'critical')),
  category text NOT NULL,
  message text NOT NULL,
  metadata jsonb,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on system_logs
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can insert logs
CREATE POLICY "Service role can insert logs"
ON system_logs
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Admins can view all logs
CREATE POLICY "Admins can view logs"
ON system_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add index for faster log queries
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);

-- Create function to clean old logs (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_system_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM system_logs
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$;