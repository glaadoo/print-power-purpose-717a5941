-- Create trigger to update cause raised_cents when donation is inserted
CREATE TRIGGER on_donation_insert
  AFTER INSERT ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cause_raised_on_donation();

-- Enable realtime for causes table with full replica identity
ALTER TABLE public.causes REPLICA IDENTITY FULL;

-- Add causes table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.causes;