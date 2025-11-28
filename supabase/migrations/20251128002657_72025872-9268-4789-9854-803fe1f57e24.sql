-- Create requested_schools table for user-submitted schools from "Add Your School" form
CREATE TABLE public.requested_schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  county TEXT,
  zip TEXT NOT NULL,
  country TEXT DEFAULT 'USA',
  school_level TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by_user_id UUID,
  is_approved BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.requested_schools ENABLE ROW LEVEL SECURITY;

-- Anyone can read requested schools
CREATE POLICY "Anyone can read requested schools"
ON public.requested_schools
FOR SELECT
USING (true);

-- Anyone can add requested schools
CREATE POLICY "Anyone can add requested schools"
ON public.requested_schools
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_requested_schools_created_at ON public.requested_schools(created_at DESC);
CREATE INDEX idx_requested_schools_state ON public.requested_schools(state);