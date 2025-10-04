-- Fix Profiles RLS Policy Issues
-- Run this in Supabase SQL Editor to resolve 403 errors

-- 1. First, let's check if profiles table has RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 2. Enable RLS on profiles table (if not already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- 4. Create explicit policies with proper auth checks

-- Policy for SELECT (SELECT)
CREATE POLICY "Users can view own profile" 
ON public.profiles
FOR SELECT 
USING (auth.uid() = id);

-- Policy for INSERT
CREATE POLICY "Users can insert own profile" 
ON public.profiles
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Policy for UPDATE
CREATE POLICY "Users can update own profile" 
ON public.profiles
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy for DELETE
CREATE POLICY "Users can delete own profile" 
ON public.profiles
FOR DELETE 
USING (auth.uid() = id);

-- 5. Grant necessary permissions to authenticated users
GRANT ALL ON public.profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 6. Check if auth.uid() function exists and works
SELECT auth.uid() as current_user_id;

-- 7. Test RLS policies (run this after creating policies)
-- Replace 'your-user-id-here' with an actual user ID from auth.users
-- SELECT * FROM public.profiles WHERE id = 'your-user-id-here';

-- 8. Create a test profile for debugging (optional)
-- Uncomment to test profile creation manually
-- INSERT INTO public.profiles (id, full_name, avatar_url) 
-- VALUES (auth.uid(), 'Test User', null);

-- 9. Verify the profiles table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles';

-- 10. Check existing profiles data
SELECT id, full_name, avatar_url, created_at 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 10;
