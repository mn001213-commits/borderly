-- Profiles table RLS policies
-- Required for signup to work: authenticated users must be able to insert/update their own profile

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Public read (profiles are visible to all authenticated users)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_select_public'
  ) THEN
    CREATE POLICY "profiles_select_public" ON profiles FOR SELECT USING (true);
  END IF;
END $$;

-- Users can insert their own profile (required during signup)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_insert_own'
  ) THEN
    CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Users can update their own profile
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_update_own'
  ) THEN
    CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;
