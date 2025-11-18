-- Add full-text search column to schools_user_added
ALTER TABLE schools_user_added 
ADD COLUMN IF NOT EXISTS search_vector tsvector 
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(city, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(state, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(zip, '')), 'C')
) STORED;

-- Create index for full-text search
CREATE INDEX IF NOT EXISTS schools_search_idx ON schools_user_added USING gin(search_vector);

-- Create index for regular text search as fallback
CREATE INDEX IF NOT EXISTS schools_name_trgm_idx ON schools_user_added USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS schools_city_idx ON schools_user_added(city);
CREATE INDEX IF NOT EXISTS schools_state_idx ON schools_user_added(state);
CREATE INDEX IF NOT EXISTS schools_zip_idx ON schools_user_added(zip);