-- Add avatar_url column to profiles table
-- This script adds the avatar_url column to store the URL of the user's profile photo

-- Add the avatar_url column to the profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add a comment to describe the column
COMMENT ON COLUMN profiles.avatar_url IS 'URL of the user profile photo stored in Supabase storage bucket named avatar';

-- Optional: Create an index on avatar_url for better query performance (if needed)
-- CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON profiles(avatar_url) WHERE avatar_url IS NOT NULL;
