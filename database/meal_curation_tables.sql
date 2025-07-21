-- ================================================================
-- MEAL CURATION SYSTEM - DATABASE MIGRATION SCRIPT
-- ================================================================
-- This script updates existing tables to support binary image storage
-- instead of URL-based images. Safe to run on existing databases.
-- 
-- Changes made:
-- 1. Adds image_data (BYTEA) and image_mime_type columns to ingredients
-- 2. Adds picture_data (BYTEA) and picture_mime_type columns to meals  
-- 3. Removes old image_url and picture_url columns
-- 4. Creates missing tables and inserts default data safely
-- ================================================================

-- Migration script to update existing tables for binary image storage
-- This script assumes the tables already exist with the old URL-based image fields

-- Creates an enumeration type for meal categories for data consistency (if not exists).
DO $$ BEGIN
    CREATE TYPE meal_category AS ENUM ('Best for Breakfast', 'Best for Lunch', 'Best for Dinner', 'Best for Snacks');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Creates an enumeration type for Pinggang Pinoy ingredient categories (if not exists).
DO $$ BEGIN
    CREATE TYPE ingredient_category AS ENUM ('Go', 'Grow', 'Glow');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update ingredients table: Add binary image fields and is_disabled column, remove URL field
ALTER TABLE ingredients 
ADD COLUMN IF NOT EXISTS image_data BYTEA,
ADD COLUMN IF NOT EXISTS image_mime_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT FALSE;

-- Remove the old image_url column if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'ingredients' AND column_name = 'image_url') THEN
        ALTER TABLE ingredients DROP COLUMN image_url;
    END IF;
END $$;

-- Update meals table: Add binary image fields and remove URL field
ALTER TABLE meals 
ADD COLUMN IF NOT EXISTS picture_data BYTEA,
ADD COLUMN IF NOT EXISTS picture_mime_type VARCHAR(100);

-- Remove the old picture_url column if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'meals' AND column_name = 'picture_url') THEN
        ALTER TABLE meals DROP COLUMN picture_url;
    END IF;
END $$;

-- Create other tables if they don't exist
CREATE TABLE IF NOT EXISTS meal_ingredients (
    meal_ingredient_id SERIAL PRIMARY KEY,
    meal_id INT REFERENCES meals(meal_id) ON DELETE CASCADE,
    ingredient_id INT REFERENCES ingredients(ingredient_id) ON DELETE RESTRICT,
    quantity VARCHAR(100) NOT NULL, -- e.g., '250g', '1 cup', '3 pieces'
    UNIQUE(meal_id, ingredient_id) -- Ensures an ingredient is not added twice to the same meal
);

CREATE TABLE IF NOT EXISTS dietary_tags (
    tag_id SERIAL PRIMARY KEY,
    tag_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS meal_dietary_tags (
    meal_id INT REFERENCES meals(meal_id) ON DELETE CASCADE,
    tag_id INT REFERENCES dietary_tags(tag_id) ON DELETE CASCADE,
    PRIMARY KEY (meal_id, tag_id)
);

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_meal_modtime') THEN
        CREATE TRIGGER update_meal_modtime
        BEFORE UPDATE ON meals
        FOR EACH ROW
        EXECUTE FUNCTION update_modified_column();
    END IF;
END $$;

-- Insert default dietary tags (only if they don't exist)
INSERT INTO dietary_tags (tag_name) VALUES 
('Low-Carb'),
('High-Protein'),
('Vegetarian'),
('Vegan'),
('Spicy'),
('Low-Sodium'),
('Gluten-Free'),
('Dairy-Free'),
('Keto'),
('Paleo')
ON CONFLICT (tag_name) DO NOTHING;

-- Insert default Go ingredients (only if they don't exist)
INSERT INTO ingredients (name, category, price_per_kilo) VALUES 
('White Rice', 'Go', 45.00),
('Brown Rice', 'Go', 65.00),
('Bread', 'Go', 120.00),
('Sweet Potato', 'Go', 80.00),
('Pasta', 'Go', 150.00),
('Oats', 'Go', 180.00),
('Corn', 'Go', 60.00)
ON CONFLICT (name) DO NOTHING;

-- Insert default Grow ingredients (only if they don't exist)
INSERT INTO ingredients (name, category, price_per_kilo) VALUES 
('Chicken Breast', 'Grow', 280.00),
('Pork', 'Grow', 320.00),
('Beef', 'Grow', 450.00),
('Fish (Tilapia)', 'Grow', 180.00),
('Eggs', 'Grow', 200.00),
('Tofu', 'Grow', 150.00),
('Beans', 'Grow', 90.00),
('Milk', 'Grow', 85.00)
ON CONFLICT (name) DO NOTHING;

-- Insert default Glow ingredients (only if they don't exist)
INSERT INTO ingredients (name, category, price_per_kilo) VALUES 
('Malunggay', 'Glow', 120.00),
('Spinach', 'Glow', 80.00),
('Kangkong', 'Glow', 40.00),
('Tomato', 'Glow', 60.00),
('Carrot', 'Glow', 70.00),
('Bell Pepper', 'Glow', 180.00),
('Banana', 'Glow', 50.00),
('Mango', 'Glow', 100.00),
('Papaya', 'Glow', 45.00),
('Broccoli', 'Glow', 200.00)
ON CONFLICT (name) DO NOTHING;

-- ================================================================
-- AUDIT TRAIL SYSTEM
-- ================================================================
-- Creates audit trail tables to track all user actions across the system

-- Create audit action enum
DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM ('created', 'updated', 'archived', 'restored');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create global activity log table
CREATE TABLE IF NOT EXISTS activity_log (
    log_id SERIAL PRIMARY KEY,
    entity_type VARCHAR(20) NOT NULL, -- 'meal' or 'ingredient'
    entity_id INT NOT NULL,
    entity_name VARCHAR(255) NOT NULL,
    action audit_action NOT NULL,
    changed_by VARCHAR(255) NOT NULL, -- user identifier
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changes JSONB, -- stores what changed (optional)
    notes TEXT -- additional notes (optional)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_activity_log_changed_at ON activity_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);