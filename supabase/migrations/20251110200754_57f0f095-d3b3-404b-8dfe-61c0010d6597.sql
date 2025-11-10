-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create help_articles table
CREATE TABLE IF NOT EXISTS public.help_articles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('faq', 'topic', 'action')),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text NOT NULL,
  body text NOT NULL,
  keywords text[] DEFAULT '{}',
  requires_auth boolean DEFAULT false,
  href text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  active boolean DEFAULT true
);

-- Create GIN index for keywords array search
CREATE INDEX IF NOT EXISTS idx_help_articles_keywords ON public.help_articles USING GIN(keywords);

-- Create index for full-text search on title and body
CREATE INDEX IF NOT EXISTS idx_help_articles_title_trgm ON public.help_articles USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_help_articles_body_trgm ON public.help_articles USING GIN(body gin_trgm_ops);

-- Create index for active articles
CREATE INDEX IF NOT EXISTS idx_help_articles_active ON public.help_articles(active) WHERE active = true;

-- Create help_synonyms table
CREATE TABLE IF NOT EXISTS public.help_synonyms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  term text NOT NULL,
  synonyms text[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_help_synonyms_term ON public.help_synonyms(term);

-- Create help_search_logs table
CREATE TABLE IF NOT EXISTS public.help_search_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  q text NOT NULL,
  results_count int NOT NULL DEFAULT 0,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  client_ts timestamptz,
  ip_hash text
);

CREATE INDEX IF NOT EXISTS idx_help_search_logs_created_at ON public.help_search_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_help_search_logs_q ON public.help_search_logs(q);

-- Enable Row Level Security
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_search_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for help_articles (public read)
CREATE POLICY "Anyone can read active help articles"
  ON public.help_articles
  FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage help articles"
  ON public.help_articles
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for help_synonyms (public read)
CREATE POLICY "Anyone can read help synonyms"
  ON public.help_synonyms
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage help synonyms"
  ON public.help_synonyms
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for help_search_logs (service role insert only)
CREATE POLICY "Service role can insert search logs"
  ON public.help_search_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view search logs"
  ON public.help_search_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed initial FAQ articles
INSERT INTO public.help_articles (type, title, slug, excerpt, body, keywords, requires_auth, href) VALUES
('faq', 'How do I check my order status?', 'check-order-status', 'Track your order and see its current status.', 'You can check your order status by logging into your account and viewing your order history. If you purchased as a guest, check your email for the order confirmation with a tracking link.', ARRAY['orders', 'tracking', 'status', 'check', 'where'], false, '/help#orders'),
('faq', 'Can I edit or cancel my order?', 'edit-cancel-order', 'Learn how to modify or cancel your order.', 'Orders can be cancelled within 24 hours of placement. After that, production begins and cancellation is no longer possible. Contact support@printpowerpurpose.com if you need to cancel within this window.', ARRAY['orders', 'cancel', 'edit', 'modify', 'change'], false, '/help#orders'),
('faq', 'How do refunds work?', 'refunds', 'Understanding our refund policy.', 'Refunds are processed within 5-7 business days to your original payment method. You will receive an email confirmation once the refund has been initiated.', ARRAY['refund', 'money', 'return', 'payment'], false, '/help#orders'),
('faq', 'Where is my receipt?', 'receipt', 'Find your order receipt and donation confirmation.', 'Your receipt is automatically sent to your email after purchase. Check your spam folder if you don''t see it. You can also find receipts in your account order history.', ARRAY['receipt', 'email', 'confirmation', 'invoice'], false, '/help#orders'),
('faq', 'When will my donation post to the cause?', 'donation-posting', 'Learn when donations appear on cause pages.', 'Donations typically post to the cause barometer within 24-48 hours of order completion. This allows time for payment processing and verification.', ARRAY['donation', 'cause', 'barometer', 'timing', 'when'], false, '/help#donations'),
('faq', 'What products do you offer?', 'products-available', 'See our full range of custom products.', 'We offer custom apparel, accessories, and print products. Browse our full catalog at printpowerpurpose.com/products to see all available options.', ARRAY['products', 'items', 'catalog', 'what', 'sell'], false, '/products'),
('faq', 'How does the donation barometer work?', 'donation-barometer', 'Understanding how we track fundraising progress.', 'The donation barometer shows real-time progress toward each cause''s fundraising goal. Every purchase contributes to the selected cause, and you can watch the progress grow over time.', ARRAY['donation', 'barometer', 'progress', 'goal', 'fundraising'], false, '/causes');

-- Seed topic articles
INSERT INTO public.help_articles (type, title, slug, excerpt, body, keywords, requires_auth, href) VALUES
('topic', 'Orders & Payments', 'orders-payments', 'Everything about placing orders and payment methods.', 'Complete information about ordering, payment options, order tracking, cancellations, and refunds.', ARRAY['orders', 'payment', 'checkout', 'pay', 'purchase'], false, '/help#orders'),
('topic', 'Products & Causes', 'products-causes', 'Learn about our products and supported causes.', 'Information about available products, customization options, and the causes we support through your purchases.', ARRAY['products', 'causes', 'nonprofit', 'school', 'support'], false, '/help#products'),
('topic', 'Donations & Impact', 'donations-impact', 'How your purchase supports causes.', 'Details about how donations work, tracking your impact, and the milestone stories we share.', ARRAY['donation', 'impact', 'barometer', 'milestone', 'story'], false, '/help#donations'),
('topic', 'Account & Security', 'account-security', 'Managing your account and staying secure.', 'Information about account creation, login, password reset, and keeping your information secure.', ARRAY['account', 'login', 'password', 'security', 'profile'], false, '/help#account');

-- Seed action articles
INSERT INTO public.help_articles (type, title, slug, excerpt, body, keywords, requires_auth, href) VALUES
('action', 'View my orders', 'view-orders', 'Check your order history and status.', 'View all your past and current orders, track shipments, and download receipts.', ARRAY['orders', 'history', 'view', 'my'], true, '/welcome'),
('action', 'Start a return', 'start-return', 'Begin the return process for your order.', 'Initiate a return request for eligible items within our return window.', ARRAY['return', 'refund', 'send back'], true, '/help#returns'),
('action', 'Contact support', 'contact-support', 'Get help from our support team.', 'Reach out to our support team via email for personalized assistance.', ARRAY['support', 'help', 'contact', 'email'], false, '/contact');

-- Seed common synonyms
INSERT INTO public.help_synonyms (term, synonyms) VALUES
('orders', ARRAY['order', 'purchase', 'buy', 'bought', 'tracking', 'shipment', 'delivery', 'shipping']),
('status', ARRAY['track', 'tracking', 'where', 'location', 'progress']),
('refund', ARRAY['return', 'money back', 'cancel', 'cancelled']),
('donation', ARRAY['donate', 'give', 'contribute', 'support', 'fundraising']),
('receipt', ARRAY['invoice', 'confirmation', 'proof', 'email']),
('account', ARRAY['profile', 'login', 'sign in', 'register', 'signup']);

-- Add updated_at trigger
CREATE TRIGGER update_help_articles_updated_at
  BEFORE UPDATE ON public.help_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();