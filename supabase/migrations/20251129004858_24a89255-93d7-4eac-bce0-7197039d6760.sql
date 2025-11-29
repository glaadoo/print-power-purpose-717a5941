-- Add vendor fulfillment fields to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS vendor_key TEXT,
ADD COLUMN IF NOT EXISTS vendor_name TEXT,
ADD COLUMN IF NOT EXISTS vendor_order_id TEXT,
ADD COLUMN IF NOT EXISTS vendor_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS vendor_exported_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS vendor_error_message TEXT;

-- Create index for vendor status filtering
CREATE INDEX IF NOT EXISTS idx_orders_vendor_status ON public.orders(vendor_status);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_key ON public.orders(vendor_key);

-- Add comment for documentation
COMMENT ON COLUMN public.orders.vendor_key IS 'Vendor identifier: sinalite, scalablepress, psrestful, etc.';
COMMENT ON COLUMN public.orders.vendor_status IS 'Status: pending, submitted, emailed_vendor, pending_manual, exported_manual, error';