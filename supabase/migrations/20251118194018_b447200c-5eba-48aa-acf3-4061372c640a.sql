-- Add goal tracking to nonprofits table
ALTER TABLE public.nonprofits ADD COLUMN IF NOT EXISTS goal_cents integer DEFAULT 150000;

-- Add comment explaining the goal field
COMMENT ON COLUMN public.nonprofits.goal_cents IS 'Fundraising goal for this nonprofit in cents (e.g., 150000 = $1,500)';
