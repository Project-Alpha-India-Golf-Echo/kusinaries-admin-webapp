-- ================================================================
-- DISABLE RLS FOR TESTING (TEMPORARY)
-- ================================================================
-- This script temporarily disables RLS for testing purposes.
-- WARNING: This makes your data accessible to anyone with the anon key.
-- Only use this for development/testing environments.
-- ================================================================

-- Disable RLS on all tables (for testing only)
ALTER TABLE ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE meals DISABLE ROW LEVEL SECURITY;
ALTER TABLE meal_ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE dietary_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE meal_dietary_tags DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on storage.objects if needed
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Note: To re-enable RLS later, run:
-- ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE meal_ingredients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE dietary_tags ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE meal_dietary_tags ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
