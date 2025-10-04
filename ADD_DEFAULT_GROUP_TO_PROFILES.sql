-- Add default_group_id column to profiles table if it doesn't exist
-- This column will store the default category group ID for each user

-- First, let's check if the column exists and add it if not
DO $$ 
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'default_group_id'
    ) THEN
        -- Add the column
        ALTER TABLE public.profiles 
        ADD COLUMN default_group_id uuid NULL;
        
        -- Add a comment to explain the purpose
        COMMENT ON COLUMN public.profiles.default_group_id IS 'Default category group ID for the user (references category_groups.id)';
        
        RAISE NOTICE 'Added default_group_id column to profiles table';
    ELSE
        RAISE NOTICE 'Column default_group_id already exists in profiles table';
    END IF;
END $$;

-- Verify the profiles table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;
