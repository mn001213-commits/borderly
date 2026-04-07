// 음식 성향 타입
export interface FoodProfile {
  spicy: number;    // 매운 음식 (1~5)
  bland: number;    // 담백한 음식 (1~5)
  sweet: number;    // 달콤한 음식 (1~5)
  aromatic: number; // 향신료 음식 (1~5)
}

// 성향 프로파일 타입
export interface Profile {
  pace: number;          // 생활 속도 (1=느림 ~ 5=빠름)
  social: number;        // 사교성 (1=내향 ~ 5=외향)
  tradition: number;     // 전통 중시 (1=현대 ~ 5=전통)
  order: number;         // 질서/규칙 (1=자유 ~ 5=엄격)
  emotion: number;       // 감정 표현 (1=절제 ~ 5=표현)
  individualism: number; // 개인주의 (1=집단 ~ 5=개인)
  uncertainty: number;   // 불확실성 회피 (1=수용 ~ 5=회피)
  indulgence: number;    // 즐거움 추구 (1=절제 ~ 5=추구)
}

// 지역 클러스터 ID 타입
export type RegionId =
  | 'eastAsia'
  | 'southeastAsia'
  | 'southAsia'
  | 'middleEast'
  | 'europeWest'
  | 'europeSouth'
  | 'africa'
  | 'americas';

// 지역 클러스터 타입
export interface Region {
  id: RegionId;
  name: string;
  profile: Profile;
  food: FoodProfile;
  climate: string;
  religion: string;
}

// 국가 타입
export interface Country {
  id: string;              // ISO 3166-1 alpha-2 코드
  name: string;            // 한글 국가명
  nameEn: string;          // 영문 국가명
  emoji: string;           // 국기 이모지
  region: RegionId;        // 소속 클러스터 ID
  profile: Profile;        // 성향 점수
  food: FoodProfile;       // 음식 성향
  climate: string;         // 기후
  language: string;        // 주요 언어
  description: string;     // 성향 설명
  detail: string;          // 국가 특징
  highlights: [string, string, string]; // 3가지 하이라이트
}

// 음식 타입
export type FoodType = 'spicy' | 'bland' | 'sweet' | 'aromatic';

// 지역 가중치 타입
export type RegionWeights = Partial<Record<RegionId, number>>;

// 성향 점수 타입
export type ProfileScores = Partial<Record<keyof Profile, number>>;

// 질문 선택지 타입
export interface QuestionOption {
  label: string;
  regionWeights?: RegionWeights;  // Phase 1 질문용
  profileScores?: ProfileScores; // Phase 2 질문용
  foodType?: FoodType;           // 음식 질문용
}

// 질문 타입
export interface Question {
  id: number;
  phase: 1 | 2;
  question: string;
  options: QuestionOption[];
}

// 사용자 응답 타입
export interface UserAnswer {
  questionId: number;
  selectedOption: QuestionOption;
}

// 매칭 결과 타입
export interface MatchResult {
  country: Country;
  matchPercent: number;
  topRegions: RegionId[];
  alternatives: Country[];
}

// 퀴즈 상태 타입
export type QuizState = 'landing' | 'quiz' | 'calculating' | 'result';

// 캐릭터 이미지 타입
export type CharacterImage =
  | 'greeting'    // 인사하기
  | 'question'    // 물음표
  | 'writing'     // 기록하기
  | 'confused'    // 당황
  | 'check'       // 체크
  | 'love'        // 사랑하기
  | 'gift'        // 선물하기
  | 'pointing'    // 지시하기
  | 'sleeping'    // 쿨쿨자기
  | 'error';      // x
