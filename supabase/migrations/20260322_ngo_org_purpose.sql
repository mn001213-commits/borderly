-- 단체 목적 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ngo_org_purpose text;
