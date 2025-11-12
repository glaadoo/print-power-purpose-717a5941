-- Add description column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS description text;

-- Add comment for documentation
COMMENT ON COLUMN public.products.description IS 'Product description from vendor API';