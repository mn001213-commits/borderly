-- Remove use_purpose check constraint completely
-- This allows any TEXT[] values in use_purpose column

DO $$
BEGIN
  -- Drop the check constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_use_purpose_check' AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_use_purpose_check;
    RAISE NOTICE 'profiles_use_purpose_check constraint dropped';
  ELSE
    RAISE NOTICE 'profiles_use_purpose_check constraint does not exist';
  END IF;
END $$;

-- Ensure use_purpose column is TEXT[] type
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'use_purpose';

  IF col_type = 'ARRAY' THEN
    RAISE NOTICE 'use_purpose is already an array type';
  ELSIF col_type IS NOT NULL THEN
    RAISE NOTICE 'Converting use_purpose from % to TEXT[]', col_type;
    ALTER TABLE profiles
    ALTER COLUMN use_purpose TYPE TEXT[]
    USING CASE
      WHEN use_purpose IS NULL THEN NULL
      WHEN use_purpose::text = '' THEN '{}'::TEXT[]
      ELSE ARRAY[use_purpose::text]
    END;
  ELSE
    RAISE NOTICE 'use_purpose column does not exist, adding it';
    ALTER TABLE profiles ADD COLUMN use_purpose TEXT[];
  END IF;
END $$;
