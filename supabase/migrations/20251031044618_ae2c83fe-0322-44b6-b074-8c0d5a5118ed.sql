-- Add video_url and milestone_amount to story_requests
ALTER TABLE story_requests 
ADD COLUMN video_url text,
ADD COLUMN milestone_amount integer;

-- Create a function to check if a new donation crosses a $777 milestone
CREATE OR REPLACE FUNCTION check_donation_milestone()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on donations table
CREATE TRIGGER donation_milestone_trigger
AFTER INSERT ON donations
FOR EACH ROW
EXECUTE FUNCTION check_donation_milestone();

-- Enable realtime for story_requests so the admin page updates automatically
ALTER PUBLICATION supabase_realtime ADD TABLE story_requests;