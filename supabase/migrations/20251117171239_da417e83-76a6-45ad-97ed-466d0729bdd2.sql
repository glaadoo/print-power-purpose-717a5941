-- Fix search_path for generate_order_number function
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year INTEGER;
  next_sequence INTEGER;
  order_num TEXT;
BEGIN
  -- Get current year
  current_year := EXTRACT(YEAR FROM CURRENT_TIMESTAMP);
  
  -- Get and increment sequence for this year
  INSERT INTO public.order_sequences (year, last_sequence)
  VALUES (current_year, 1)
  ON CONFLICT (year) 
  DO UPDATE SET 
    last_sequence = order_sequences.last_sequence + 1,
    updated_at = now()
  RETURNING last_sequence INTO next_sequence;
  
  -- Format as PPP-YYYY-NNNNNN
  order_num := 'PPP-' || current_year::TEXT || '-' || LPAD(next_sequence::TEXT, 6, '0');
  
  RETURN order_num;
END;
$$;