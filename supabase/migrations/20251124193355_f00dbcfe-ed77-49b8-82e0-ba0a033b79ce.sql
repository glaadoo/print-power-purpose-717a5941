-- Fix videos bucket RLS policies to allow unauthenticated access
-- since admin access is passcode-protected, not auth-based

DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view videos" ON storage.objects;

-- Allow anyone to upload videos (admin page is already passcode-protected)
CREATE POLICY "Allow video uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'videos');

-- Allow anyone to delete videos (admin page is already passcode-protected)
CREATE POLICY "Allow video deletions"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'videos');

-- Allow anyone to view videos
CREATE POLICY "Allow video viewing"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'videos');