-- Add indexes to improve products query performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Add a composite index for the common query pattern (category + name ordering)
CREATE INDEX IF NOT EXISTS idx_products_category_name ON products(category, name);