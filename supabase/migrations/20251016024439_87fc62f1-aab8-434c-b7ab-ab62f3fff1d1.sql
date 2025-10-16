-- Create audit_log table for tracking admin actions and system events
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create story_requests table for tracking $777 milestone requests
CREATE TABLE public.story_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cause_id UUID REFERENCES public.causes(id) ON DELETE CASCADE NOT NULL,
  reached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  contact_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_requests ENABLE ROW LEVEL SECURITY;

-- Audit log policies (admins can view all, system can insert)
CREATE POLICY "admins_can_view_audit_log"
ON public.audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "service_role_can_insert_audit_log"
ON public.audit_log
FOR INSERT
WITH CHECK (true);

-- Story requests policies (admins can manage)
CREATE POLICY "admins_can_view_story_requests"
ON public.story_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_can_update_story_requests"
ON public.story_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "service_role_can_insert_story_requests"
ON public.story_requests
FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX idx_story_requests_cause_id ON public.story_requests(cause_id);
CREATE INDEX idx_story_requests_status ON public.story_requests(status);

-- Add trigger for story_requests updated_at
CREATE TRIGGER update_story_requests_updated_at
BEFORE UPDATE ON public.story_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();