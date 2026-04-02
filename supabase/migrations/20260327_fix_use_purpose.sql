-- Fix use_purpose column: remove check constraint and change to TEXT[] array

-- First, drop the check constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_use_purpose_check'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_use_purpose_check;
  END IF;
END $$;

-- Change column type from TEXT to TEXT[] if it's not already an array
-- This will work if the column is empty or has valid data
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'profiles' AND column_name = 'use_purpose';

  IF col_type = 'text' THEN
    -- Convert existing comma-separated values to array
    ALTER TABLE profiles
    ALTER COLUMN use_purpose TYPE TEXT[]
    USING CASE
      WHEN use_purpose IS NULL THEN NULL
      WHEN use_purpose = '' THEN '{}'::TEXT[]
      ELSE string_to_array(use_purpose, ', ')
    END;
  ELSIF col_type IS NULL THEN
    -- Column doesn't exist, add it
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS use_purpose TEXT[];
  END IF;
END $$;
