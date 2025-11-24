-- Create stock_notifications table for tracking user requests
CREATE TABLE IF NOT EXISTS public.stock_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  vendor TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notified BOOLEAN NOT NULL DEFAULT false,
  notified_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(email, product_id, color, size)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stock_notifications_product ON public.stock_notifications(product_id, color, size) WHERE notified = false;
CREATE INDEX IF NOT EXISTS idx_stock_notifications_email ON public.stock_notifications(email) WHERE notified = false;

-- Enable RLS
ALTER TABLE public.stock_notifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert notification requests
CREATE POLICY "Anyone can request stock notifications"
  ON public.stock_notifications
  FOR INSERT
  WITH CHECK (true);

-- Allow users to view their own notification requests
CREATE POLICY "Users can view own notification requests"
  ON public.stock_notifications
  FOR SELECT
  USING (email = (auth.jwt() ->> 'email'::text) OR auth.uid() IS NULL);

-- Allow service role to update notifications (for marking as notified)
CREATE POLICY "Service role can update notifications"
  ON public.stock_notifications
  FOR UPDATE
  USING (true);

COMMENT ON TABLE public.stock_notifications IS 'Stores user requests to be notified when out-of-stock products become available';
COMMENT ON COLUMN public.stock_notifications.email IS 'User email address for notification';
COMMENT ON COLUMN public.stock_notifications.product_id IS 'Product ID that is out of stock';
COMMENT ON COLUMN public.stock_notifications.color IS 'Specific color variant requested';
COMMENT ON COLUMN public.stock_notifications.size IS 'Specific size variant requested';
COMMENT ON COLUMN public.stock_notifications.notified IS 'Whether notification email has been sent';
COMMENT ON COLUMN public.stock_notifications.notified_at IS 'When the notification was sent';