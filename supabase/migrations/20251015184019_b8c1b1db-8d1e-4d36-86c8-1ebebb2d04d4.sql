-- Create tables for Kenzie chat if they don't exist
CREATE TABLE IF NOT EXISTS public.kenzie_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kenzie_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.kenzie_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kenzie_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kenzie_messages ENABLE ROW LEVEL SECURITY;

-- Create policies to allow anyone to create and read sessions/messages
-- This is appropriate for a public chat feature
CREATE POLICY "Anyone can create sessions"
  ON public.kenzie_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read their session"
  ON public.kenzie_sessions
  FOR SELECT
  TO anon, authenticated
  USING (id = public.ppp_session_id());

CREATE POLICY "Anyone can create messages in their session"
  ON public.kenzie_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (session_id = public.ppp_session_id());

CREATE POLICY "Anyone can read messages from their session"
  ON public.kenzie_messages
  FOR SELECT
  TO anon, authenticated
  USING (session_id = public.ppp_session_id());

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_kenzie_messages_session_id ON public.kenzie_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_kenzie_messages_created_at ON public.kenzie_messages(created_at);