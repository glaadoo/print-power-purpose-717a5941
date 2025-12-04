-- Add current_progress_cents to track progress toward next $777 milestone
ALTER TABLE public.nonprofits 
ADD COLUMN current_progress_cents integer NOT NULL DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.nonprofits.current_progress_cents IS 'Tracks progress in cents toward the next $777 milestone. Resets to 0 when milestone is achieved.';