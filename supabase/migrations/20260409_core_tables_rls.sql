-- ============================================================
-- Core Tables RLS
-- Tables created before migration tracking began (via Supabase dashboard)
-- had no RLS. This migration enables RLS and adds appropriate policies
-- for all affected tables.
-- ============================================================

-- ============================================================
-- 1. POSTS
-- ============================================================
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Public can read visible posts
CREATE POLICY "posts_select_public" ON posts
  FOR SELECT USING (is_hidden = false OR is_hidden IS NULL);

-- Owners can always read their own posts (including hidden)
CREATE POLICY "posts_select_own" ON posts
  FOR SELECT USING (auth.uid() = user_id);

-- Authenticated users can create posts
CREATE POLICY "posts_insert" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Owners can update their own posts
CREATE POLICY "posts_update_own" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can update any post (e.g., is_hidden)
CREATE POLICY "posts_update_admin" ON posts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Owners can delete their own posts
CREATE POLICY "posts_delete_own" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can delete any post
CREATE POLICY "posts_delete_admin" ON posts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 2. COMMENTS
-- ============================================================
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Public can read visible comments
CREATE POLICY "comments_select_public" ON comments
  FOR SELECT USING (is_hidden = false OR is_hidden IS NULL);

-- Owners can always read their own comments
CREATE POLICY "comments_select_own" ON comments
  FOR SELECT USING (auth.uid() = user_id);

-- Authenticated users can post comments
CREATE POLICY "comments_insert" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can update any comment (e.g., is_hidden)
CREATE POLICY "comments_update_admin" ON comments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Owners can delete their own comments
CREATE POLICY "comments_delete_own" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can delete any comment
CREATE POLICY "comments_delete_admin" ON comments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 3. FOLLOWS
-- ============================================================
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all follows (needed for follower/following counts on profiles)
CREATE POLICY "follows_select" ON follows
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can only create their own follow relationships
CREATE POLICY "follows_insert" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Users can only unfollow (delete) their own follow relationships
CREATE POLICY "follows_delete" ON follows
  FOR DELETE USING (auth.uid() = follower_id);

-- ============================================================
-- 4. BLOCKS
-- ============================================================
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own blocks (private)
CREATE POLICY "blocks_select" ON blocks
  FOR SELECT USING (auth.uid() = blocker_id);

-- Users can only block others as themselves
CREATE POLICY "blocks_insert" ON blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

-- Users can only unblock their own blocks
CREATE POLICY "blocks_delete" ON blocks
  FOR DELETE USING (auth.uid() = blocker_id);

-- ============================================================
-- 5. CLOSE FRIENDS
-- ============================================================
ALTER TABLE close_friends ENABLE ROW LEVEL SECURITY;

-- Users can only see their own close friends list
CREATE POLICY "close_friends_select" ON close_friends
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only add to their own close friends
CREATE POLICY "close_friends_insert" ON close_friends
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only remove from their own close friends
CREATE POLICY "close_friends_delete" ON close_friends
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 6. CONVERSATIONS
-- ============================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Only members of a conversation can see it
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = conversations.id
        AND conversation_members.user_id = auth.uid()
    )
  );

-- Authenticated users can create conversations
CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Members can update group conversation metadata (name, avatar)
CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = conversations.id
        AND conversation_members.user_id = auth.uid()
    )
  );

-- ============================================================
-- 7. CONVERSATION MEMBERS
-- ============================================================
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;

-- Users can see members of conversations they belong to
CREATE POLICY "conversation_members_select" ON conversation_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm2
      WHERE cm2.conversation_id = conversation_members.conversation_id
        AND cm2.user_id = auth.uid()
    )
  );

-- Authenticated users can add members (when creating conversations or inviting)
CREATE POLICY "conversation_members_insert" ON conversation_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can only remove themselves (leave conversation)
CREATE POLICY "conversation_members_delete_self" ON conversation_members
  FOR DELETE USING (auth.uid() = user_id);

-- Group admins can remove other members
CREATE POLICY "conversation_members_delete_admin" ON conversation_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm2
      WHERE cm2.conversation_id = conversation_members.conversation_id
        AND cm2.user_id = auth.uid()
        AND cm2.role = 'admin'
    )
  );

