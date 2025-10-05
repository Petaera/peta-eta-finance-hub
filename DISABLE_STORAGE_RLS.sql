-- DISABLE STORAGE RLS COMPLETELY
-- Use this if you want to completely disable RLS for the avatar bucket
-- Run this in Supabase SQL Editor

-- Step 1: Check current RLS status on storage.objects
SELECT 
    schemaname,
    tablename, 
    rowsecurity as rls_enabled,
    hasrls as has_rls
FROM pg_tables 
WHERE tablename = 'objects' 
AND schemaname = 'storage';

-- Step 2: Disable RLS on storage.objects table (if you want to completely disable it)
-- WARNING: This makes all storage objects accessible to everyone
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Step 3: Alternative - Create very permissive policies instead of disabling RLS
-- This is safer than completely disabling RLS

-- Drop all existing policies first
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- Create very permissive policies
CREATE POLICY "Allow all operations on storage objects" ON storage.objects
FOR ALL USING (true) WITH CHECK (true);

-- Step 4: Ensure avatar bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatar',
    'avatar', 
    true,
    52428800, -- 50MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Step 5: Grant permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.buckets TO anon;
