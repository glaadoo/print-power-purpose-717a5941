-- Add helpful counts to reviews table
ALTER TABLE public.reviews
ADD COLUMN helpful_count INTEGER DEFAULT 0,
ADD COLUMN not_helpful_count INTEGER DEFAULT 0;

-- Create review_votes table to track user votes
CREATE TABLE public.review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('helpful', 'not_helpful')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Enable RLS
ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read votes (for counting)
CREATE POLICY "Anyone can read review votes"
ON public.review_votes
FOR SELECT
USING (true);

-- Allow authenticated users to vote
CREATE POLICY "Authenticated users can vote on reviews"
ON public.review_votes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own votes
CREATE POLICY "Users can update their own votes"
ON public.review_votes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own votes
CREATE POLICY "Users can delete their own votes"
ON public.review_votes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_review_votes_review_id ON public.review_votes(review_id);
CREATE INDEX idx_review_votes_user_id ON public.review_votes(user_id);

-- Create function to update review helpful counts
CREATE OR REPLACE FUNCTION public.update_review_helpful_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update helpful count for the review
  UPDATE reviews
  SET 
    helpful_count = (
      SELECT COUNT(*) 
      FROM review_votes 
      WHERE review_id = COALESCE(NEW.review_id, OLD.review_id) 
        AND vote_type = 'helpful'
    ),
    not_helpful_count = (
      SELECT COUNT(*) 
      FROM review_votes 
      WHERE review_id = COALESCE(NEW.review_id, OLD.review_id) 
        AND vote_type = 'not_helpful'
    )
  WHERE id = COALESCE(NEW.review_id, OLD.review_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for automatic count updates
CREATE TRIGGER update_review_counts_on_insert
  AFTER INSERT ON public.review_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_review_helpful_counts();

CREATE TRIGGER update_review_counts_on_update
  AFTER UPDATE ON public.review_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_review_helpful_counts();

CREATE TRIGGER update_review_counts_on_delete
  AFTER DELETE ON public.review_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_review_helpful_counts();