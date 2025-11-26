-- Create function to compute nonprofit metrics (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_nonprofit_metrics()
RETURNS TABLE (
  nonprofit_id text,
  supporter_count bigint,
  total_raised_cents bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    nonprofit_id,
    COUNT(DISTINCT id) as supporter_count,
    COALESCE(SUM(donation_cents), 0) as total_raised_cents
  FROM orders
  WHERE nonprofit_id IS NOT NULL
    AND status IN ('paid', 'completed')
  GROUP BY nonprofit_id;
$$;