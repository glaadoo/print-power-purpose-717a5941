-- Add column to store the variant key that produces the minimum price
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_price_variant_key text;

-- Update the specific product with the known minimum variant key
UPDATE products 
SET min_price_variant_key = '140-253-257-273-305-311-313'
WHERE id = 'c2b4711c-0d48-47a1-8b89-d5a0e6448547';