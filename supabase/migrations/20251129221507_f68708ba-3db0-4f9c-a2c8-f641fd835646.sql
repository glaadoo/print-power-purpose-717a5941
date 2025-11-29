-- Update function to support multiple milestone tiers
DROP FUNCTION IF EXISTS public.get_top_donors(integer);

CREATE OR REPLACE FUNCTION public.get_top_donors(limit_count integer DEFAULT 10)
RETURNS TABLE(
  donor_display_name text,
  total_donated_cents bigint,
  donation_count bigint,
  highest_tier text,
  rank bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN customer_email IS NOT NULL AND length(customer_email) > 2 
      THEN upper(substring(customer_email from 1 for 2)) || '***'
      ELSE 'Anonymous'
    END as donor_display_name,
    COALESCE(SUM(amount_cents), 0) as total_donated_cents,
    COUNT(*) as donation_count,
    CASE
      WHEN COALESCE(SUM(amount_cents), 0) >= 100000 THEN 'diamond'
      WHEN COALESCE(SUM(amount_cents), 0) >= 77700 THEN 'platinum'
      WHEN COALESCE(SUM(amount_cents), 0) >= 50000 THEN 'gold'
      WHEN COALESCE(SUM(amount_cents), 0) >= 25000 THEN 'silver'
      WHEN COALESCE(SUM(amount_cents), 0) >= 10000 THEN 'bronze'
      ELSE NULL
    END as highest_tier,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(amount_cents), 0) DESC) as rank
  FROM donations
  WHERE customer_email IS NOT NULL
  GROUP BY customer_email
  HAVING COALESCE(SUM(amount_cents), 0) > 0
  ORDER BY total_donated_cents DESC
  LIMIT limit_count;
$$;