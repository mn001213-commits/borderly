CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reactions_select" ON message_reactions FOR SELECT
  USING (message_id IN (SELECT id FROM messages WHERE conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid())));
CREATE POLICY "reactions_insert" ON message_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reactions_delete" ON message_reactions FOR DELETE USING (auth.uid() = user_id);
