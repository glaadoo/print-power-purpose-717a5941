-- Update the check_donation_milestone trigger to handle nonprofit donations (no cause_id)
CREATE OR REPLACE FUNCTION public.check_donation_milestone()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  previous_total integer;
  new_total integer;
  previous_milestone integer;
  new_milestone integer;
BEGIN
  -- Get the total before this donation for this customer
  SELECT COALESCE(SUM(amount_cents), 0) INTO previous_total
  FROM donations
  WHERE customer_email = NEW.customer_email
    AND id != NEW.id;
  
  -- Calculate new total
  new_total := previous_total + NEW.amount_cents;
  
  -- Calculate which $777 milestone we were at and are at now
  previous_milestone := (previous_total / 77700) * 77700;
  new_milestone := (new_total / 77700) * 77700;
  
  -- If we crossed a milestone AND we have a cause_id, create a story request
  -- Skip story_requests for nonprofit-only donations (no cause_id)
  IF new_milestone > previous_milestone AND NEW.cause_id IS NOT NULL THEN
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
$function$;