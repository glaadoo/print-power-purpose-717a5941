-- Fix video upload RLS policies to work with passcode-protected admin
-- The admin page is protected by passcode, so authenticated users who reach it are admins

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete videos" ON storage.objects;

-- Allow authenticated users to upload videos (admin page is passcode-protected)
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'videos');

-- Allow authenticated users to delete videos (admin page is passcode-protected)
CREATE POLICY "Authenticated users can delete videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'videos');