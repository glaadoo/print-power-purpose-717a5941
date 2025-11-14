-- Add pricing_data column to store Sinalite pricing combinations
ALTER TABLE products ADD COLUMN IF NOT EXISTS pricing_data jsonb DEFAULT '[]'::jsonb;

-- Add vendor_product_id to help identify products across syncs
ALTER TABLE products ADD COLUMN IF NOT EXISTS vendor_product_id text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_vendor_product_id ON products(vendor, vendor_product_id);