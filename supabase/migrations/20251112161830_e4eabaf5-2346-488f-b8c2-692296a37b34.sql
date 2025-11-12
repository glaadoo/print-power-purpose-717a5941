
-- Fix search_path for functions without it set

-- Update cleanup_old_system_logs function to set search_path
CREATE OR REPLACE FUNCTION public.cleanup_old_system_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  DELETE FROM system_logs
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$function$;

-- Update cleanup_expired_admin_sessions function to set search_path
CREATE OR REPLACE FUNCTION public.cleanup_expired_admin_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  DELETE FROM public.admin_sessions
  WHERE expires_at < NOW();
END;
$function$;
