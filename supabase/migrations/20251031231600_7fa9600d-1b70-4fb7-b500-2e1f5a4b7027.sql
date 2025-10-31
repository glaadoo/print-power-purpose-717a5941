-- Create trigger to update cause raised_cents when donation is inserted
CREATE OR REPLACE FUNCTION public.update_cause_raised_on_donation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update if cause_id is not null
  IF NEW.cause_id IS NOT NULL THEN
    UPDATE causes
    SET raised_cents = raised_cents + NEW.amount_cents
    WHERE id = NEW.cause_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on donations table
DROP TRIGGER IF EXISTS trigger_update_cause_raised ON donations;
CREATE TRIGGER trigger_update_cause_raised
AFTER INSERT ON donations
FOR EACH ROW
EXECUTE FUNCTION update_cause_raised_on_donation();

-- Update existing donations to link to their causes and update raised amounts
-- This will backfill the raised_cents for causes based on existing donations
UPDATE causes c
SET raised_cents = COALESCE((
  SELECT SUM(d.amount_cents)
  FROM donations d
  WHERE d.cause_id = c.id
), 0)
WHERE c.id IN (SELECT DISTINCT cause_id FROM donations WHERE cause_id IS NOT NULL);