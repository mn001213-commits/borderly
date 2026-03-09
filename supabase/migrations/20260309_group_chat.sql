-- Group Chat Schema Updates
-- Run this in your Supabase SQL editor

-- 1) Add group fields to conversations table
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- 2) Add role to conversation_members for admin management
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_members' AND column_name = 'role'
  ) THEN
    ALTER TABLE conversation_members
      ADD COLUMN role text NOT NULL DEFAULT 'member';
  END IF;
END $$;

-- 3) Update existing meet group conversations to have names from meet_posts
UPDATE conversations c
SET name = mp.title
FROM group_conversations gc
JOIN meet_posts mp ON mp.id = gc.meet_id
WHERE gc.conversation_id = c.id
  AND c.name IS NULL;
