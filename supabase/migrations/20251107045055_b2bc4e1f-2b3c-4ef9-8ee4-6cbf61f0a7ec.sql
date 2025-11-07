-- Enable realtime for causes table
ALTER TABLE causes REPLICA IDENTITY FULL;

-- The table is already in the supabase_realtime publication by default
-- But let's ensure it's there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'causes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE causes;
  END IF;
END $$;