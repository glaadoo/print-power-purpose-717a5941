-- Allow public read access to stripe_mode setting so frontend can display the correct mode indicator
CREATE POLICY "Anyone can read stripe_mode setting"
ON app_settings
FOR SELECT
USING (key = 'stripe_mode');