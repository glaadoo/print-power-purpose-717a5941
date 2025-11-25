-- Create storage bucket for customer artwork uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-artwork', 'customer-artwork', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload artwork (guests and authenticated users)
CREATE POLICY "Anyone can upload artwork"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'customer-artwork');

-- Allow public read access to artwork files
CREATE POLICY "Public can view artwork"
ON storage.objects FOR SELECT
USING (bucket_id = 'customer-artwork');

-- Allow users to delete their own artwork
CREATE POLICY "Users can delete their own artwork"
ON storage.objects FOR DELETE
USING (bucket_id = 'customer-artwork');