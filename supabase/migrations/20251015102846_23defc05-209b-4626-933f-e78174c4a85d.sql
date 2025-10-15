-- Create a simpler trigger approach that works with Supabase
-- First, create a function that will be called after profile creation
CREATE OR REPLACE FUNCTION public.trigger_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_email text;
  function_url text;
  service_key text;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.id;

  -- Get environment variables
  function_url := 'https://wgohndthjgeqamfuldov.supabase.co/functions/v1/send-welcome-email';
  service_key := current_setting('app.settings.service_role_key', true);

  -- Call edge function via pg_net extension
  PERFORM
    net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object(
        'email', user_email,
        'firstName', NEW.first_name,
        'lastName', NEW.last_name
      )
    );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the insert
  RAISE WARNING 'Failed to send welcome email: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_profile_created_send_welcome ON public.profiles;

-- Create trigger on profile insert
CREATE TRIGGER on_profile_created_send_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_welcome_email();