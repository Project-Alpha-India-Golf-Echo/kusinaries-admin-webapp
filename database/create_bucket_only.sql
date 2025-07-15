-- Simple bucket creation script
-- Run this first if the bucket doesn't exist

INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;
