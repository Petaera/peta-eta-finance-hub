-- Debug Friend Request Issues
-- Run these queries in Supabase SQL Editor to check your data

-- 1. Check all users in profiles table
SELECT 
  id,
  email,
  full_name,
  created_at
FROM public.profiles 
ORDER BY created_at DESC;

-- 2. Check all users in auth.users (if you have admin access)
-- Note: This might not work from client-side, but try it
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users 
ORDER BY created_at DESC;

-- 3. Check existing friendships
SELECT 
  f.id,
  f.user_id,
  f.friend_id,
  f.status,
  f.created_at,
  u1.email as user_email,
  u2.email as friend_email
FROM public.friends f
LEFT JOIN public.profiles u1 ON u1.id = f.user_id
LEFT JOIN public.profiles u2 ON u2.id = f.friend_id
ORDER BY f.created_at DESC;

-- 4. Check if a specific email exists in profiles
-- Replace 'friend@example.com' with the actual email you're trying to add
SELECT 
  id,
  email,
  full_name,
  created_at
FROM public.profiles 
WHERE email = 'friend@example.com';

-- 5. Check if profiles are being created for new users
-- This should show if the trigger is working
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as profiles_with_email,
  COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as profiles_with_name
FROM public.profiles;

-- 6. Check recent profile creation
SELECT 
  id,
  email,
  full_name,
  created_at
FROM public.profiles 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
