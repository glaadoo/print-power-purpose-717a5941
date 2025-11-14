-- Add price override field to products table
ALTER TABLE products 
ADD COLUMN price_override_cents integer;

-- Add comment explaining the field
COMMENT ON COLUMN products.price_override_cents IS 'Admin-overridden price in cents. When set, this takes priority over base_cost_cents for display pricing.';