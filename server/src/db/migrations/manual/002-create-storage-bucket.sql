-- Migration: Create Supabase Storage bucket for dispatch images
-- Run this in Supabase SQL Editor

-- Create bucket for dispatch images (public bucket)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dispatch-images',
  'dispatch-images',
  true,
  5242880, -- 5MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Allow authenticated uploads
CREATE POLICY IF NOT EXISTS "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'dispatch-images');

-- RLS Policy: Allow public read
CREATE POLICY IF NOT EXISTS "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'dispatch-images');

-- RLS Policy: Allow authenticated delete
CREATE POLICY IF NOT EXISTS "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'dispatch-images');

-- For service role access (backend uploads)
-- The service role key bypasses RLS, so no additional policy needed
