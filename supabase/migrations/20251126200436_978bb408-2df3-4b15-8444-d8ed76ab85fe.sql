-- Fix search_path for video metadata trigger function
CREATE OR REPLACE FUNCTION update_video_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public';