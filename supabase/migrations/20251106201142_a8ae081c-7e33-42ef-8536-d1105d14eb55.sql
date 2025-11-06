-- Create contact_inquiries table
CREATE TABLE IF NOT EXISTS public.contact_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'responded')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert contact inquiries
CREATE POLICY "Anyone can submit contact inquiries"
  ON public.contact_inquiries
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Only authenticated users can view contact inquiries
CREATE POLICY "Authenticated users can view contact inquiries"
  ON public.contact_inquiries
  FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can update contact inquiries
CREATE POLICY "Authenticated users can update contact inquiries"
  ON public.contact_inquiries
  FOR UPDATE
  TO authenticated
  USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_contact_inquiries_updated_at
  BEFORE UPDATE ON public.contact_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_contact_inquiries_created_at ON public.contact_inquiries(created_at DESC);
CREATE INDEX idx_contact_inquiries_status ON public.contact_inquiries(status);
CREATE INDEX idx_contact_inquiries_email ON public.contact_inquiries(email);