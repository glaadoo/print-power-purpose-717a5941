-- Create categories table for pre-defined product categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Public read access for active categories
CREATE POLICY "Anyone can read active categories"
  ON public.categories
  FOR SELECT
  USING (is_active = true);

-- Admins can manage categories
CREATE POLICY "Admins can manage categories"
  ON public.categories
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index on display_order for faster sorting
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON public.categories(display_order);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories from existing product data
INSERT INTO public.categories (name, slug, display_order, is_active)
SELECT DISTINCT 
  category as name,
  lower(regexp_replace(category, '[^a-zA-Z0-9]+', '-', 'g')) as slug,
  ROW_NUMBER() OVER (ORDER BY category) as display_order,
  true as is_active
FROM public.products
WHERE category IS NOT NULL 
  AND category != ''
  AND is_active = true
ON CONFLICT (name) DO NOTHING;