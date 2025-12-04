-- Update get_top_donors to count milestones from orders where amount >= $1554
CREATE OR REPLACE FUNCTION public.get_top_donors(limit_count integer DEFAULT 10)
 RETURNS TABLE(donor_display_name text, total_donated_cents bigint, donation_count bigint, highest_tier text, rank bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH donor_stats AS (
    SELECT 
      customer_email,
      COALESCE(SUM(donation_cents), 0) as total_donated,
      COUNT(*) as order_count,
      -- Count milestones: orders where amount_total_cents >= 155400 ($1,554)
      COUNT(*) FILTER (WHERE amount_total_cents >= 155400) as milestones_count
    FROM orders
    WHERE customer_email IS NOT NULL
      AND status IN ('paid', 'completed')
    GROUP BY customer_email
    HAVING COUNT(*) FILTER (WHERE amount_total_cents >= 155400) > 0
       OR COALESCE(SUM(donation_cents), 0) > 0
  )
  SELECT 
    CASE 
      WHEN customer_email IS NOT NULL AND length(customer_email) > 2 
      THEN upper(substring(customer_email from 1 for 2)) || '***'
      ELSE 'Anonymous'
    END as donor_display_name,
    total_donated as total_donated_cents,
    milestones_count as donation_count, -- Repurpose this field for milestones
    CASE
      WHEN milestones_count >= 20 THEN 'diamond'
      WHEN milestones_count >= 10 THEN 'platinum'
      WHEN milestones_count >= 5 THEN 'gold'
      WHEN milestones_count >= 3 THEN 'silver'
      WHEN milestones_count >= 1 THEN 'bronze'
      ELSE NULL
    END as highest_tier,
    ROW_NUMBER() OVER (ORDER BY milestones_count DESC, total_donated DESC) as rank
  FROM donor_stats
  ORDER BY milestones_count DESC, total_donated DESC
  LIMIT limit_count;
$function$;