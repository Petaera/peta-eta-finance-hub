-- FIX AVATAR STORAGE RLS ISSUES
-- Run this in Supabase SQL Editor to fix storage bucket RLS policies

-- Step 1: Check if the avatar bucket exists and its RLS status
SELECT 
    name as bucket_name,
    public as is_public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE name = 'avatar';

-- Step 2: Check existing storage policies for the avatar bucket
SELECT 
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%avatar%';

-- Step 3: Drop ALL existing storage policies for avatar bucket
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatar upload policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar select policy" ON storage.objects;

-- Step 4: Create simple, permissive policies for avatar bucket
-- These policies allow all authenticated users to manage avatars

-- Policy 1: Allow authenticated users to upload avatars
CREATE POLICY "Avatar upload policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatar' AND
  auth.role() = 'authenticated'
);

-- Policy 2: Allow authenticated users to update avatars
CREATE POLICY "Avatar update policy" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatar' AND
  auth.role() = 'authenticated'
);

-- Policy 3: Allow authenticated users to delete avatars
CREATE POLICY "Avatar delete policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatar' AND
  auth.role() = 'authenticated'
);

-- Policy 4: Allow public read access to avatars
CREATE POLICY "Avatar select policy" ON storage.objects
FOR SELECT USING (bucket_id = 'avatar');

-- Step 5: Ensure the avatar bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE name = 'avatar';

-- Step 6: Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
