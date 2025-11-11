-- Add tags, impact metrics, and logo fields to nonprofits table
ALTER TABLE public.nonprofits
ADD COLUMN tags text[] DEFAULT '{}',
ADD COLUMN impact_metrics jsonb DEFAULT '{}',
ADD COLUMN logo_url text;

-- Create index on tags for better search performance
CREATE INDEX idx_nonprofits_tags ON public.nonprofits USING GIN(tags);

-- Add helpful comment
COMMENT ON COLUMN public.nonprofits.tags IS 'Categories/focus areas: education, healthcare, environment, etc.';
COMMENT ON COLUMN public.nonprofits.impact_metrics IS 'JSON object storing impact data like people_helped, projects_completed, etc.';