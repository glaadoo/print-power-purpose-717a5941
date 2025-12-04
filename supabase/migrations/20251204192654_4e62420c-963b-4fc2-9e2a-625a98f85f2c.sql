-- Mark products with missing/empty images as inactive
-- This ensures they won't appear on customer-facing pages
UPDATE public.products
SET is_active = false
WHERE image_url IS NULL
   OR TRIM(image_url) = '';