-- Members can update their own membership record (e.g., role changes when promoted)
CREATE POLICY "conversation_members_update" ON conversation_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm2
      WHERE cm2.conversation_id = conversation_members.conversation_id
        AND cm2.user_id = auth.uid()
        AND cm2.role = 'admin'
    )
  );

-- ============================================================
-- 8. MESSAGES
-- ============================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Only members of a conversation can read its messages
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = messages.conversation_id
        AND conversation_members.user_id = auth.uid()
    )
  );

-- Only members can send messages to a conversation
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = messages.conversation_id
        AND conversation_members.user_id = auth.uid()
    )
  );

-- Senders can delete their own messages
CREATE POLICY "messages_delete" ON messages
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 9. MEET POSTS
-- ============================================================
ALTER TABLE meet_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read meet posts (public discovery)
CREATE POLICY "meet_posts_select" ON meet_posts
  FOR SELECT USING (true);

-- Authenticated users can create meet posts
CREATE POLICY "meet_posts_insert" ON meet_posts
  FOR INSERT WITH CHECK (auth.uid() = host_id);

-- Only the host can update their meet post
CREATE POLICY "meet_posts_update" ON meet_posts
  FOR UPDATE USING (auth.uid() = host_id);

-- Only the host can delete their meet post
CREATE POLICY "meet_posts_delete" ON meet_posts
  FOR DELETE USING (auth.uid() = host_id);

-- ============================================================
-- 10. MEET PARTICIPANTS
-- ============================================================
ALTER TABLE meet_participants ENABLE ROW LEVEL SECURITY;

-- Anyone can see who's joining a meet (public)
CREATE POLICY "meet_participants_select" ON meet_participants
  FOR SELECT USING (true);

-- Authenticated users can join a meet as themselves
CREATE POLICY "meet_participants_insert" ON meet_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can leave (delete) their own participation
CREATE POLICY "meet_participants_delete_self" ON meet_participants
  FOR DELETE USING (auth.uid() = user_id);

-- Meet host can remove participants
CREATE POLICY "meet_participants_delete_host" ON meet_participants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM meet_posts
      WHERE meet_posts.id = meet_participants.meet_id
        AND meet_posts.host_id = auth.uid()
    )
  );

-- Meet host or participant can update status (e.g., approve/reject in managed meets)
CREATE POLICY "meet_participants_update" ON meet_participants
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM meet_posts
      WHERE meet_posts.id = meet_participants.meet_id
        AND meet_posts.host_id = auth.uid()
    )
  );

-- ============================================================
-- 11. NOTIFICATIONS
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Any authenticated user can create notifications for others
-- (triggered by follow, like, comment, meet join events from client)
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can mark their own notifications as read
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "notifications_delete" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 12. REPORTS
-- ============================================================
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Reporters can see their own reports
CREATE POLICY "reports_select_own" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Admins can see all reports
CREATE POLICY "reports_select_admin" ON reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Authenticated users can file reports
CREATE POLICY "reports_insert" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Admins can update reports (e.g., status, resolution)
CREATE POLICY "reports_update_admin" ON reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can delete resolved reports
CREATE POLICY "reports_delete_admin" ON reports
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 13. RATE LIMITS
-- No direct client access. All operations go through
-- SECURITY DEFINER functions (check_rate_limit, cleanup_rate_limits).
-- ============================================================
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- No SELECT policy: clients cannot read rate limit records
-- No INSERT policy: clients cannot insert directly (SECURITY DEFINER only)
-- Admins can read for debugging purposes
CREATE POLICY "rate_limits_admin_select" ON rate_limits
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 14. MESSAGE REPORTS
-- Only accessed via supabaseAdmin (service role) in API routes.
-- Service role bypasses RLS. Add restrictive client policy as a safeguard.
-- ============================================================
ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can file message reports
CREATE POLICY "message_reports_insert" ON message_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Reporters can view their own reports
CREATE POLICY "message_reports_select_own" ON message_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- ============================================================
-- 15. CONVERSATION REPORTS
-- Only accessed via supabaseAdmin (service role) in API routes.
-- ============================================================
ALTER TABLE conversation_reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can file conversation reports
CREATE POLICY "conversation_reports_insert" ON conversation_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Reporters can view their own reports
CREATE POLICY "conversation_reports_select_own" ON conversation_reports
  FOR SELECT USING (auth.uid() = reporter_id);
