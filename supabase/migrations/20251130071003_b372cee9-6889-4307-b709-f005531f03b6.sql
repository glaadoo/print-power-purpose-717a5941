-- Add min_price_cents column for storing minimum configuration price
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS min_price_cents integer;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_products_min_price_cents ON public.products(min_price_cents);

-- Add comment for documentation
COMMENT ON COLUMN public.products.min_price_cents IS 'Minimum price across all configuration combinations for this product';