-- Create a separate table for user-submitted nonprofits
CREATE TABLE public.user_submitted_nonprofits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ein TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'US',
  description TEXT,
  website_url TEXT,
  contact_email TEXT,
  submitted_by_email TEXT,
  submitted_by_user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

-- Enable RLS
ALTER TABLE public.user_submitted_nonprofits ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a nonprofit
CREATE POLICY "Anyone can submit nonprofits"
ON public.user_submitted_nonprofits
FOR INSERT
WITH CHECK (true);

-- Users can view their own submissions
CREATE POLICY "Users can view own submissions"
ON public.user_submitted_nonprofits
FOR SELECT
USING (
  submitted_by_email = (auth.jwt() ->> 'email')
  OR submitted_by_user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can manage all submissions
CREATE POLICY "Admins can manage submissions"
ON public.user_submitted_nonprofits
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_user_submitted_nonprofits_status ON public.user_submitted_nonprofits(status);
CREATE INDEX idx_user_submitted_nonprofits_email ON public.user_submitted_nonprofits(submitted_by_email);

-- Trigger to update updated_at
CREATE TRIGGER update_user_submitted_nonprofits_updated_at
BEFORE UPDATE ON public.user_submitted_nonprofits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();