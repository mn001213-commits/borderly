-- Meet comments with threaded replies (parent_id)
CREATE TABLE IF NOT EXISTS meet_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_id    uuid        NOT NULL REFERENCES meet_posts(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id  uuid        REFERENCES meet_comments(id) ON DELETE CASCADE,
  content    text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  author_name text,
  is_hidden  boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_meet_comments_meet_id  ON meet_comments (meet_id, created_at);
CREATE INDEX idx_meet_comments_user_id  ON meet_comments (user_id);
CREATE INDEX idx_meet_comments_parent   ON meet_comments (parent_id);

-- RLS
ALTER TABLE meet_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY meet_comments_select ON meet_comments
  FOR SELECT USING (true);

CREATE POLICY meet_comments_insert ON meet_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY meet_comments_delete ON meet_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Rate limit (reuse existing check_rate_limit function, 10/min)
CREATE OR REPLACE FUNCTION enforce_meet_comment_rate_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT check_rate_limit(NEW.user_id, 'meet_comment', 10) THEN
    RAISE EXCEPTION 'Rate limit exceeded: too many meet comments';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_meet_comment_rate_limit
  BEFORE INSERT ON meet_comments
  FOR EACH ROW
  EXECUTE FUNCTION enforce_meet_comment_rate_limit();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE meet_comments;
