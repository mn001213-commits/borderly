-- NGO Posts Category Feature
-- 협력단체 게시글에 카테고리 기능 추가

-- 1. category 컬럼 추가
ALTER TABLE ngo_posts
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- 2. CHECK 제약 조건 추가
ALTER TABLE ngo_posts
ADD CONSTRAINT ngo_posts_category_check
CHECK (category IN (
  'general',
  'environment',
  'education',
  'health',
  'human_rights',
  'community',
  'animal_welfare',
  'disaster_relief',
  'refugee_support',
  'arts_culture',
  'social_gathering'
));

-- 3. 기존 게시글 자동 분류 (키워드 기반)
UPDATE ngo_posts
SET category = CASE
  WHEN title ILIKE ANY(ARRAY['%environment%', '%climate%', '%eco%', '%green%'])
    THEN 'environment'
  WHEN title ILIKE ANY(ARRAY['%education%', '%school%', '%student%', '%learn%'])
    THEN 'education'
  WHEN title ILIKE ANY(ARRAY['%health%', '%medical%', '%hospital%', '%doctor%'])
    THEN 'health'
  WHEN title ILIKE ANY(ARRAY['%rights%', '%justice%', '%equality%'])
    THEN 'human_rights'
  WHEN title ILIKE ANY(ARRAY['%community%', '%local%', '%neighborhood%'])
    THEN 'community'
  WHEN title ILIKE ANY(ARRAY['%animal%', '%wildlife%', '%pet%'])
    THEN 'animal_welfare'
  WHEN title ILIKE ANY(ARRAY['%disaster%', '%emergency%', '%relief%'])
    THEN 'disaster_relief'
  WHEN title ILIKE ANY(ARRAY['%refugee%', '%asylum%', '%displaced%'])
    THEN 'refugee_support'
  WHEN title ILIKE ANY(ARRAY['%art%', '%music%', '%culture%', '%festival%'])
    THEN 'arts_culture'
  WHEN title ILIKE ANY(ARRAY['%meetup%', '%gathering%', '%hangout%', '%social%'])
    THEN 'social_gathering'
  ELSE 'general'
END
WHERE category = 'general';

-- 4. 인덱스 추가 (쿼리 성능 향상)
CREATE INDEX IF NOT EXISTS idx_ngo_posts_category
  ON ngo_posts(category);
CREATE INDEX IF NOT EXISTS idx_ngo_posts_category_created
  ON ngo_posts(category, created_at DESC);
