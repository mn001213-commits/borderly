-- Add chat_type and group_conversation_id to ngo_posts
-- chat_type: 'group' = shared group chat for all approved applicants
--            'dm'    = individual 1:1 chat per approved applicant

ALTER TABLE ngo_posts
  ADD COLUMN IF NOT EXISTS chat_type TEXT NOT NULL DEFAULT 'group'
    CHECK (chat_type IN ('group', 'dm')),
  ADD COLUMN IF NOT EXISTS group_conversation_id UUID
    REFERENCES conversations(id) ON DELETE SET NULL;
