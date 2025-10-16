-- Create schools table
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create nonprofits table
CREATE TABLE public.nonprofits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create error_logs table for tracking errors
CREATE TABLE public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  error_message text NOT NULL,
  error_stack text,
  page_url text,
  file_name text,
  user_agent text,
  session_id text,
  resolved boolean NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nonprofits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for schools and nonprofits
CREATE POLICY "Public read access for schools"
ON public.schools
FOR SELECT
USING (true);

CREATE POLICY "Public read access for nonprofits"
ON public.nonprofits
FOR SELECT
USING (true);

-- Admin policies for schools
CREATE POLICY "admins_can_insert_schools"
ON public.schools
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins_can_update_schools"
ON public.schools
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins_can_delete_schools"
ON public.schools
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin policies for nonprofits
CREATE POLICY "admins_can_insert_nonprofits"
ON public.nonprofits
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins_can_update_nonprofits"
ON public.nonprofits
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins_can_delete_nonprofits"
ON public.nonprofits
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Error logs policies
CREATE POLICY "Anyone can insert error logs"
ON public.error_logs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "admins_can_view_error_logs"
ON public.error_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins_can_update_error_logs"
ON public.error_logs
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins_can_delete_error_logs"
ON public.error_logs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));