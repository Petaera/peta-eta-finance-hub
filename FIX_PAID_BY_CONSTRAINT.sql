-- Fix the paid_by foreign key constraint issue
-- The current constraint requires paid_by to be a participant ID, but we want to allow
-- NULL values to represent "paid by user/myself"

-- Check current foreign key constraints on transactions table
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='transactions'
AND kcu.column_name = 'paid_by';

-- Drop the problematic foreign key constraint
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_paid_by_fkey;

-- Create a function to auto-create a participant entry for users
-- This will ensure every user has a corresponding participant entry
CREATE OR REPLACE FUNCTION ensure_user_participant(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
    participant_id UUID;
BEGIN
    -- Check if participant already exists
    SELECT id INTO participant_id 
    FROM participants 
    WHERE id = user_uuid;
    
    -- If not found, create one
    IF participant_id IS NULL THEN
        INSERT INTO participants (id, name, email, created_at)
        SELECT 
            auth.users.id,
            COALESCE(profiles.full_name, auth.users.email) as name,
            auth.users.email,
            NOW()
        FROM auth.users
        LEFT JOIN profiles ON profiles.id = auth.users.id
        WHERE auth.users.id = user_uuid;
        
        participant_id := user_uuid;
    END IF;
    
    RETURN participant_id;
END;
$$ LANGUAGE plpgsql;

-- Add a new constraint that checks paid_by exists in participants OR is a valid user ID
DO $$
BEGIN
    -- Only add constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transactions_paid_by_flexible'
    ) THEN
        ALTER TABLE public.transactions 
        ADD CONSTRAINT transactions_paid_by_flexible 
        CHECK (
            paid_by IS NULL 
            OR paid_by IN (SELECT id FROM participants)
            OR paid_by IN (SELECT id FROM auth.users)
        );
        
        RAISE NOTICE 'Added flexible paid_by constraint allowing both participants and users';
    ELSE
        RAISE NOTICE 'Constraint transactions_paid_by_flexible already exists';
    END IF;
END $$;

-- Verify the transaction table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name = 'paid_by';

-- Show current constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'transactions';
