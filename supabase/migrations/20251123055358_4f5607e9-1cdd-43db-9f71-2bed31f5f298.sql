-- Add verified_purchase column to reviews
ALTER TABLE public.reviews
ADD COLUMN verified_purchase BOOLEAN DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX idx_reviews_verified_purchase ON public.reviews(verified_purchase);

-- Create function to check if user purchased product
CREATE OR REPLACE FUNCTION public.check_verified_purchase(p_user_id UUID, p_product_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  has_purchased BOOLEAN;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = p_user_id;
  
  IF user_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has an order containing this product
  SELECT EXISTS (
    SELECT 1
    FROM orders
    WHERE customer_email = user_email
      AND status = 'completed'
      AND (
        -- Check in items jsonb array for product_id
        items::text LIKE '%' || p_product_id || '%'
      )
  ) INTO has_purchased;
  
  RETURN has_purchased;
END;
$$;