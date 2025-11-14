-- Fix warn-level security issues: Add RLS to log tables and who_we_serve_pages

-- Enable RLS on log tables
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE who_we_serve_pages ENABLE ROW LEVEL SECURITY;

-- System logs policies (admin read, service role insert)
CREATE POLICY "Only admins read system logs"
ON system_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role inserts system logs"
ON system_logs FOR INSERT
TO service_role
WITH CHECK (true);

-- Help search logs policies (admin read, existing service role insert policy remains)
CREATE POLICY "Only admins read help search logs"
ON help_search_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Audit log policies (admin read, service role manages)
CREATE POLICY "Only admins read audit logs"
ON audit_log FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages audit log"
ON audit_log FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Who we serve pages policies (public read, admin modify)
CREATE POLICY "Anyone can read pages"
ON who_we_serve_pages FOR SELECT
USING (true);

CREATE POLICY "Admins can manage pages"
ON who_we_serve_pages FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));