-- Phase 1: Extend database for nonprofit selection alongside causes

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_nonprofit_indexed_name ON public.nonprofits;
DROP FUNCTION IF EXISTS public.update_nonprofit_indexed_name();

-- Create nonprofits table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.nonprofits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add all columns if they don't exist
ALTER TABLE public.nonprofits 
ADD COLUMN IF NOT EXISTS ein TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US',
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'curated',
ADD COLUMN IF NOT EXISTS irs_status TEXT,
ADD COLUMN IF NOT EXISTS indexed_name TEXT,
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add unique constraint on EIN if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nonprofits_ein_key'
  ) THEN
    ALTER TABLE public.nonprofits ADD CONSTRAINT nonprofits_ein_key UNIQUE (ein);
  END IF;
END$$;

-- Update existing rows to have indexed_name
UPDATE public.nonprofits 
SET indexed_name = lower(regexp_replace(name, '[^a-zA-Z0-9\s]', '', 'g'))
WHERE indexed_name IS NULL OR indexed_name = '';

-- Create trigger function
CREATE OR REPLACE FUNCTION public.update_nonprofit_indexed_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.indexed_name := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9\s]', '', 'g'));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_nonprofit_indexed_name
BEFORE INSERT OR UPDATE ON public.nonprofits
FOR EACH ROW
EXECUTE FUNCTION public.update_nonprofit_indexed_name();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_nonprofits_indexed_name ON public.nonprofits(indexed_name);
CREATE INDEX IF NOT EXISTS idx_nonprofits_ein ON public.nonprofits(ein);
CREATE INDEX IF NOT EXISTS idx_nonprofits_state ON public.nonprofits(state);

-- Enable RLS
ALTER TABLE public.nonprofits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for nonprofits" ON public.nonprofits;
DROP POLICY IF EXISTS "admins_can_insert_nonprofits" ON public.nonprofits;
DROP POLICY IF EXISTS "admins_can_update_nonprofits" ON public.nonprofits;
DROP POLICY IF EXISTS "admins_can_delete_nonprofits" ON public.nonprofits;

-- Create RLS policies
CREATE POLICY "Public read access for nonprofits"
ON public.nonprofits FOR SELECT TO public USING (approved = true);

CREATE POLICY "admins_can_insert_nonprofits"
ON public.nonprofits FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_can_update_nonprofits"
ON public.nonprofits FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_can_delete_nonprofits"
ON public.nonprofits FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Add nonprofit columns to donations table
ALTER TABLE public.donations
ADD COLUMN IF NOT EXISTS nonprofit_id UUID REFERENCES public.nonprofits(id),
ADD COLUMN IF NOT EXISTS nonprofit_name TEXT,
ADD COLUMN IF NOT EXISTS nonprofit_ein TEXT;

-- Add nonprofit columns to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS nonprofit_id TEXT,
ADD COLUMN IF NOT EXISTS nonprofit_name TEXT,
ADD COLUMN IF NOT EXISTS nonprofit_ein TEXT;