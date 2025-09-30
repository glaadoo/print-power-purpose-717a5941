-- Create a function to increment cause raised_cents safely
CREATE OR REPLACE FUNCTION increment_cause_raised(cause_uuid UUID, amount INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE causes
  SET raised_cents = raised_cents + amount
  WHERE id = cause_uuid;
END;
$$;