-- Add pinned column to kenzie_sessions table
ALTER TABLE public.kenzie_sessions 
ADD COLUMN pinned BOOLEAN DEFAULT false;