-- Fix search path for the check_donation_milestone function (drop trigger first)
DROP TRIGGER IF EXISTS donation_milestone_trigger ON donations;
DROP FUNCTION IF EXISTS check_donation_milestone();

CREATE OR REPLACE FUNCTION check_donation_milestone()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  previous_total integer;
  new_total integer;
  previous_milestone integer;
  new_milestone integer;
BEGIN
  -- Get the total before this donation
  SELECT COALESCE(SUM(amount_cents), 0) INTO previous_total
  FROM donations
  WHERE id != NEW.id;
  
  -- Calculate new total
  new_total := previous_total + NEW.amount_cents;
  
  -- Calculate which $777 milestone we were at and are at now
  previous_milestone := (previous_total / 77700) * 77700;
  new_milestone := (new_total / 77700) * 77700;
  
  -- If we crossed a milestone, create a story request
  IF new_milestone > previous_milestone THEN
    INSERT INTO story_requests (
      cause_id,
      contact_email,
      status,
      notes,
      milestone_amount
    )
    VALUES (
      NEW.cause_id,
      NEW.customer_email,
      'pending',
      'Milestone donation: Customer donation crossed $' || (new_milestone / 100)::text || ' milestone',
      new_milestone
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER donation_milestone_trigger
AFTER INSERT ON donations
FOR EACH ROW
EXECUTE FUNCTION check_donation_milestone();