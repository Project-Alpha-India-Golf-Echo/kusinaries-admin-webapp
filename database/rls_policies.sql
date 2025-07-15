-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================
-- This script sets up RLS policies for the meal curation system.
-- Run this script in your Supabase SQL editor to fix RLS issues.
-- ================================================================

-- Enable RLS on all tables
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE dietary_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_dietary_tags ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- INGREDIENTS TABLE POLICIES
-- ================================================================

-- Allow authenticated users to view all ingredients
CREATE POLICY "Allow authenticated users to view ingredients" ON ingredients
    FOR SELECT TO authenticated
    USING (true);

-- Allow authenticated users to insert ingredients
CREATE POLICY "Allow authenticated users to insert ingredients" ON ingredients
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update ingredients
CREATE POLICY "Allow authenticated users to update ingredients" ON ingredients
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to delete ingredients
CREATE POLICY "Allow authenticated users to delete ingredients" ON ingredients
    FOR DELETE TO authenticated
    USING (true);

-- ================================================================
-- MEALS TABLE POLICIES
-- ================================================================

-- Allow authenticated users to view all meals
CREATE POLICY "Allow authenticated users to view meals" ON meals
    FOR SELECT TO authenticated
    USING (true);

-- Allow authenticated users to insert meals
CREATE POLICY "Allow authenticated users to insert meals" ON meals
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update meals
CREATE POLICY "Allow authenticated users to update meals" ON meals
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to delete meals
CREATE POLICY "Allow authenticated users to delete meals" ON meals
    FOR DELETE TO authenticated
    USING (true);

-- ================================================================
-- MEAL_INGREDIENTS TABLE POLICIES
-- ================================================================

-- Allow authenticated users to view all meal ingredients
CREATE POLICY "Allow authenticated users to view meal_ingredients" ON meal_ingredients
    FOR SELECT TO authenticated
    USING (true);

-- Allow authenticated users to insert meal ingredients
CREATE POLICY "Allow authenticated users to insert meal_ingredients" ON meal_ingredients
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update meal ingredients
CREATE POLICY "Allow authenticated users to update meal_ingredients" ON meal_ingredients
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to delete meal ingredients
CREATE POLICY "Allow authenticated users to delete meal_ingredients" ON meal_ingredients
    FOR DELETE TO authenticated
    USING (true);

-- ================================================================
-- DIETARY_TAGS TABLE POLICIES
-- ================================================================

-- Allow authenticated users to view all dietary tags
CREATE POLICY "Allow authenticated users to view dietary_tags" ON dietary_tags
    FOR SELECT TO authenticated
    USING (true);

-- Allow authenticated users to insert dietary tags
CREATE POLICY "Allow authenticated users to insert dietary_tags" ON dietary_tags
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update dietary tags
CREATE POLICY "Allow authenticated users to update dietary_tags" ON dietary_tags
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to delete dietary tags
CREATE POLICY "Allow authenticated users to delete dietary_tags" ON dietary_tags
    FOR DELETE TO authenticated
    USING (true);

-- ================================================================
-- MEAL_DIETARY_TAGS TABLE POLICIES
-- ================================================================

-- Allow authenticated users to view all meal dietary tags
CREATE POLICY "Allow authenticated users to view meal_dietary_tags" ON meal_dietary_tags
    FOR SELECT TO authenticated
    USING (true);

-- Allow authenticated users to insert meal dietary tags
CREATE POLICY "Allow authenticated users to insert meal_dietary_tags" ON meal_dietary_tags
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update meal dietary tags
CREATE POLICY "Allow authenticated users to update meal_dietary_tags" ON meal_dietary_tags
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to delete meal dietary tags
CREATE POLICY "Allow authenticated users to delete meal_dietary_tags" ON meal_dietary_tags
    FOR DELETE TO authenticated
    USING (true);

-- ================================================================
-- STORAGE BUCKET POLICIES (for images)
-- ================================================================

-- Allow authenticated users to upload images
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to images bucket
CREATE POLICY "Allow authenticated users to upload images" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'images');

-- Allow everyone to view images (since bucket is public)
CREATE POLICY "Allow public to view images" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'images');

-- Allow authenticated users to update their uploaded images
CREATE POLICY "Allow authenticated users to update images" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'images')
    WITH CHECK (bucket_id = 'images');

-- Allow authenticated users to delete images
CREATE POLICY "Allow authenticated users to delete images" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'images');
