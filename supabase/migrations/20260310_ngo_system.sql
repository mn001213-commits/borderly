-- ============================================
-- NGO System: user_type, ngo_verified, ngo_posts, ngo_applications
-- ============================================

-- 1) Add user_type and ngo_verified to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'foreigner'
    CHECK (user_type IN ('local', 'foreigner', 'ngo')),
  ADD COLUMN IF NOT EXISTS ngo_verified boolean NOT NULL DEFAULT false;

-- 2) NGO Posts
CREATE TABLE IF NOT EXISTS ngo_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  location text DEFAULT '',
  website_url text DEFAULT '',
  image_url text,
  questions jsonb NOT NULL DEFAULT '[]',
  max_applicants int,
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ngo_posts ENABLE ROW LEVEL SECURITY;

-- Everyone can read ngo_posts
CREATE POLICY "ngo_posts_select" ON ngo_posts
  FOR SELECT USING (true);

-- Only the NGO owner can insert
CREATE POLICY "ngo_posts_insert" ON ngo_posts
  FOR INSERT WITH CHECK (auth.uid() = ngo_user_id);

-- Only the NGO owner can update
CREATE POLICY "ngo_posts_update" ON ngo_posts
  FOR UPDATE USING (auth.uid() = ngo_user_id);

-- Only the NGO owner can delete
CREATE POLICY "ngo_posts_delete" ON ngo_posts
  FOR DELETE USING (auth.uid() = ngo_user_id);

-- 3) NGO Applications
CREATE TABLE IF NOT EXISTS ngo_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_post_id uuid NOT NULL REFERENCES ngo_posts(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ngo_post_id, applicant_id)
);

ALTER TABLE ngo_applications ENABLE ROW LEVEL SECURITY;

-- Applicant can see own applications
CREATE POLICY "ngo_app_select_applicant" ON ngo_applications
  FOR SELECT USING (auth.uid() = applicant_id);

-- NGO owner can see applications for their posts
CREATE POLICY "ngo_app_select_ngo" ON ngo_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ngo_posts
      WHERE ngo_posts.id = ngo_applications.ngo_post_id
        AND ngo_posts.ngo_user_id = auth.uid()
    )
  );

-- Anyone logged in can apply
CREATE POLICY "ngo_app_insert" ON ngo_applications
  FOR INSERT WITH CHECK (auth.uid() = applicant_id);

-- NGO owner can update (approve/reject)
CREATE POLICY "ngo_app_update" ON ngo_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM ngo_posts
      WHERE ngo_posts.id = ngo_applications.ngo_post_id
        AND ngo_posts.ngo_user_id = auth.uid()
    )
  );

-- 4) Add 'ngo' to conversations type (if using check constraint)
-- conversations.type already allows free text, so just use 'ngo' as a value

-- 5) View: ngo_posts with application count and NGO profile info
CREATE OR REPLACE VIEW v_ngo_posts AS
SELECT
  np.*,
  p.display_name AS ngo_name,
  p.avatar_url AS ngo_avatar_url,
  p.ngo_verified,
  (SELECT count(*) FROM ngo_applications na WHERE na.ngo_post_id = np.id) AS application_count,
  (SELECT count(*) FROM ngo_applications na WHERE na.ngo_post_id = np.id AND na.status = 'approved') AS approved_count
FROM ngo_posts np
JOIN profiles p ON p.id = np.ngo_user_id;

-- 6) Admin can update ngo_verified on profiles
-- (Already covered by existing admin RLS or service-role key)
