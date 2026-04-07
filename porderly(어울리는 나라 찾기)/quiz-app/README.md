# 나와 맞는 나라 찾기 퀴즈

12가지 질문을 통해 당신과 가장 잘 맞는 나라를 찾아주는 인터랙티브 퀴즈 웹앱입니다.

## 주요 기능

- **12개 질문**: 생활 방식, 성향, 음식 취향 등을 파악하는 질문
- **100+ 국가 매칭**: 전 세계 100개 이상의 국가 중 최적의 나라 매칭
- **2단계 매칭 알고리즘**:
  - 1단계 (Q1-Q6): 8개 지역 클러스터 매칭
  - 2단계 (Q7-Q12): 상세 성향 분석
- **상세 결과 제공**: 국가 정보, 음식 성향, 맞는 성향 태그
- **대안 국가 추천**: 비슷한 성향의 다른 나라 3개 추천

## 기술 스택

- **Frontend**: React 18 + TypeScript
- **빌드 도구**: Vite
- **스타일링**: Tailwind CSS
- **애니메이션**: Framer Motion

## 프로젝트 구조

```
src/
├── assets/images/       # 캐릭터 및 배경 이미지
├── components/          # React 컴포넌트
│   ├── Landing.tsx      # 랜딩 페이지
│   ├── Quiz.tsx         # 퀴즈 화면
│   ├── ProgressBar.tsx  # 진행률 표시
│   ├── Calculating.tsx  # 계산 중 화면
│   ├── Result.tsx       # 결과 화면
│   └── Character.tsx    # 캐릭터 컴포넌트
├── data/
│   ├── countries.ts     # 100+ 국가 데이터
│   ├── regions.ts       # 8개 지역 클러스터
│   └── questions.ts     # 12개 질문
├── hooks/
│   └── useQuiz.ts       # 퀴즈 상태 관리 훅
├── types/
│   └── index.ts         # TypeScript 타입 정의
├── utils/
│   └── matchingAlgorithm.ts  # 매칭 알고리즘
├── App.tsx
└── main.tsx
```

## 지역 클러스터

| 클러스터 | 지역 |
|---------|------|
| eastAsia | 동아시아 (한국, 일본, 중국 등) |
| southeastAsia | 동남아시아 (태국, 베트남 등) |
| southAsia | 남아시아 (인도, 네팔 등) |
| middleEast | 중동 (UAE, 터키 등) |
| europeWest | 서유럽 (영국, 독일, 프랑스 등) |
| europeSouth | 남유럽 (이탈리아, 스페인 등) |
| africa | 아프리카 (남아공, 모로코 등) |
| americas | 아메리카 (미국, 브라질 등) |

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 타입 체크
npm run typecheck
```

## 개발 서버

```
http://localhost:5173
```

## 스크린샷

### 랜딩 페이지
캐릭터와 함께 퀴즈 시작을 안내합니다.

### 퀴즈 화면
12개의 질문에 3-4지선다로 답변합니다.

### 결과 화면
- 매칭된 국가와 설명
- 국가 기본 정보 (언어, 기후, 지역)
- 음식 성향 차트
- 맞는 성향 태그
- 대안 국가 추천

## 라이선스

MIT License
