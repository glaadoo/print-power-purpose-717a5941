-- Fix admin_sessions RLS policy to prevent public token exposure
DROP POLICY IF EXISTS "service_role_can_manage_admin_sessions" ON public.admin_sessions;

CREATE POLICY "service_role_only_admin_sessions"
ON public.admin_sessions
FOR ALL
USING (auth.role() = 'service_role');

-- Fix contact_inquiries overly permissive read policy
DROP POLICY IF EXISTS "Authenticated users can view contact inquiries" ON public.contact_inquiries;

-- Clean up expired admin sessions
DELETE FROM public.admin_sessions WHERE expires_at < NOW();