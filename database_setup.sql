-- Database Setup Script for Groups and Friends Features
-- Run this script in your Supabase SQL editor to ensure all tables are properly set up

-- 1. Create friends table
CREATE TABLE IF NOT EXISTS public.friends (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  friend_id uuid NULL,
  status text NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT friends_pkey PRIMARY KEY (id),
  CONSTRAINT friends_user_id_friend_id_key UNIQUE (user_id, friend_id),
  CONSTRAINT friends_friend_id_fkey FOREIGN KEY (friend_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT friends_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT friends_status_check CHECK (
    (
      status = ANY (
        ARRAY[
          'pending'::text,
          'accepted'::text,
          'blocked'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- 2. Create group_members table
CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NULL,
  user_id uuid NULL,
  role text NULL DEFAULT 'member'::text,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT group_members_pkey PRIMARY KEY (id),
  CONSTRAINT group_members_group_id_user_id_key UNIQUE (group_id, user_id),
  CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES category_groups (id) ON DELETE CASCADE,
  CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT group_members_role_check CHECK (
    (role = ANY (ARRAY['member'::text, 'admin'::text]))
  )
) TABLESPACE pg_default;

-- 3. Ensure category_groups table exists (should already exist)
CREATE TABLE IF NOT EXISTS public.category_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  name text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT category_groups_pkey PRIMARY KEY (id),
  CONSTRAINT category_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 4. Ensure participants table exists (should already exist)
CREATE TABLE IF NOT EXISTS public.participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NULL,
  group_id uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT participants_pkey PRIMARY KEY (id),
  CONSTRAINT participants_group_id_fkey FOREIGN KEY (group_id) REFERENCES category_groups (id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- 5. Ensure profiles table exists and has the required columns
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  email text,
  full_name text,
  avatar_url text,
  default_group_id uuid NULL,
  default_category_id uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT profiles_default_group_id_fkey FOREIGN KEY (default_group_id) REFERENCES category_groups (id) ON DELETE SET NULL,
  CONSTRAINT profiles_default_category_id_fkey FOREIGN KEY (default_category_id) REFERENCES categories (id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- 6. Add missing columns to profiles table if they don't exist
DO $$ 
BEGIN
    -- Add email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email text;
    END IF;
    
    -- Add full_name column if it don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name text;
    END IF;
    
    -- Add avatar_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url text;
    END IF;
END $$;

-- 7. Create RLS policies for friends table
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friendships" ON public.friends
  FOR SELECT USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

CREATE POLICY "Users can create friend requests" ON public.friends
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

CREATE POLICY "Users can update their own friendships" ON public.friends
  FOR UPDATE USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

CREATE POLICY "Users can delete their own friendships" ON public.friends
  FOR DELETE USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

-- 8. Create RLS policies for group_members table
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view group members" ON public.group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE gm.group_id = group_members.group_id 
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can manage members" ON public.group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE gm.group_id = group_members.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.role = 'admin'
    )
  );

CREATE POLICY "Users can join groups" ON public.group_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- 9. Create RLS policies for category_groups table (if not already exists)
ALTER TABLE public.category_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own groups" ON public.category_groups
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE gm.group_id = category_groups.id 
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups" ON public.category_groups
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "Group creators can update groups" ON public.category_groups
  FOR UPDATE USING (
    user_id = auth.uid()
  );

CREATE POLICY "Group creators can delete groups" ON public.category_groups
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- 10. Create RLS policies for participants table (if not already exists)
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants" ON public.participants
  FOR SELECT USING (true);

CREATE POLICY "Users can manage participants" ON public.participants
  FOR ALL USING (true);

-- 11. Create RLS policies for profiles table (if not already exists)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (
    id = auth.uid()
  );

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (
    id = auth.uid()
  );

-- 12. Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create trigger to automatically create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 14. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON public.friends(status);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_group_id ON public.participants(group_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
