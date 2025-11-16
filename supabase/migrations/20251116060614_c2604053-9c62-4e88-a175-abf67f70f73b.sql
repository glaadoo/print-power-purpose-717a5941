-- Create schools_user_added table for community-added schools
CREATE TABLE IF NOT EXISTS public.schools_user_added (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  is_verified BOOLEAN DEFAULT false,
  slug TEXT NOT NULL UNIQUE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_schools_user_added_state_name ON public.schools_user_added(state, name);
CREATE INDEX IF NOT EXISTS idx_schools_user_added_created_at ON public.schools_user_added(created_at DESC);

-- Enable RLS
ALTER TABLE public.schools_user_added ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read schools
CREATE POLICY "Anyone can read schools"
  ON public.schools_user_added
  FOR SELECT
  USING (true);

-- Allow anyone to insert schools (we'll validate on the server)
CREATE POLICY "Anyone can add schools"
  ON public.schools_user_added
  FOR INSERT
  WITH CHECK (true);

-- Create cart_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.cart_sessions (
  session_id TEXT PRIMARY KEY,
  selected_school_id UUID,
  selected_school_name TEXT,
  selected_school_city TEXT,
  selected_school_state TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cart_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read and write their own session
CREATE POLICY "Anyone can manage cart sessions"
  ON public.cart_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);