-- Create table to store custom admin-set prices for product configurations
CREATE TABLE IF NOT EXISTS public.product_configuration_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_key TEXT NOT NULL,
  custom_price_cents INTEGER NOT NULL,
  configuration_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(product_id, variant_key)
);

-- Enable RLS
ALTER TABLE public.product_configuration_prices ENABLE ROW LEVEL SECURITY;

-- Anyone can read custom prices
CREATE POLICY "Anyone can read custom prices"
  ON public.product_configuration_prices
  FOR SELECT
  USING (true);

-- Only admins can manage custom prices
CREATE POLICY "Admins can manage custom prices"
  ON public.product_configuration_prices
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger to update updated_at
CREATE TRIGGER update_product_configuration_prices_updated_at
  BEFORE UPDATE ON public.product_configuration_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_product_config_prices_lookup 
  ON public.product_configuration_prices(product_id, variant_key);