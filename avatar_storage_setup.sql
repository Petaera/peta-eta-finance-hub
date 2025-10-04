-- Avatar Storage Setup for Supabase
-- Run this SQL script in your Supabase SQL Editor

-- 1. Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatar', 'avatar', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable Row Level Security on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Create policy: Users can upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatar' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Create policy: Users can update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE 
USING (
  bucket_id = 'avatar' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatar' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Create policy: Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'avatar' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 6. Create policy: Anyone can view avatars (public read access)
CREATE POLICY "Public can view avatars"
ON storage.objects
FOR SELECT 
USING (bucket_id = 'avatar');

-- 7. Enable RLS on the profiles table (if not already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 8. Create policies for profiles table if they don't exist
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- 9. Create function to automatically create profile on user signup (optional)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', null);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create trigger to automatically create profile when user signs up (optional)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
