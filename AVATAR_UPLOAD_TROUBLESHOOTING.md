# Avatar Upload Troubleshooting Guide

## Error: "new row violates row-level security policy"

This error occurs when the Supabase storage bucket has RLS (Row Level Security) policies that are blocking the upload.

## Quick Fix Solutions

### Option 1: Fix RLS Policies (Recommended)
Run the `FIX_AVATAR_STORAGE_RLS.sql` script in your Supabase SQL Editor. This creates proper RLS policies that allow authenticated users to upload avatars.

### Option 2: Disable Storage RLS (Quick but less secure)
Run the `DISABLE_STORAGE_RLS.sql` script in your Supabase SQL Editor. This completely disables RLS for storage operations.

## Step-by-Step Manual Fix

1. **Go to Supabase Dashboard:**
   - Navigate to your project
   - Go to Storage > Policies

2. **Check if avatar bucket exists:**
   - Look for a bucket named `avatar`
   - If it doesn't exist, create it:
     - Go to Storage > Buckets
     - Click "New bucket"
     - Name: `avatar`
     - Make it public: **Yes**

3. **Fix RLS Policies:**
   - Go to Storage > Policies
   - Select the `avatar` bucket
   - Delete all existing policies
   - Add these new policies:

   ```sql
   -- Allow authenticated users to upload
   CREATE POLICY "Avatar upload policy" ON storage.objects
   FOR INSERT WITH CHECK (
     bucket_id = 'avatar' AND
     auth.role() = 'authenticated'
   );

   -- Allow authenticated users to update
   CREATE POLICY "Avatar update policy" ON storage.objects
   FOR UPDATE USING (
     bucket_id = 'avatar' AND
     auth.role() = 'authenticated'
   );

   -- Allow authenticated users to delete
   CREATE POLICY "Avatar delete policy" ON storage.objects
   FOR DELETE USING (
     bucket_id = 'avatar' AND
     auth.role() = 'authenticated'
   );

   -- Allow public read access
   CREATE POLICY "Avatar select policy" ON storage.objects
   FOR SELECT USING (bucket_id = 'avatar');
   ```

4. **Verify Bucket Settings:**
   - Make sure the `avatar` bucket is set to **Public**
   - Check file size limit (should be at least 5MB)
   - Allowed MIME types should include: `image/jpeg`, `image/png`, `image/gif`

## Testing the Fix

1. Open your app and go to Settings
2. Try uploading a profile photo
3. Check the browser console for detailed error logs
4. The upload should now work successfully

## Common Issues

- **Bucket doesn't exist:** Create the `avatar` bucket in Supabase Storage
- **Bucket not public:** Set the bucket to public in bucket settings
- **File too large:** Check file size limit in bucket settings
- **Wrong MIME type:** Ensure bucket allows image MIME types
- **RLS policies too restrictive:** Use the provided SQL scripts to fix policies

## Debug Information

The updated code now provides detailed console logs. Check your browser's developer console for:
- Upload attempt details
- Error specifics
- Success confirmations

This will help identify exactly what's causing the upload to fail.
