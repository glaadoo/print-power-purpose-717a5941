-- Add payment_mode column to orders table to track test vs live transactions
ALTER TABLE orders ADD COLUMN payment_mode text DEFAULT 'test' CHECK (payment_mode IN ('test', 'live'));

-- Add index for better query performance
CREATE INDEX idx_orders_payment_mode ON orders(payment_mode);

-- Add comment for documentation
COMMENT ON COLUMN orders.payment_mode IS 'Indicates whether this order was created in test or live mode';