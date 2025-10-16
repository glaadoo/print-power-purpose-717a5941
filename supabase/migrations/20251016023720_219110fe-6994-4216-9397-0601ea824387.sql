-- Create donations table to track individual donation transactions
CREATE TABLE public.donations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  cause_id UUID REFERENCES public.causes(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  customer_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Users can view their own donations
CREATE POLICY "users_view_own_donations"
ON public.donations
FOR SELECT
USING (
  (auth.jwt() ->> 'email'::text) IS NOT NULL 
  AND customer_email = (auth.jwt() ->> 'email'::text)
);

-- Service role has full access (for webhooks)
CREATE POLICY "service_role_full_access_donations"
ON public.donations
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_donations_order_id ON public.donations(order_id);
CREATE INDEX idx_donations_cause_id ON public.donations(cause_id);
CREATE INDEX idx_donations_customer_email ON public.donations(customer_email);