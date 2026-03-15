-- 1. Post Bookmarks
CREATE TABLE IF NOT EXISTS post_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookmarks_select" ON post_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bookmarks_insert" ON post_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bookmarks_delete" ON post_bookmarks FOR DELETE USING (auth.uid() = user_id);

-- 2. Multi-image posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_urls jsonb DEFAULT NULL;

-- 3. Chat Read Receipts
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipts_select" ON message_read_receipts FOR SELECT
  USING (conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid()));
CREATE POLICY "receipts_upsert" ON message_read_receipts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "receipts_update" ON message_read_receipts FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION mark_messages_read(p_conversation_id uuid, p_message_id uuid)
RETURNS void AS $$
  INSERT INTO message_read_receipts (conversation_id, user_id, last_read_message_id, last_read_at)
  VALUES (p_conversation_id, auth.uid(), p_message_id, now())
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET last_read_message_id = p_message_id, last_read_at = now();
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. Meet Reminders
CREATE TABLE IF NOT EXISTS meet_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_id uuid NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('24h', '1h', '15m')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(meet_id, user_id, reminder_type)
);
ALTER TABLE meet_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminders_select" ON meet_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reminders_insert" ON meet_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
