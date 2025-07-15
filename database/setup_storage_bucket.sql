-- ================================================================
-- SETUP SUPABASE STORAGE BUCKET AND POLICIES
-- ================================================================
-- This script creates the images storage bucket and sets up proper
-- RLS policies to allow authenticated users to upload/manage images
-- ================================================================

-- Create the images storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Remove any existing policies for the images bucket to start fresh
DROP POLICY IF EXISTS "Allow authenticated users to upload images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to upload images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to read images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete images" ON storage.objects;

-- Allow authenticated users to upload/insert images
CREATE POLICY "Allow users to upload images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'images');

-- Allow public read access to images (since bucket is public)
CREATE POLICY "Allow users to read images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'images');

-- Allow authenticated users to update images
CREATE POLICY "Allow users to update images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

-- Allow authenticated users to delete images
CREATE POLICY "Allow users to delete images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'images');

-- Alternative: If you want to allow ALL operations without authentication (LESS SECURE)
-- Uncomment the following policies and comment out the authenticated ones above:

-- CREATE POLICY "Allow all to upload images" ON storage.objects
-- FOR INSERT TO public
-- WITH CHECK (bucket_id = 'images');

-- CREATE POLICY "Allow all to update images" ON storage.objects
-- FOR UPDATE TO public
-- USING (bucket_id = 'images')
-- WITH CHECK (bucket_id = 'images');

-- CREATE POLICY "Allow all to delete images" ON storage.objects
-- FOR DELETE TO public
-- USING (bucket_id = 'images');
