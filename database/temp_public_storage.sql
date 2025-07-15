-- ================================================================
-- TEMPORARY: ALLOW PUBLIC ACCESS TO STORAGE (FOR TESTING ONLY)
-- ================================================================
-- WARNING: This allows anyone to upload/delete files. Use only for testing!
-- ================================================================

-- Create the images storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Remove existing policies
DROP POLICY IF EXISTS "Allow authenticated users to upload images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to upload images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to read images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete images" ON storage.objects;

-- Allow public access to upload images (TESTING ONLY)
CREATE POLICY "Allow public upload to images" ON storage.objects
FOR INSERT TO public
WITH CHECK (bucket_id = 'images');

-- Allow public read access to images
CREATE POLICY "Allow public read of images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'images');

-- Allow public update of images (TESTING ONLY)
CREATE POLICY "Allow public update of images" ON storage.objects
FOR UPDATE TO public
USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

-- Allow public delete of images (TESTING ONLY)
CREATE POLICY "Allow public delete of images" ON storage.objects
FOR DELETE TO public
USING (bucket_id = 'images');
