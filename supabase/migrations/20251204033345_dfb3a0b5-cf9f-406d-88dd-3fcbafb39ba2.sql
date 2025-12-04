-- Add milestone_count field to nonprofits table to track how many times $777 milestone was achieved
ALTER TABLE public.nonprofits 
ADD COLUMN IF NOT EXISTS milestone_count integer NOT NULL DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.nonprofits.milestone_count IS 'Number of times the nonprofit has achieved $777 milestone';