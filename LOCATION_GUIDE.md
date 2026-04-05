# 위치 기반 기능 구현 가이드

## 개요

Borderly는 향후 국가별·지역별로 모임(Meet)을 필터링하는 기능을 추가할 예정입니다.  
이 문서는 그 기반이 되는 위치 데이터 설계와 단계별 구현 계획을 설명합니다.

---

## 왜 IP 추적이 아닌가?

| | IP 추적 | 좌표 저장 (채택) |
|---|---|---|
| 정확도 | VPN·모바일·기업망에서 틀림 | 사용자가 직접 입력 → 정확 |
| 앱 특성 | 해외 체류 중 올린 글이 엉뚱한 나라로 분류됨 | 작성자가 원하는 위치 지정 가능 |
| 개인정보 | IP = PII, GDPR 수집 동의 필요 | 좌표는 게시물에 자발적으로 첨부 |

---

## 현재 스키마 (Phase 1)

마이그레이션: `supabase/migrations/20260406_meet_location.sql`

`meet_posts` 테이블에 아래 컬럼이 추가되어 있습니다.

```sql
country_code  TEXT          -- 'KR', 'JP', 'US' (ISO 3166-1 alpha-2), NULL = 미설정
location_name TEXT          -- 사용자에게 표시되는 지역명. e.g. "서울 강남구"
latitude      DECIMAL(9,6)  -- WGS-84 위도
longitude     DECIMAL(10,6) -- WGS-84 경도
```

> **주의**: `latitude` / `longitude` 는 DB 내부 전용입니다.  
> 클라이언트에 절대 그대로 반환하지 마세요. `location_name` + 거리(km)만 노출하세요.

---

## 단계별 구현 계획

### Phase 1 — 지금 완료 ✅

- `meet_posts`에 위치 컬럼 추가 (모두 nullable, 기존 데이터 영향 없음)
- 모임 생성 폼에 위치 입력 UI 추가 *(아직 미구현, 아래 참고)*

### Phase 2 — 국가별 필터링 (단순 쿼리)

국가 선택 필터 UI를 붙이고, 아래처럼 쿼리합니다.

```ts
// meet 목록 조회 시 country_code 필터 추가
const { data } = await supabase
  .from("meet_posts")
  .select("*")
  .eq("country_code", "KR")   // 또는 .is("country_code", null) for 전체
  .order("start_at");
```

### Phase 3 — 근접 거리 필터링 (PostGIS)

> 이 단계는 "내 주변 N km 이내 모임" 기능이 필요해질 때 진행합니다.

**3-1. PostGIS 활성화**  
Supabase Dashboard → Database → Extensions → `postgis` 활성화

**3-2. GEOGRAPHY 컬럼 추가**

```sql
ALTER TABLE meet_posts
  ADD COLUMN location_point GEOGRAPHY(POINT, 4326);

-- 기존 데이터 백필
UPDATE meet_posts
  SET location_point = ST_MakePoint(longitude, latitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 공간 인덱스
CREATE INDEX idx_meet_posts_location_point
  ON meet_posts USING GIST (location_point);
```

**3-3. 거리 기반 쿼리 예시**

```sql
-- 서울 강남 기준 반경 10km 이내 모임, 거리순 정렬
SELECT
  id, title, location_name,
  ST_Distance(
    location_point,
    ST_MakePoint(127.027610, 37.498095)::geography
  ) AS distance_m
FROM meet_posts
WHERE ST_DWithin(
  location_point,
  ST_MakePoint(127.027610, 37.498095)::geography,
  10000  -- 미터 단위
)
ORDER BY distance_m;
```

**3-4. API 응답 예시 (클라이언트에 반환하는 구조)**

```ts
// ❌ 금지: 정확한 좌표 노출
{ latitude: 37.498095, longitude: 127.027610 }

// ✅ 올바른 형태
{ location_name: "서울 강남구", distance_km: 2.3 }
```

---

## 모임 생성 폼 수정 가이드

`app/meet/new/page.tsx` 의 insert 구문에 아래 필드를 추가하면 됩니다.

```ts
// 기존 insert에 추가
.insert({
  // ... 기존 필드들 ...
  country_code:  countryCode  ?? null,   // 'KR' | 'JP' | null
  location_name: locationName ?? null,   // "서울 강남구"
  latitude:      coords?.lat  ?? null,   // number | null
  longitude:     coords?.lng  ?? null,   // number | null
})
```

위치 입력 UI는 두 가지 방식을 고려할 수 있습니다.

| 방식 | 구현 난이도 | 정확도 |
|------|------------|--------|
| 텍스트 직접 입력 (도시명) | 쉬움 | 중간 |
| 지도에서 핀 찍기 (Google Maps / Kakao Maps) | 보통 | 높음 |

초기에는 텍스트 입력 + `country_code` 선택 드롭다운으로 시작해도 충분합니다.

---

## 자주 묻는 것들

**Q. 위치를 입력하지 않은 모임은 어떻게 되나요?**  
모든 컬럼이 nullable이라 기존 모임은 그대로 전체 목록에 노출됩니다.  
필터 적용 시 `country_code IS NULL`인 모임을 "전체" 카테고리로 분류하면 됩니다.

**Q. 사용자 프로필에도 국가가 있지 않나요?**  
`profiles` 테이블에 이미 `country_code` 관련 컬럼이 있습니다 (`20260310_profile_countries.sql` 참고).  
모임 생성 시 작성자의 프로필 국가를 기본값으로 자동 채워주는 것도 좋은 UX입니다.

**Q. posts 테이블(일반 게시글)에도 위치를 추가해야 하나요?**  
일반 게시글은 지역 필터보다 언어/관심사 필터가 더 자연스럽습니다.  
당장은 `meet_posts`에만 적용하고, 필요해지면 같은 패턴으로 확장하면 됩니다.
