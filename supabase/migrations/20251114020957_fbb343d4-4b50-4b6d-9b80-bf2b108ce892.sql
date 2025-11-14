-- CRITICAL SECURITY FIX: Restrict public access to sensitive customer data (CORRECTED)

-- 1. DONATIONS TABLE: Block public access to customer emails and donation data
DROP POLICY IF EXISTS "Anyone can view donations" ON public.donations;
DROP POLICY IF EXISTS "Users can view their own donations" ON public.donations;

CREATE POLICY "Users can view their own donations"
ON public.donations
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'email') = customer_email 
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 2. ORDERS TABLE: Block public access to customer purchase history
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'email') = customer_email 
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 3. CONTACT_INQUIRIES TABLE: Block public access to contact form submissions
DROP POLICY IF EXISTS "Block public access to contact inquiries" ON public.contact_inquiries;

CREATE POLICY "Block public access to contact inquiries"
ON public.contact_inquiries
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- 4. PROFILES TABLE: Ensure no anonymous access to user addresses and phone numbers
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;

CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id 
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 5. USER_PREFERENCES TABLE: Block public access (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_preferences') THEN
    DROP POLICY IF EXISTS "Users can only view their own preferences" ON public.user_preferences;
    
    EXECUTE 'CREATE POLICY "Users can only view their own preferences"
    ON public.user_preferences
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id)';
  END IF;
END $$;

-- 6. STORY_REQUESTS TABLE: Restrict metadata access
DROP POLICY IF EXISTS "Block public access to story requests" ON public.story_requests;

CREATE POLICY "Block public access to story requests"
ON public.story_requests
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Verify RLS is enabled on all sensitive tables
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_requests ENABLE ROW LEVEL SECURITY;