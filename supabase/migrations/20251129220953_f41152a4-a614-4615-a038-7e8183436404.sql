-- Create function to get top donors for leaderboard (anonymized for privacy)
CREATE OR REPLACE FUNCTION public.get_top_donors(limit_count integer DEFAULT 10)
RETURNS TABLE(
  donor_display_name text,
  total_donated_cents bigint,
  donation_count bigint,
  milestone_reached boolean,
  rank bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Anonymize email: show first 2 chars + '***' for privacy
    CASE 
      WHEN customer_email IS NOT NULL AND length(customer_email) > 2 
      THEN upper(substring(customer_email from 1 for 2)) || '***'
      ELSE 'Anonymous'
    END as donor_display_name,
    COALESCE(SUM(amount_cents), 0) as total_donated_cents,
    COUNT(*) as donation_count,
    COALESCE(SUM(amount_cents), 0) >= 77700 as milestone_reached,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(amount_cents), 0) DESC) as rank
  FROM donations
  WHERE customer_email IS NOT NULL
  GROUP BY customer_email
  HAVING COALESCE(SUM(amount_cents), 0) > 0
  ORDER BY total_donated_cents DESC
  LIMIT limit_count;
$$;