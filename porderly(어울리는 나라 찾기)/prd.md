# Borderly 국가 매칭 퀴즈 PRD

## 1. 제품 개요

### 1.1 목적
Borderly 플랫폼 홍보를 위한 웹 기반 인터랙티브 퀴즈 게임.
사용자의 성향과 문화 취향을 MBTI 스타일의 다지선다 질문으로 파악하여 **전 세계 195개국** 중 가장 잘 맞는 국가를 추천한다.

### 1.2 핵심 컨셉
- **아키네이터 스타일**: 질문을 통해 하나의 결과를 도출
- **MBTI 방식**: 예/아니오가 아닌 n지선다 (3~4개 선택지)
- **195개국 전체 지원**: 지역 클러스터링 + 세부 매칭 2단계 알고리즘
- **테마**: 남극(Antarctica) - 국경 없는 대륙, 글로벌 협력 상징

### 1.3 디자인 방향
- **색상**: Ice Blue (#A8D8EA) / White (#FFFFFF) / Deep Blue (#2E4057)
- **배경**: 배경화면.png (남극/얼음 테마)
- **캐릭터**: 보더리 캐릭터 (상황별 이미지 활용)

---

## 2. 사용자 흐름

```
[Landing Page]
    ↓ 인사하기.png
[캐릭터 소개] "안녕하세요! 저는 보더리입니다"
    ↓ 물음표.png
[퀴즈 시작] 12개 질문 진행
    ↓ 기록하기.png (진행 중)
[1차 계산] 지역 클러스터 결정
    ↓ 쿨쿨자기.png (로딩)
[2차 계산] 세부 국가 매칭
    ↓ 체크.png / 사랑하기.png
[결과 발표] 매칭된 국가 표시
    ↓ 선물하기.png
[Borderly 소개] 홍보 문구
    ↓ 지시하기.png
[CTA] Borderly 사이트 이동
```

### 캐릭터 이미지 활용
| 이미지 | 사용 시점 |
|--------|----------|
| 인사하기.png | 랜딩, 첫 인사 |
| 물음표.png | 질문 중 |
| 기록하기.png | 응답 기록 중 |
| 당황.png | 어려운 질문, 고민 유도 |
| 체크.png | 응답 확인, 진행 완료 |
| 사랑하기.png | 결과 발표 (긍정) |
| 선물하기.png | 결과 선물 연출 |
| 지시하기.png | CTA, 사이트 안내 |
| 쿨쿨자기.png | 로딩, 계산 중 |
| x.png | 에러, 재시도 |

---

## 3. 지역 클러스터링 설계

### 3.1 8개 지역 클러스터

195개국을 8개 문화권/지역으로 1차 분류 후, 해당 지역 내에서 세부 매칭

| 클러스터 | 국가 수 | 대표 국가 | 문화적 특징 |
|----------|---------|-----------|-------------|
| **동아시아** | 6 | 한국, 일본, 중국, 대만, 몽골, 홍콩 | 유교 문화, 집단주의, 높은 교육열 |
| **동남아시아** | 11 | 태국, 베트남, 싱가포르, 말레이시아, 인도네시아, 필리핀 | 불교/이슬람, 친절, 향신료 음식 |
| **남아시아** | 8 | 인도, 파키스탄, 방글라데시, 스리랑카, 네팔 | 힌두/이슬람, 가족 중심, 향신료 |
| **중동/북아프리카** | 22 | UAE, 사우디, 이집트, 터키, 이스라엘, 모로코 | 이슬람, 환대 문화, 사막/오아시스 |
| **유럽 (서/북)** | 25 | 영국, 프랑스, 독일, 네덜란드, 스웨덴 | 개인주의, 효율, 복지 |
| **유럽 (남/동)** | 25 | 이탈리아, 스페인, 그리스, 폴란드, 러시아 | 열정, 가족, 전통 |
| **아프리카 (사하라 이남)** | 48 | 남아공, 케냐, 나이지리아, 가나, 에티오피아 | 공동체, 음악, 다양성 |
| **아메리카/오세아니아** | 50 | 미국, 캐나다, 브라질, 멕시코, 호주, 뉴질랜드 | 다문화, 자유, 자연 |

### 3.2 지역별 성향 프로파일

```javascript
const regionProfiles = {
  eastAsia: {
    id: "eastAsia",
    name: "동아시아",
    pace: 4.5,        // 빠른 생활
    social: 3,        // 중간 (내향 경향)
    tradition: 4,     // 전통 중시
    order: 4.5,       // 질서 중시
    emotion: 2,       // 절제
    food: { spicy: 3, bland: 4, sweet: 3, aromatic: 2 },
    climate: "temperate",
    religion: "buddhism_confucianism"
  },
  southeastAsia: {
    id: "southeastAsia",
    name: "동남아시아",
    pace: 2,          // 느린 생활
    social: 4,        // 외향적
    tradition: 3.5,
    order: 2,         // 유연함
    emotion: 4,       // 표현적
    food: { spicy: 4, bland: 1, sweet: 4, aromatic: 5 },
    climate: "tropical",
    religion: "buddhism_islam"
  },
  southAsia: {
    id: "southAsia",
    name: "남아시아",
    pace: 2.5,
    social: 4,
    tradition: 5,     // 매우 전통적
    order: 2,
    emotion: 4,
    food: { spicy: 5, bland: 1, sweet: 4, aromatic: 5 },
    climate: "tropical_monsoon",
    religion: "hinduism_islam"
  },
  middleEast: {
    id: "middleEast",
    name: "중동/북아프리카",
    pace: 2,
    social: 4.5,      // 환대 문화
    tradition: 5,
    order: 4,
    emotion: 3,
    food: { spicy: 3, bland: 2, sweet: 5, aromatic: 5 },
    climate: "desert",
    religion: "islam"
  },
  europeWest: {
    id: "europeWest",
    name: "서유럽/북유럽",
    pace: 3,
    social: 2.5,      // 개인주의
    tradition: 3,
    order: 4,
    emotion: 2,       // 절제
    food: { spicy: 1, bland: 4, sweet: 4, aromatic: 2 },
    climate: "temperate_cold",
    religion: "christianity_secular"
  },
  europeSouth: {
    id: "europeSouth",
    name: "남유럽/동유럽",
    pace: 2,          // 느린 생활
    social: 5,        // 매우 외향적
    tradition: 4,
    order: 2,
    emotion: 5,       // 매우 표현적
    food: { spicy: 2, bland: 2, sweet: 4, aromatic: 4 },
    climate: "mediterranean",
    religion: "christianity_orthodox"
  },
  africa: {
    id: "africa",
    name: "아프리카",
    pace: 2,
    social: 5,        // 공동체 문화
    tradition: 4,
    order: 2,
    emotion: 5,
    food: { spicy: 4, bland: 2, sweet: 3, aromatic: 4 },
    climate: "tropical_varied",
    religion: "mixed"
  },
  americas: {
    id: "americas",
    name: "아메리카/오세아니아",
    pace: 3.5,
    social: 4,
    tradition: 2,     // 현대적
    order: 3,
    emotion: 4,
    food: { spicy: 3, bland: 3, sweet: 4, aromatic: 3 },
    climate: "varied",
    religion: "christianity_mixed"
  }
};
```

---

## 4. 195개국 데이터 구조

### 4.1 국가 데이터 스키마

```typescript
interface Country {
  id: string;              // ISO 3166-1 alpha-2 코드
  name: string;            // 한글 국가명
  nameEn: string;          // 영문 국가명
  emoji: string;           // 국기 이모지
  region: string;          // 소속 클러스터 ID

  // 성향 점수 (1~5)
  profile: {
    pace: number;          // 생활 속도
    social: number;        // 사교성
    tradition: number;     // 전통 중시
    order: number;         // 질서/규칙
    emotion: number;       // 감정 표현
    individualism: number; // 개인주의 (1=집단 ~ 5=개인)
    uncertainty: number;   // 불확실성 회피
    indulgence: number;    // 즐거움 추구
  };

  // 음식 성향
  food: {
    spicy: number;
    bland: number;
    sweet: number;
    aromatic: number;
  };

  // 추가 특성
  climate: string;         // 기후
  language: string;        // 주요 언어

  // 결과 화면용
  description: string;     // 성향 설명
  detail: string;          // 국가 특징
  highlights: string[];    // 3가지 하이라이트
}
```

### 4.2 데이터 소스 (자동화)

국가별 문화 지표는 다음 공개 데이터 활용:

| 데이터 소스 | 활용 지표 |
|-------------|-----------|
| **Hofstede Insights** | 개인주의, 불확실성 회피, 권력 거리 |
| **World Values Survey** | 전통 vs 세속, 생존 vs 자기표현 |
| **UN Human Development Index** | 생활 수준, 교육 |
| **각국 관광청 데이터** | 음식, 기후, 문화 특징 |

### 4.3 샘플 국가 데이터 (일부)

```javascript
const countries = {
  // 동아시아
  KR: {
    id: "KR",
    name: "한국",
    nameEn: "South Korea",
    emoji: "🇰🇷",
    region: "eastAsia",
    profile: {
      pace: 5, social: 4, tradition: 3,
      order: 4, emotion: 3, individualism: 2,
      uncertainty: 4, indulgence: 3
    },
    food: { spicy: 5, bland: 2, sweet: 3, aromatic: 3 },
    climate: "temperate",
    language: "ko",
    description: "빠른 생활 리듬과 활발한 사회 분위기",
    detail: "에너지 넘치는 도시와 강한 커뮤니티 문화가 특징입니다.",
    highlights: ["K-POP & K-드라마", "빠른 인터넷", "24시간 문화"]
  },
  JP: {
    id: "JP",
    name: "일본",
    nameEn: "Japan",
    emoji: "🇯🇵",
    region: "eastAsia",
    profile: {
      pace: 4, social: 2, tradition: 5,
      order: 5, emotion: 1, individualism: 3,
      uncertainty: 5, indulgence: 2
    },
    food: { spicy: 1, bland: 5, sweet: 4, aromatic: 3 },
    climate: "temperate",
    language: "ja",
    description: "조용하고 질서 있는 환경을 선호",
    detail: "전통과 현대가 공존하는 문화가 특징입니다.",
    highlights: ["장인 정신", "청결함", "사계절의 아름다움"]
  },

  // 동남아시아
  TH: {
    id: "TH",
    name: "태국",
    nameEn: "Thailand",
    emoji: "🇹🇭",
    region: "southeastAsia",
    profile: {
      pace: 2, social: 4, tradition: 4,
      order: 2, emotion: 4, individualism: 2,
      uncertainty: 3, indulgence: 4
    },
    food: { spicy: 4, bland: 1, sweet: 4, aromatic: 5 },
    climate: "tropical",
    language: "th",
    description: "미소와 친절이 넘치는 여유로운 문화",
    detail: "불교 문화와 따뜻한 사람들이 특징입니다.",
    highlights: ["미소의 나라", "길거리 음식", "불교 사원"]
  },
  VN: {
    id: "VN",
    name: "베트남",
    nameEn: "Vietnam",
    emoji: "🇻🇳",
    region: "southeastAsia",
    profile: {
      pace: 3, social: 4, tradition: 4,
      order: 3, emotion: 3, individualism: 2,
      uncertainty: 3, indulgence: 4
    },
    food: { spicy: 3, bland: 2, sweet: 3, aromatic: 5 },
    climate: "tropical",
    language: "vi",
    description: "활기차고 부지런한 에너지",
    detail: "쌀국수와 커피, 오토바이의 나라입니다.",
    highlights: ["쌀국수(포)", "커피 문화", "아름다운 자연"]
  },

  // 남유럽
  IT: {
    id: "IT",
    name: "이탈리아",
    nameEn: "Italy",
    emoji: "🇮🇹",
    region: "europeSouth",
    profile: {
      pace: 2, social: 5, tradition: 4,
      order: 2, emotion: 5, individualism: 4,
      uncertainty: 4, indulgence: 4
    },
    food: { spicy: 2, bland: 2, sweet: 4, aromatic: 4 },
    climate: "mediterranean",
    language: "it",
    description: "음식과 사람을 즐기는 여유로운 라이프스타일",
    detail: "음식 문화와 사회적 교류가 활발한 나라입니다.",
    highlights: ["파스타 & 피자", "가족 중심", "예술의 나라"]
  },
  ES: {
    id: "ES",
    name: "스페인",
    nameEn: "Spain",
    emoji: "🇪🇸",
    region: "europeSouth",
    profile: {
      pace: 1, social: 5, tradition: 3,
      order: 1, emotion: 5, individualism: 3,
      uncertainty: 4, indulgence: 5
    },
    food: { spicy: 2, bland: 2, sweet: 3, aromatic: 4 },
    climate: "mediterranean",
    language: "es",
    description: "열정과 여유가 넘치는 축제의 나라",
    detail: "시에스타와 피에스타의 문화가 있는 곳입니다.",
    highlights: ["시에스타", "플라멩코", "타파스"]
  },

  // 서유럽
  DE: {
    id: "DE",
    name: "독일",
    nameEn: "Germany",
    emoji: "🇩🇪",
    region: "europeWest",
    profile: {
      pace: 4, social: 2, tradition: 3,
      order: 5, emotion: 2, individualism: 4,
      uncertainty: 5, indulgence: 2
    },
    food: { spicy: 1, bland: 4, sweet: 3, aromatic: 2 },
    climate: "temperate",
    language: "de",
    description: "효율과 계획을 중시하는 체계적인 문화",
    detail: "신뢰와 정확성을 바탕으로 한 나라입니다.",
    highlights: ["맥주 축제", "자동차", "성(Castle)"]
  },

  // 아메리카
  US: {
    id: "US",
    name: "미국",
    nameEn: "United States",
    emoji: "🇺🇸",
    region: "americas",
    profile: {
      pace: 4, social: 5, tradition: 1,
      order: 2, emotion: 4, individualism: 5,
      uncertainty: 2, indulgence: 5
    },
    food: { spicy: 2, bland: 3, sweet: 5, aromatic: 2 },
    climate: "varied",
    language: "en",
    description: "자유롭고 도전적인 라이프스타일",
    detail: "다양한 문화가 공존하는 기회의 땅입니다.",
    highlights: ["다양성", "할리우드", "드넓은 자연"]
  },
  BR: {
    id: "BR",
    name: "브라질",
    nameEn: "Brazil",
    emoji: "🇧🇷",
    region: "americas",
    profile: {
      pace: 2, social: 5, tradition: 2,
      order: 1, emotion: 5, individualism: 3,
      uncertainty: 4, indulgence: 5
    },
    food: { spicy: 3, bland: 2, sweet: 4, aromatic: 3 },
    climate: "tropical",
    language: "pt",
    description: "축제와 열정이 가득한 에너지 넘치는 문화",
    detail: "삼바와 축구, 자연이 어우러진 나라입니다.",
    highlights: ["카니발", "축구", "아마존"]
  },

  // ... 나머지 186개국 데이터
};
```

---

## 5. 질문 설계 (12개)

### 5.1 질문 구조
- **총 질문 수**: 12개
- **선택지 수**: 3~4개
- **1차 목표**: 지역 클러스터 결정 (Q1~Q6)
- **2차 목표**: 세부 성향 파악 (Q7~Q12)

### 5.2 질문 목록

---

#### Phase 1: 지역 클러스터 결정 (Q1~Q6)

---

**Q1. 기후 선호 (climate)**
> 어떤 기후에서 살고 싶나요?

| 선택지 | 클러스터 가중치 |
|--------|----------------|
| A. 사계절이 뚜렷한 온대 기후 | eastAsia +3, europeWest +2 |
| B. 일년 내내 따뜻한 열대 기후 | southeastAsia +3, africa +2 |
| C. 건조하고 맑은 날씨 | middleEast +3, europeSouth +1 |
| D. 서늘하고 쾌적한 기후 | europeWest +3, americas +2 |

---

**Q2. 음식 취향 (food)**
> 어떤 음식 스타일을 좋아하나요?

| 선택지 | 클러스터 가중치 |
|--------|----------------|
| A. 매운 음식 | southAsia +3, eastAsia +2 |
| B. 담백하고 깔끔한 음식 | europeWest +3, eastAsia +2 |
| C. 달콤한 디저트와 음식 | middleEast +2, americas +2 |
| D. 향신료가 풍부한 음식 | southeastAsia +3, southAsia +2, middleEast +1 |

---

**Q3. 사회적 분위기 (social)**
> 어떤 사회 분위기가 편한가요?

| 선택지 | 클러스터 가중치 |
|--------|----------------|
| A. 열정적이고 표현이 자유로운 | europeSouth +3, americas +2, africa +2 |
| B. 조용하고 개인 공간을 존중하는 | europeWest +3, eastAsia +2 |
| C. 따뜻하고 환대하는 | middleEast +3, southeastAsia +2 |
| D. 가족과 공동체 중심의 | southAsia +3, africa +2 |

---

**Q4. 생활 속도 (pace)**
> 이상적인 하루의 리듬은?

| 선택지 | 클러스터 가중치 |
|--------|----------------|
| A. 빠르고 효율적으로 | eastAsia +3, europeWest +2 |
| B. 느긋하게, 시에스타도 좋아 | europeSouth +3, americas +1 |
| C. 자연의 리듬에 맞춰서 | africa +3, southeastAsia +2 |
| D. 상황에 따라 유연하게 | americas +2, southeastAsia +1 |

---

**Q5. 종교/영성 (spirituality)**
> 일상에서 종교나 영성의 역할은?

| 선택지 | 클러스터 가중치 |
|--------|----------------|
| A. 매우 중요함, 일상의 일부 | middleEast +3, southAsia +3 |
| B. 전통으로서 존중함 | eastAsia +2, europeSouth +2 |
| C. 개인적 선택, 크게 중요하지 않음 | europeWest +3, americas +2 |
| D. 자연과 조상을 존중함 | africa +3, southeastAsia +2 |

---

**Q6. 문화 활동 (activity)**
> 여가 시간에 가장 하고 싶은 것은?

| 선택지 | 클러스터 가중치 |
|--------|----------------|
| A. 박물관, 역사 유적 탐방 | europeWest +2, middleEast +2 |
| B. 축제, 음악, 춤 | americas +3, africa +2, europeSouth +2 |
| C. 맛집 탐방, 미식 여행 | eastAsia +2, europeSouth +2 |
| D. 자연 속에서 휴식 | southeastAsia +2, americas +1 |

---

#### Phase 2: 세부 성향 파악 (Q7~Q12)

---

**Q7. 규칙과 자유 (order)**
> 어떤 환경이 더 편안한가요?

| 선택지 | 성향 점수 |
|--------|----------|
| A. 모든 것이 체계적이고 예측 가능한 | order: +3 |
| B. 자유롭고 즉흥적인 | order: -3 |
| C. 기본 틀은 있지만 유연한 | order: +0 |

---

**Q8. 감정 표현 (emotion)**
> 기쁠 때 어떻게 표현하나요?

| 선택지 | 성향 점수 |
|--------|----------|
| A. 큰 소리로 웃고, 포옹하고, 춤추기 | emotion: +3 |
| B. 미소 짓고 조용히 즐기기 | emotion: -2 |
| C. 가까운 사람들과 나누기 | emotion: +1 |
| D. 내면으로 깊이 느끼기 | emotion: -1 |

---

**Q9. 사교 스타일 (social)**
> 새로운 사람을 만나면?

| 선택지 | 성향 점수 |
|--------|----------|
| A. 적극적으로 다가가 대화 시작 | social: +3 |
| B. 상대가 먼저 말 걸기를 기다림 | social: -2 |
| C. 공통 관심사가 있으면 자연스럽게 | social: +1 |
| D. 작은 모임을 선호함 | social: -1 |

---

**Q10. 전통과 현대 (tradition)**
> 여행지에서 더 끌리는 것은?

| 선택지 | 성향 점수 |
|--------|----------|
| A. 천년 역사의 유적과 전통 마을 | tradition: +3 |
| B. 최신 트렌드의 현대 도시 | tradition: -3 |
| C. 전통과 현대가 조화로운 곳 | tradition: +0 |

---

**Q11. 개인 vs 집단 (individualism)**
> 중요한 결정을 내릴 때?

| 선택지 | 성향 점수 |
|--------|----------|
| A. 내 판단이 가장 중요함 | individualism: +3 |
| B. 가족/친구의 의견을 많이 참고함 | individualism: -2 |
| C. 전문가의 조언을 구함 | individualism: +1 |
| D. 모두의 의견을 종합해서 결정 | individualism: -1 |

---

**Q12. 즐거움 추구 (indulgence)**
> 스트레스를 받으면 어떻게 하나요?

| 선택지 | 성향 점수 |
|--------|----------|
| A. 맛있는 음식, 쇼핑 등 즐거운 활동 | indulgence: +3 |
| B. 참고 견디며 일에 집중 | indulgence: -3 |
| C. 운동이나 취미로 풀기 | indulgence: +1 |
| D. 가까운 사람과 대화하기 | indulgence: +0 |

---

## 6. 2단계 매칭 알고리즘

### 6.1 알고리즘 흐름

```
[사용자 응답]
     ↓
[Phase 1] Q1~Q6 응답으로 지역 클러스터 점수 계산
     ↓
[상위 2개 클러스터 선택]
     ↓
[Phase 2] Q7~Q12 응답으로 세부 성향 점수 계산
     ↓
[선택된 클러스터 내 국가들과 유사도 비교]
     ↓
[최종 국가 결정]
```

### 6.2 구현 코드

```javascript
function calculateMatch(userAnswers) {
  // ========== Phase 1: 지역 클러스터 결정 ==========
  const regionScores = {
    eastAsia: 0,
    southeastAsia: 0,
    southAsia: 0,
    middleEast: 0,
    europeWest: 0,
    europeSouth: 0,
    africa: 0,
    americas: 0
  };

  // Q1~Q6 응답에서 지역 점수 집계
  userAnswers.slice(0, 6).forEach(answer => {
    Object.entries(answer.regionWeights).forEach(([region, weight]) => {
      regionScores[region] += weight;
    });
  });

  // 상위 2개 지역 선택
  const topRegions = Object.entries(regionScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([region]) => region);

  // ========== Phase 2: 세부 성향 파악 ==========
  const userProfile = {
    pace: 3,          // 기본값 (중간)
    social: 3,
    tradition: 3,
    order: 3,
    emotion: 3,
    individualism: 3,
    uncertainty: 3,
    indulgence: 3
  };

  // Q7~Q12 응답에서 성향 점수 집계
  userAnswers.slice(6, 12).forEach(answer => {
    Object.entries(answer.profileScores).forEach(([trait, score]) => {
      userProfile[trait] += score;
    });
  });

  // 점수 범위 제한 (1~5)
  Object.keys(userProfile).forEach(key => {
    userProfile[key] = Math.max(1, Math.min(5, userProfile[key]));
  });

  // ========== 국가 매칭 ==========
  // 선택된 지역의 국가들만 필터링
  const candidateCountries = Object.values(countries)
    .filter(country => topRegions.includes(country.region));

  // 각 국가와 유사도 계산 (유클리드 거리)
  const similarities = candidateCountries.map(country => {
    let distance = 0;

    // 8개 성향 축 비교
    Object.keys(userProfile).forEach(trait => {
      if (country.profile[trait] !== undefined) {
        distance += Math.pow(userProfile[trait] - country.profile[trait], 2);
      }
    });

    // 음식 취향 추가 (Phase 1에서 수집)
    const foodAnswer = userAnswers[1]; // Q2
    if (foodAnswer.foodType && country.food[foodAnswer.foodType]) {
      distance += Math.pow(3 - country.food[foodAnswer.foodType], 2);
    }

    return {
      country,
      distance,
      similarity: 1 / (1 + Math.sqrt(distance))
    };
  });

  // 유사도 순으로 정렬
  similarities.sort((a, b) => b.similarity - a.similarity);

  // 최종 결과 반환
  const bestMatch = similarities[0];
  const matchPercent = Math.round(bestMatch.similarity * 100);

  return {
    country: bestMatch.country,
    matchPercent,
    topRegions,
    alternatives: similarities.slice(1, 4).map(s => s.country) // 차순위 3개국
  };
}
```

### 6.3 결과 표시

```javascript
const result = calculateMatch(userAnswers);

// 결과 화면 데이터
{
  mainResult: {
    country: "🇮🇹 이탈리아",
    matchPercent: 87,
    description: "음식과 사람을 즐기는 여유로운 라이프스타일을 선호합니다.",
    detail: "음식 문화와 사회적 교류가 활발한 나라입니다.",
    highlights: ["파스타 & 피자", "가족 중심", "예술의 나라"]
  },
  alternatives: [
    { country: "🇪🇸 스페인", matchPercent: 82 },
    { country: "🇬🇷 그리스", matchPercent: 79 },
    { country: "🇵🇹 포르투갈", matchPercent: 76 }
  ]
}
```

---

## 7. 화면 설계

### 7.1 Landing Page
```
┌─────────────────────────────────────┐
│           [배경화면.png]              │
│                                     │
│         ┌─────────────┐             │
│         │ 인사하기.png │             │
│         └─────────────┘             │
│                                     │
│    "안녕하세요! 저는 보더리입니다"     │
│    "국경을 넘어 사람들을 연결합니다"   │
│                                     │
│    "12가지 질문에 답하면              │
│     195개국 중 당신과 잘 맞는         │
│     나라를 찾아드릴게요!"             │
│                                     │
│         [퀴즈 시작하기]               │
│                                     │
└─────────────────────────────────────┘
```

### 7.2 퀴즈 진행 화면
```
┌─────────────────────────────────────┐
│ [진행 바: ████████░░░░ 8/12]        │
│                                     │
│     ┌─────────────┐                 │
│     │ 물음표.png   │                 │
│     └─────────────┘                 │
│                                     │
│  Q8. 기쁠 때 어떻게 표현하나요?       │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ A. 큰 소리로 웃고, 춤추기    │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ B. 미소 짓고 조용히 즐기기   │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ C. 가까운 사람들과 나누기    │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ D. 내면으로 깊이 느끼기      │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

### 7.3 결과 화면
```
┌─────────────────────────────────────┐
│           [배경화면.png]              │
│                                     │
│         ┌─────────────┐             │
│         │ 사랑하기.png │             │
│         └─────────────┘             │
│                                     │
│   당신과 잘 맞는 나라는               │
│         🇮🇹 이탈리아입니다!           │
│                                     │
│        [매칭률: 87%]                 │
│                                     │
│   "음식과 사람을 즐기는               │
│    여유로운 라이프스타일"             │
│                                     │
│   ✦ 파스타 & 피자                    │
│   ✦ 가족 중심                        │
│   ✦ 예술의 나라                      │
│                                     │
│   ─── 이런 나라도 잘 맞아요 ───       │
│   🇪🇸 스페인 82%  🇬🇷 그리스 79%      │
│                                     │
│   ─────────────────────────         │
│                                     │
│      [결과 공유하기] [다시하기]       │
│                                     │
│   ─────────────────────────         │
│         ┌─────────────┐             │
│         │ 지시하기.png │             │
│         └─────────────┘             │
│                                     │
│   "Borderly에서 전 세계 친구를        │
│    만나보세요!"                       │
│                                     │
│      [Borderly 시작하기]             │
│                                     │
└─────────────────────────────────────┘
```

---

## 8. 기술 스택

### 8.1 권장 스택
- **Frontend**: React + TypeScript
- **Styling**: Tailwind CSS
- **애니메이션**: Framer Motion
- **배포**: Vercel / Netlify
- **데이터**: JSON 파일 (195개국)

### 8.2 폴더 구조
```
src/
├── components/
│   ├── Landing.tsx
│   ├── Quiz.tsx
│   ├── Question.tsx
│   ├── ProgressBar.tsx
│   ├── Result.tsx
│   ├── AlternativeCountries.tsx
│   ├── ShareButtons.tsx
│   └── Character.tsx
├── data/
│   ├── questions.ts        # 12개 질문
│   ├── regions.ts          # 8개 지역 클러스터
│   └── countries.ts        # 195개국 데이터
├── hooks/
│   └── useQuiz.ts
├── utils/
│   ├── matchingAlgorithm.ts
│   └── calculateSimilarity.ts
├── types/
│   └── index.ts
├── assets/
│   └── images/
└── App.tsx
```

---

## 9. 195개국 데이터 (정적 데이터)

### 9.1 데이터 저장 방식

**모든 국가 데이터는 개발 시점에 미리 작성하여 정적 파일로 저장합니다.**

```
[개발 단계]
195개국 데이터 작성 (1회성 작업)
    ↓
src/data/countries.ts 파일로 저장
    ↓
[런타임]
퀴즈 앱에서 이 파일을 import하여 사용
(API 호출 없음, 동적 생성 없음)
```

### 9.2 데이터 작성 방식

| 구분 | 국가 수 | 작성 방법 |
|------|---------|----------|
| **주요 국가** | 50개 | 직접 조사하여 수동 입력 |
| **일반 국가** | 145개 | 소속 지역 클러스터 기본값 + 국가별 미세 조정 |

### 9.3 데이터 참고 자료

데이터 작성 시 참고할 수 있는 공개 자료:

| 자료 | 활용 지표 |
|------|----------|
| Hofstede Insights | 개인주의, 불확실성 회피, 권력 거리 |
| World Values Survey | 전통 vs 세속, 생존 vs 자기표현 |
| 각국 관광청/위키피디아 | 음식, 기후, 문화 특징, 하이라이트 |

### 9.4 주요 50개국 목록

**동아시아 (6)**
한국, 일본, 중국, 대만, 홍콩, 몽골

**동남아시아 (10)**
태국, 베트남, 싱가포르, 말레이시아, 인도네시아, 필리핀, 미얀마, 캄보디아, 라오스, 브루나이

**남아시아 (5)**
인도, 파키스탄, 방글라데시, 스리랑카, 네팔

**중동/북아프리카 (7)**
UAE, 사우디아라비아, 터키, 이집트, 이스라엘, 모로코, 카타르

**서유럽/북유럽 (8)**
영국, 프랑스, 독일, 네덜란드, 스위스, 스웨덴, 노르웨이, 덴마크

**남유럽/동유럽 (7)**
이탈리아, 스페인, 그리스, 포르투갈, 폴란드, 러시아, 체코

**아프리카 (3)**
남아공, 케냐, 나이지리아

**아메리카/오세아니아 (4)**
미국, 캐나다, 브라질, 멕시코, 호주, 뉴질랜드

### 9.5 일반 국가 데이터 생성 규칙

나머지 145개국은 소속 클러스터의 평균값을 기본으로 사용:

```javascript
// 예: 라오스 (동남아시아 클러스터)
const laos = {
  id: "LA",
  name: "라오스",
  emoji: "🇱🇦",
  region: "southeastAsia",
  // 동남아시아 클러스터 기본값 사용
  profile: { ...regionProfiles.southeastAsia },
  food: { ...regionProfiles.southeastAsia.food },
  // 국가별 특징만 개별 작성
  description: "조용하고 평화로운 불교의 나라",
  detail: "메콩강과 사원이 어우러진 숨겨진 보석입니다.",
  highlights: ["루앙프라방", "메콩강", "탁발 문화"]
};
```

---

## 10. 추가 기능

### 10.1 결과 공유
- 카카오톡 공유
- 트위터/X 공유
- 이미지로 저장 (html2canvas)

### 10.2 통계 (관리자용)
- 질문별 응답 분포
- 국가별 매칭 빈도 TOP 20
- 지역별 매칭 분포
- 일일/주간 방문자 수

### 10.3 다국어 지원
- 한국어 (기본)
- 영어
- 일본어

---

## 11. 체크리스트

### MVP 필수 기능
- [x] 랜딩 페이지
- [x] 12개 질문 UI
- [x] 8개 지역 클러스터 데이터
- [x] 2단계 매칭 알고리즘
- [x] 195개국 기본 데이터
- [x] 결과 화면 (메인 + 차순위)
- [x] 반응형 디자인 (모바일 우선)

### 데이터 작업
- [x] 주요 50개국 상세 데이터 작성
- [x] 나머지 145개국 데이터 작성 (클러스터 기본값 + 개별 특징)
- [x] 전체 데이터 검수 및 보정

### 추가 기능
- [x] 결과 공유 기능
- [x] 애니메이션 효과
- [x] 다시하기 기능
- [x] Borderly 사이트 연결

---

## 12. 일정 (예상)

| 단계 | 작업 내용 |
|------|----------|
| 1단계 | 프로젝트 셋업, 데이터 구조 정의 |
| 2단계 | 195개국 데이터 작성 (정적 JSON/TS 파일) |
| 3단계 | 질문/결과 화면 UI 구현 |
| 4단계 | 2단계 매칭 알고리즘 구현 |
| 5단계 | 캐릭터 이미지 연동, 애니메이션 |
| 6단계 | 테스트 및 배포 |
