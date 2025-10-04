-- Create participant entries for all existing users
-- This ensures that user IDs can be used in the paid_by field

-- Insert a participant for each user (only if they don't already have one)
INSERT INTO participants (id, name, email, created_at)
SELECT 
    auth.users.id,
    COALESCE(profiles.full_name, split_part(auth.users.email, '@', 1)) as name,
    auth.users.email,
    NOW()
FROM auth.users
LEFT JOIN profiles ON profiles.id = auth.users.id
WHERE NOT EXISTS (
    SELECT 1 FROM participants 
    WHERE participants.id = auth.users.id
);

-- Verify participants were created
SELECT COUNT(*) as user_participants_count
FROM participants p
INNER JOIN auth.users u ON u.id = p.id;

-- Show all users and their corresponding participants
SELECT 
    u.id as user_id,
    u.email as user_email,
    p.id as participant_id,
    p.name as participant_name,
    p.email as participant_email
FROM auth.users u
LEFT JOIN participants p ON p.id = u.id
ORDER BY u.email;
