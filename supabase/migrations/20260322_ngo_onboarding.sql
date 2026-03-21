-- Add NGO onboarding fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ngo_org_name TEXT,
  ADD COLUMN IF NOT EXISTS ngo_org_url TEXT,
  ADD COLUMN IF NOT EXISTS ngo_purpose TEXT,
  ADD COLUMN IF NOT EXISTS ngo_status TEXT DEFAULT 'pending'
    CHECK (ngo_status IN ('pending', 'approved', 'rejected'));
