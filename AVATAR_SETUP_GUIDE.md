# Avatar Upload Setup Guide

## Overview
This guide helps you set up the avatar upload functionality with Supabase storage and the profiles table management.

## 🚀 Quick Setup Steps

### 1. Database Setup
Run the SQL script in your Supabase SQL Editor:

```bash
# The avatar_storage_setup.sql file contains all necessary SQL commands
# Run this script in Supabase Dashboard > SQL Editor
```

### 2. Storage Bucket Configuration

1. **Go to Storage in Supabase Dashboard**
2. **Create a new bucket manually** (if not created by script):
   - Name: `avatar`
   - Set as **Public**: ✅ Yes
   - File size limit: 5MB
   - Allowed file types: image/*

### 3. Bucket Settings Verification

In Supabase Dashboard > Storage > avatar bucket:

**Public Policies:**
- ✅ Anyone can view files
- ✅ Authenticated users can upload files
- ✅ Users can manage their own files

**File Upload Path Structure:**
```
avatar/
  ├── avatars/
  │   ├── {user-id}-{timestamp}.jpg
  │   ├── {user-id}-{timestamp}.png
  │   └── ...
```

## 🔧 Features Implemented

### ✅ Profile Management
- **Full Name Editing**: Update your display name
- **Profile Creation**: Auto-creates profile if doesn't exist
- **Profile Loading**: Loads existing profile data

### ✅ Avatar Upload System
- **Image Upload**: Drag & drop or click to upload
- **File Validation**: 
  - Only image files (PNG, JPG, GIF, etc.)
  - Maximum 5MB file size
  - Automatic filename generation with user ID + timestamp
- **Storage Integration**: Files stored in Supabase `avatar` bucket
- **Public URLs**: Automatic public URL generation

### ✅ Avatar Management
- **Display**: Current avatar shown in circular preview
- **Upload**: Replace with new image
- **Remove**: Delete current avatar
- **Fallback**: Generic icon when no avatar set

### ✅ Security Features
- **User Isolation**: Users can only modify their own avatars/profiles
- **RLS Policies**: Row Level Security on both profiles table and storage
- **File Access Control**: Secure file upload paths per user
- **Path Validation**: Files stored in user-specific folders

## 🎯 How to Use

### Upload Avatar:
1. Go to **Settings** page
2. Click **Upload** button in avatar section
3. Select image file (PNG, JPG, GIF)
4. Upload automatically → Avatar appears immediately
5. Profile saved with new avatar URL

### Update Profile:
1. Enter/edit **Full Name** in the form
2. Click **Update Profile**
3. Changes saved to `profiles` table

### Remove Avatar:
1. Click **Remove** button below avatar
2. File deleted from storage
3. Profile updated with `avatar_url = null`

## 🔍 Technical Details

### Database Schema:
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NULL,
  avatar_url TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Storage Structure:
```
Supabase Storage Bucket: "avatar"
├── avatars/
│   ├── {user-id}-1234567890.jpg
│   ├── {user-id}-1234567891.png
│   └── ...
```

### File Upload Flow:
1. User selects image file
2. File validated (type, size)
3. Generate unique filename: `{user-id}-{timestamp}.{ext}`
4. Upload to `avatar/avatars/` path
5. Get public URL from Supabase
6. Update profiles table with URL
7. Clear file input

## 🛠️ Troubleshooting

### Common Issues:

**1. "Bucket not found" error:**
```sql
-- Manually create bucket in Supabase Dashboard > Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatar', 'avatar', true);
```

**2. "Policy violation" error:**
```sql
-- Ensure policies are created (see avatar_storage_setup.sql)
-- Check Storage > avatar > Policies section
```

**3. Avatar not displaying:**
- Check if avatar URL is accessible publicly
- Verify bucket is set to "Public"
- Check browser console for errors

**4. Upload fails:**
- Check file size (max 5MB)
- Verify file type (images only)
- Check authentication (user logged in?)

### Manual Configuration Steps:

If automatic setup fails:

1. **Create Bucket Manually:**
   ```
   Supabase Dashboard > Storage > New Bucket
   Name: avatar
   Public: ✅ Yes
   ```

2. **Set Up Policies:**
   ```
   Storage > avatar > Policies > New Policy
   Use templates from avatar_storage_setup.sql
   ```

3. **Verify RLS:**
   ```
   Table Editor > profiles > RLS enabled
   ```

## 📱 UI Components

### Avatar Display:
- Circular 80x80px preview
- Border styling
- Fallback icon (no avatar)

### Upload Interface:
- Upload button with icon
- Remove button (when avatar exists)
- File size validation message
- Loading state during upload

### Form Sections:
- **Avatar Section**: Display + upload controls
- **Profile Section**: Full name editing
- **Account Section**: Read-only account info
- **App Info**: Version and branding

## 🚀 Next Steps

After setup:
1. Test avatar upload functionality
2. Verify profile creation/updates
3. Check storage bucket integration
4. Test file access and security

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify Supabase setup matches this guide
3. Test with small image files first
4. Check RLS policies are active
