-- ============================================================
-- 1. BLOCKED USER MESSAGE PREVENTION
-- Prevent sending messages to conversations with blocked users
-- ============================================================

CREATE OR REPLACE FUNCTION check_block_before_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conv_type text;
  other_user_id uuid;
  is_blocked boolean;
BEGIN
  -- Only check for direct (1:1) conversations
  SELECT type INTO conv_type FROM conversations WHERE id = NEW.conversation_id;

  IF conv_type = 'direct' THEN
    -- Find the other user in the conversation
    SELECT user_id INTO other_user_id
    FROM conversation_members
    WHERE conversation_id = NEW.conversation_id
      AND user_id != NEW.user_id
    LIMIT 1;

    IF other_user_id IS NOT NULL THEN
      -- Check bidirectional block
      SELECT EXISTS (
        SELECT 1 FROM blocks
        WHERE (blocker_id = NEW.user_id AND blocked_id = other_user_id)
           OR (blocker_id = other_user_id AND blocked_id = NEW.user_id)
      ) INTO is_blocked;

      IF is_blocked THEN
        RAISE EXCEPTION 'Cannot send message: user is blocked';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_block_before_message ON messages;
CREATE TRIGGER trg_check_block_before_message
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION check_block_before_message();

-- ============================================================
-- 2. MEET PARTICIPANT LIMIT ENFORCEMENT (DB level)
-- Prevent joining when max_people is reached
-- ============================================================

CREATE OR REPLACE FUNCTION check_meet_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  max_cap int;
  current_count int;
BEGIN
  SELECT max_people INTO max_cap FROM meet_posts WHERE id = NEW.meet_id;

  -- If no limit set, allow
  IF max_cap IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO current_count
  FROM meet_participants
  WHERE meet_id = NEW.meet_id;

  IF current_count >= max_cap THEN
    RAISE EXCEPTION 'Meet event is full';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_meet_capacity ON meet_participants;
CREATE TRIGGER trg_check_meet_capacity
  BEFORE INSERT ON meet_participants
  FOR EACH ROW
  EXECUTE FUNCTION check_meet_capacity();

-- ============================================================
-- 3. PREVENT DUPLICATE MEET JOIN
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_meet_participants_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_meet_participants_unique
    ON meet_participants (meet_id, user_id);
  END IF;
END $$;

-- ============================================================
-- 4. PROFILE CONSTRAINTS
-- ============================================================

DO $$
BEGIN
  -- display_name max length
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'profiles_display_name_length'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_display_name_length
      CHECK (char_length(display_name) <= 30);
  END IF;

  -- bio max length
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'profiles_bio_length'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_bio_length
      CHECK (bio IS NULL OR char_length(bio) <= 500);
  END IF;
END $$;

-- ============================================================
-- 5. RATE LIMIT TABLE FOR COMMENTS/MESSAGES
-- Simple spam prevention: max N actions per minute per user
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action_type text NOT NULL, -- 'comment', 'message', 'report', 'post'
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action
  ON rate_limits (user_id, action_type, created_at);

-- Cleanup old entries (keep only last 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM rate_limits WHERE created_at < now() - interval '5 minutes';
$$;

-- Rate limit check function
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_action_type text,
  p_max_per_minute int DEFAULT 10
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recent_count int;
BEGIN
  -- Count actions in last minute
  SELECT count(*) INTO recent_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND action_type = p_action_type
    AND created_at > now() - interval '1 minute';

  IF recent_count >= p_max_per_minute THEN
    RETURN false;
  END IF;

  -- Record the action
  INSERT INTO rate_limits (user_id, action_type) VALUES (p_user_id, p_action_type);

  RETURN true;
END;
$$;

-- Rate limit trigger for comments (max 10/min)
CREATE OR REPLACE FUNCTION enforce_comment_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT check_rate_limit(NEW.user_id, 'comment', 10) THEN
    RAISE EXCEPTION 'Rate limit exceeded: too many comments';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comment_rate_limit ON comments;
CREATE TRIGGER trg_comment_rate_limit
  BEFORE INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION enforce_comment_rate_limit();

-- Rate limit trigger for messages (max 30/min)
CREATE OR REPLACE FUNCTION enforce_message_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT check_rate_limit(NEW.user_id, 'message', 30) THEN
    RAISE EXCEPTION 'Rate limit exceeded: too many messages';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_message_rate_limit ON messages;
CREATE TRIGGER trg_message_rate_limit
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION enforce_message_rate_limit();

-- Rate limit trigger for reports (max 5/min)
CREATE OR REPLACE FUNCTION enforce_report_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT check_rate_limit(NEW.reporter_id, 'report', 5) THEN
    RAISE EXCEPTION 'Rate limit exceeded: too many reports';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_report_rate_limit ON reports;
CREATE TRIGGER trg_report_rate_limit
  BEFORE INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION enforce_report_rate_limit();

-- ============================================================
-- 6. AUDIT LOG TABLE
-- Track admin actions for accountability
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL,
  action text NOT NULL,           -- 'hide_post', 'delete_post', 'hide_comment', 'resolve_report', etc.
  target_type text NOT NULL,      -- 'post', 'comment', 'report', 'user'
  target_id text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON audit_log (admin_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON audit_log (target_type, target_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit log
CREATE POLICY "audit_log_admin_select" ON audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Only admins can insert audit log entries
CREATE POLICY "audit_log_admin_insert" ON audit_log
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 7. PERIODIC RATE LIMIT CLEANUP
-- Call this periodically (e.g., via pg_cron or application)
-- ============================================================

-- To set up automatic cleanup with pg_cron (if available):
-- SELECT cron.schedule('cleanup-rate-limits', '*/5 * * * *', 'SELECT cleanup_rate_limits()');
