-- Fix security warning: Set search_path for the new function
CREATE OR REPLACE FUNCTION public.update_nonprofit_indexed_name()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.indexed_name := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9\s]', '', 'g'));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;