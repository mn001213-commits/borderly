-- Add representative contact info and activity countries for NGO accounts
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ngo_rep_name TEXT,
  ADD COLUMN IF NOT EXISTS ngo_rep_email TEXT,
  ADD COLUMN IF NOT EXISTS ngo_rep_phone TEXT,
  ADD COLUMN IF NOT EXISTS ngo_activity_countries TEXT[] DEFAULT '{}';
