-- Add title column to kenzie_sessions
ALTER TABLE public.kenzie_sessions 
ADD COLUMN title TEXT DEFAULT 'New Conversation';