-- Add search_name column for fast prefix searching
ALTER TABLE nonprofits 
ADD COLUMN IF NOT EXISTS search_name TEXT GENERATED ALWAYS AS (lower(trim(name))) STORED;

-- Create index on search_name for fast prefix lookups
CREATE INDEX IF NOT EXISTS idx_nonprofits_search_name_prefix ON nonprofits (search_name text_pattern_ops);

-- Create index on approved for filtering
CREATE INDEX IF NOT EXISTS idx_nonprofits_approved ON nonprofits (approved) WHERE approved = true;