-- Create order_sequences table for clean order numbering
CREATE TABLE IF NOT EXISTS public.order_sequences (
  year INTEGER PRIMARY KEY,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add new fields to orders table for clean order system
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS sinalite_order_id TEXT,
  ADD COLUMN IF NOT EXISTS subtotal_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- Add new pricing fields to products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS markup_fixed_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS markup_percent NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create product_variants table
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_variant_id TEXT NOT NULL,
  label TEXT NOT NULL,
  base_price_cents INTEGER NOT NULL,
  markup_fixed_cents INTEGER,
  markup_percent NUMERIC(5,2),
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index on product_variants
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_vendor_variant_id ON public.product_variants(vendor_variant_id);

-- Function to generate next order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  current_year INTEGER;
  next_sequence INTEGER;
  order_num TEXT;
BEGIN
  -- Get current year
  current_year := EXTRACT(YEAR FROM CURRENT_TIMESTAMP);
  
  -- Get and increment sequence for this year
  INSERT INTO public.order_sequences (year, last_sequence)
  VALUES (current_year, 1)
  ON CONFLICT (year) 
  DO UPDATE SET 
    last_sequence = order_sequences.last_sequence + 1,
    updated_at = now()
  RETURNING last_sequence INTO next_sequence;
  
  -- Format as PPP-YYYY-NNNNNN
  order_num := 'PPP-' || current_year::TEXT || '-' || LPAD(next_sequence::TEXT, 6, '0');
  
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- RLS policies for order_sequences
ALTER TABLE public.order_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_sequences" ON public.order_sequences
  FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for product_variants
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for product variants" ON public.product_variants
  FOR SELECT USING (is_active = true);

CREATE POLICY "admins_can_manage_product_variants" ON public.product_variants
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));