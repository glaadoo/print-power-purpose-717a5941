-- Drop and recreate the function with proper search_path
DROP FUNCTION IF EXISTS increment_cause_raised(UUID, INTEGER);

CREATE OR REPLACE FUNCTION increment_cause_raised(cause_uuid UUID, amount INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE causes
  SET raised_cents = raised_cents + amount
  WHERE id = cause_uuid;
END;
$$;