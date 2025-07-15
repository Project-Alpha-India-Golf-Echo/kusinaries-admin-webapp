-- ================================================================
-- MIGRATE TO URL-BASED IMAGE STORAGE
-- ================================================================
-- This script migrates from binary image storage back to URL-based storage
-- for use with Supabase Storage buckets.
-- ================================================================

-- Add image_url columns to ingredients and meals tables
ALTER TABLE ingredients 
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE meals 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Remove old binary image columns (optional - uncomment if you want to clean up)
-- ALTER TABLE ingredients 
-- DROP COLUMN IF EXISTS image_data,
-- DROP COLUMN IF EXISTS image_mime_type;

-- ALTER TABLE meals 
-- DROP COLUMN IF EXISTS picture_data,
-- DROP COLUMN IF EXISTS picture_mime_type;

-- Create the images storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the images bucket
-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'images');

-- Allow public read access to images
CREATE POLICY "Allow public read access to images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'images');

-- Allow authenticated users to update their own images
CREATE POLICY "Allow authenticated users to update images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

-- Allow authenticated users to delete images
CREATE POLICY "Allow authenticated users to delete images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'images');
