-- FINAL RLS FIX - Run this in Supabase SQL Editor
-- This will completely resolve the profiles table RLS policy violations

-- Step 1: Check current RLS status on profiles table
SELECT 
    schemaname,
    tablename, 
    rowsecurity as rls_enabled,
    hasrls as has_rls
FROM pg_tables 
WHERE tablename = 'profiles' 
AND schemaname = 'public';

-- Step 2: Display current policies (if any)
SELECT 
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- Step 3: Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.profiles;

-- Step 4: Enable RLS (in case it's not enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create NEW policies with explicit permissions
-- Policy 1: SELECT (Read access)
CREATE POLICY "profiles_select_policy" 
ON public.profiles
FOR SELECT 
USING (true);

-- Policy 2: INSERT (Create profile)
CREATE POLICY "profiles_insert_policy" 
ON public.profiles
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Policy 3: UPDATE (Update profile)
CREATE POLICY "profiles_update_policy" 
ON public.profiles
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 4: DELETE (Delete profile)
CREATE POLICY "profiles_delete_policy" 
ON public.profiles
FOR DELETE 
USING (auth.uid() = id);

-- Step 6: Grant explicit permissions to authenticated users
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Step 7: Create a function to test auth.uid()
CREATE OR REPLACE FUNCTION test_auth_uid()
RETURNS TABLE(current_user_id uuid, is_authenticated boolean)
AS $$
BEGIN
  RETURN QUERY 
  SELECT auth.uid() as current_user_id, 
         (auth.uid() IS NOT NULL) as is_authenticated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Test the auth function (run this to verify authentication)
SELECT * FROM test_auth_uid();

-- Step 9: Test policies with a manual query (replace YOUR_USER_ID with actual user ID)
-- Uncomment and modify this line to test:
-- SELECT * FROM public.profiles WHERE id = 'YOUR_USER_ID_HERE';

-- Step 10: Create a helper function for profile creation from the frontend
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS void
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, created_at)
  VALUES (
    auth.uid(),
    NULL,
    NULL,
    now()
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION create_user_profile() TO authenticated;

-- Step 12: Create a trigger to auto-create profile on user signup (optional)
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', null);
  return new;
end;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user_profile();

-- Step 13: Display all policies to verify they were created
SELECT 
    policyname as "Policy Name",
    cmd as "Command",
    CASE 
        WHEN permissive THEN 'PERMISSIVE' 
        ELSE 'RESTRICTIVE' 
    END as "Type",
    qual as "Using Condition",
    with_check as "With Check Condition"
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY policyname;

-- Step 14: Final verification queries
-- Check that RLS is enabled
SELECT 
    'RLS Status: ' || 
    CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_tables 
WHERE tablename = 'profiles' 
AND schemaname = 'public';

-- Check authenticated role permissions  
SELECT 
    grantee, 
    grantor, 
    privilege_type, 
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND grantee = 'authenticated';

-- Success message
SELECT 'RLS policies for profiles table have been configured successfully!' as message;
