-- Create admin_access_logs table for tracking all admin access attempts
CREATE TABLE IF NOT EXISTS public.admin_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_time timestamp with time zone DEFAULT now() NOT NULL,
  path text NOT NULL,
  ip_address text,
  user_id uuid,
  user_email text,
  reason text NOT NULL,
  provided_key text,
  user_agent text,
  success boolean DEFAULT false NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.admin_access_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "admins_can_view_access_logs"
ON public.admin_access_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Service role can insert logs
CREATE POLICY "service_role_can_insert_access_logs"
ON public.admin_access_logs
FOR INSERT
WITH CHECK (true);

-- Add index for performance
CREATE INDEX idx_admin_access_logs_attempt_time ON public.admin_access_logs(attempt_time DESC);
CREATE INDEX idx_admin_access_logs_success ON public.admin_access_logs(success);