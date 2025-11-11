-- Create legal_logs table for tracking user consent at checkout
CREATE TABLE IF NOT EXISTS public.legal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  order_id UUID NULL,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('privacy', 'terms')),
  version INTEGER NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.legal_logs ENABLE ROW LEVEL SECURITY;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_legal_logs_order_id ON public.legal_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_legal_logs_user_id ON public.legal_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_logs_policy_type ON public.legal_logs(policy_type);

-- RLS Policies
-- Service role can insert logs
CREATE POLICY "service_role_can_insert_legal_logs"
  ON public.legal_logs
  FOR INSERT
  WITH CHECK (true);

-- Users can view their own consent logs
CREATE POLICY "users_can_view_own_legal_logs"
  ON public.legal_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all logs
CREATE POLICY "admins_can_view_all_legal_logs"
  ON public.legal_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Comment
COMMENT ON TABLE public.legal_logs IS 'Tracks user acceptance of legal documents (Privacy Policy and Terms of Use) at checkout';