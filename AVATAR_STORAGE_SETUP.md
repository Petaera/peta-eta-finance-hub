# Avatar Storage Setup for Supabase

This guide explains how to set up the avatar storage bucket in Supabase for profile photo uploads.

## Storage Bucket Setup

1. **Create the Storage Bucket:**
   - Go to your Supabase project dashboard
   - Navigate to Storage in the left sidebar
   - Click "New bucket"
   - Name: `avatar`
   - Make it public: **Yes** (so profile photos can be accessed publicly)
   - Click "Create bucket"

2. **Set up RLS (Row Level Security) Policies:**
   - Go to Storage > Policies
   - Select the `avatar` bucket
   - Add the following policies:

   **Policy 1: Allow users to upload their own avatars**
   ```sql
   CREATE POLICY "Users can upload their own avatars" ON storage.objects
   FOR INSERT WITH CHECK (
     bucket_id = 'avatar' AND
     auth.uid()::text = (storage.foldername(name))[1]
   );
   ```

   **Policy 2: Allow users to update their own avatars**
   ```sql
   CREATE POLICY "Users can update their own avatars" ON storage.objects
   FOR UPDATE USING (
     bucket_id = 'avatar' AND
     auth.uid()::text = (storage.foldername(name))[1]
   );
   ```

   **Policy 3: Allow users to delete their own avatars**
   ```sql
   CREATE POLICY "Users can delete their own avatars" ON storage.objects
   FOR DELETE USING (
     bucket_id = 'avatar' AND
     auth.uid()::text = (storage.foldername(name))[1]
   );
   ```

   **Policy 4: Allow public read access to avatars**
   ```sql
   CREATE POLICY "Public can view avatars" ON storage.objects
   FOR SELECT USING (bucket_id = 'avatar');
   ```

3. **Database Schema Update:**
   - Run the `ADD_AVATAR_URL_TO_PROFILES.sql` script to add the `avatar_url` column to the profiles table

## File Structure

The uploaded avatars will be stored with the following structure:
```
avatar/
  └── avatars/
      └── {user_id}-{timestamp}.{extension}
```

Example: `avatar/avatars/123e4567-e89b-12d3-a456-426614174000-1703123456789.jpg`

## Features Implemented

- ✅ File upload with validation (image types only, max 5MB)
- ✅ Image preview before upload
- ✅ Upload to Supabase storage bucket named `avatar`
- ✅ Save avatar URL to `profiles.avatar_url` column
- ✅ Remove avatar functionality
- ✅ Update existing profile photos
- ✅ Proper error handling and user feedback

## Usage

Users can now:
1. Upload a profile photo by clicking "Upload Photo" in Settings
2. Change their photo by clicking "Change Photo"
3. Remove their photo by clicking the "Remove" button
4. See a preview of their selected image before uploading

The avatar will be automatically displayed in the Profile Information section of the Settings page.
