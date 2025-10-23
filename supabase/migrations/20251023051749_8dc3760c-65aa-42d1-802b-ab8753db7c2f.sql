-- Add performance indexes for orders table
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_cause_id ON orders(cause_id);

-- Add performance indexes for donations table
CREATE INDEX IF NOT EXISTS idx_donations_cause_id ON donations(cause_id);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_customer_email ON donations(customer_email);

-- Add performance indexes for causes table
CREATE INDEX IF NOT EXISTS idx_causes_raised_cents ON causes(raised_cents);

-- Add performance indexes for story_requests table
CREATE INDEX IF NOT EXISTS idx_story_requests_cause_id ON story_requests(cause_id);
CREATE INDEX IF NOT EXISTS idx_story_requests_status ON story_requests(status);

-- Add performance indexes for error_logs table
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);