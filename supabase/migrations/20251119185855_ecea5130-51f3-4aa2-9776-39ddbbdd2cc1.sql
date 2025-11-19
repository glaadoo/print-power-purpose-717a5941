-- Create pricing_settings table for global markup configuration
CREATE TABLE IF NOT EXISTS public.pricing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor text NOT NULL UNIQUE,
  markup_mode text NOT NULL CHECK (markup_mode IN ('fixed', 'percent')),
  markup_fixed_cents integer NOT NULL DEFAULT 0,
  markup_percent numeric NOT NULL DEFAULT 0,
  nonprofit_share_mode text NOT NULL CHECK (nonprofit_share_mode IN ('fixed', 'percent_of_markup')),
  nonprofit_fixed_cents integer NOT NULL DEFAULT 0,
  nonprofit_percent_of_markup numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read pricing settings
CREATE POLICY "Anyone can read pricing settings"
  ON public.pricing_settings
  FOR SELECT
  USING (true);

-- Only admins can update pricing settings
CREATE POLICY "Admins can update pricing settings"
  ON public.pricing_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default SinaLite pricing settings
INSERT INTO public.pricing_settings (
  vendor,
  markup_mode,
  markup_fixed_cents,
  markup_percent,
  nonprofit_share_mode,
  nonprofit_fixed_cents,
  nonprofit_percent_of_markup,
  currency
) VALUES (
  'sinalite',
  'fixed',
  1500,  -- $15 markup
  0,
  'fixed',
  1000,  -- $10 to nonprofit
  0,
  'USD'
) ON CONFLICT (vendor) DO NOTHING;

-- Create trigger to update updated_at
CREATE TRIGGER update_pricing_settings_updated_at
  BEFORE UPDATE ON public.pricing_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();