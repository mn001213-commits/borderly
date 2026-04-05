-- Migration: Add location columns to meet_posts
-- Purpose: Prepare for country-based and proximity-based meet filtering
-- Phase 1 of 2: Store coordinates now, enable PostGIS queries later
--
-- Phase 2 (future, when proximity filtering is needed):
--   1. Enable PostGIS extension in Supabase Dashboard → Database → Extensions
--   2. Run: ALTER TABLE meet_posts ADD COLUMN location_point GEOGRAPHY(POINT, 4326);
--   3. Run: UPDATE meet_posts SET location_point = ST_MakePoint(longitude, latitude)
--            WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
--   4. Run: CREATE INDEX idx_meet_posts_location_point ON meet_posts USING GIST (location_point);

ALTER TABLE meet_posts
  ADD COLUMN IF NOT EXISTS country_code  TEXT,
  ADD COLUMN IF NOT EXISTS location_name TEXT,
  ADD COLUMN IF NOT EXISTS latitude      DECIMAL(9,6),
  ADD COLUMN IF NOT EXISTS longitude     DECIMAL(10,6);

-- Index for country-level filtering (Phase 1)
CREATE INDEX IF NOT EXISTS idx_meet_posts_country_code ON meet_posts (country_code);

COMMENT ON COLUMN meet_posts.country_code  IS 'ISO 3166-1 alpha-2. e.g. KR, JP, US. NULL means global/unset.';
COMMENT ON COLUMN meet_posts.location_name IS 'Human-readable area shown to users. e.g. 서울 강남구, 東京都渋谷区. Never expose raw coordinates.';
COMMENT ON COLUMN meet_posts.latitude      IS 'WGS-84. Stored for future PostGIS proximity queries. Never returned to client as-is.';
COMMENT ON COLUMN meet_posts.longitude     IS 'WGS-84. Stored for future PostGIS proximity queries. Never returned to client as-is.';
