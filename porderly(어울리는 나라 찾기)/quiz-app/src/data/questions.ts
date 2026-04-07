import type { Question } from '../types';

export const questions: Question[] = [
  // ========== Phase 1: 지역 클러스터 결정 (Q1~Q6) ==========
  {
    id: 1,
    phase: 1,
    question: '어떤 기후에서 살고 싶나요?',
    options: [
      {
        label: '사계절이 뚜렷한 온대 기후',
        regionWeights: { eastAsia: 3, europeWest: 2 }
      },
      {
        label: '일년 내내 따뜻한 열대 기후',
        regionWeights: { southeastAsia: 3, africa: 2 }
      },
      {
        label: '건조하고 맑은 날씨',
        regionWeights: { middleEast: 3, europeSouth: 1 }
      },
      {
        label: '서늘하고 쾌적한 기후',
        regionWeights: { europeWest: 3, americas: 2 }
      }
    ]
  },
  {
    id: 2,
    phase: 1,
    question: '어떤 음식 스타일을 좋아하나요?',
    options: [
      {
        label: '매운 음식',
        regionWeights: { southAsia: 3, eastAsia: 2 },
        foodType: 'spicy'
      },
      {
        label: '담백하고 깔끔한 음식',
        regionWeights: { europeWest: 3, eastAsia: 2 },
        foodType: 'bland'
      },
      {
        label: '달콤한 디저트와 음식',
        regionWeights: { middleEast: 2, americas: 2 },
        foodType: 'sweet'
      },
      {
        label: '향신료가 풍부한 음식',
        regionWeights: { southeastAsia: 3, southAsia: 2, middleEast: 1 },
        foodType: 'aromatic'
      }
    ]
  },
  {
    id: 3,
    phase: 1,
    question: '어떤 사회 분위기가 편한가요?',
    options: [
      {
        label: '열정적이고 표현이 자유로운',
        regionWeights: { europeSouth: 3, americas: 2, africa: 2 }
      },
      {
        label: '조용하고 개인 공간을 존중하는',
        regionWeights: { europeWest: 3, eastAsia: 2 }
      },
      {
        label: '따뜻하고 환대하는',
        regionWeights: { middleEast: 3, southeastAsia: 2 }
      },
      {
        label: '가족과 공동체 중심의',
        regionWeights: { southAsia: 3, africa: 2 }
      }
    ]
  },
  {
    id: 4,
    phase: 1,
    question: '이상적인 하루의 리듬은?',
    options: [
      {
        label: '빠르고 효율적으로',
        regionWeights: { eastAsia: 3, europeWest: 2 }
      },
      {
        label: '느긋하게, 시에스타도 좋아',
        regionWeights: { europeSouth: 3, americas: 1 }
      },
      {
        label: '자연의 리듬에 맞춰서',
        regionWeights: { africa: 3, southeastAsia: 2 }
      },
      {
        label: '상황에 따라 유연하게',
        regionWeights: { americas: 2, southeastAsia: 1 }
      }
    ]
  },
  {
    id: 5,
    phase: 1,
    question: '일상에서 종교나 영성의 역할은?',
    options: [
      {
        label: '매우 중요함, 일상의 일부',
        regionWeights: { middleEast: 3, southAsia: 3 }
      },
      {
        label: '전통으로서 존중함',
        regionWeights: { eastAsia: 2, europeSouth: 2 }
      },
      {
        label: '개인적 선택, 크게 중요하지 않음',
        regionWeights: { europeWest: 3, americas: 2 }
      },
      {
        label: '자연과 조상을 존중함',
        regionWeights: { africa: 3, southeastAsia: 2 }
      }
    ]
  },
  {
    id: 6,
    phase: 1,
    question: '여가 시간에 가장 하고 싶은 것은?',
    options: [
      {
        label: '박물관, 역사 유적 탐방',
        regionWeights: { europeWest: 2, middleEast: 2 }
      },
      {
        label: '축제, 음악, 춤',
        regionWeights: { americas: 3, africa: 2, europeSouth: 2 }
      },
      {
        label: '맛집 탐방, 미식 여행',
        regionWeights: { eastAsia: 2, europeSouth: 2 }
      },
      {
        label: '자연 속에서 휴식',
        regionWeights: { southeastAsia: 2, americas: 1 }
      }
    ]
  },

  // ========== Phase 2: 세부 성향 파악 (Q7~Q12) ==========
  {
    id: 7,
    phase: 2,
    question: '어떤 환경이 더 편안한가요?',
    options: [
      {
        label: '모든 것이 체계적이고 예측 가능한',
        profileScores: { order: 3 }
      },
      {
        label: '자유롭고 즉흥적인',
        profileScores: { order: -3 }
      },
      {
        label: '기본 틀은 있지만 유연한',
        profileScores: { order: 0 }
      }
    ]
  },
  {
    id: 8,
    phase: 2,
    question: '기쁠 때 어떻게 표현하나요?',
    options: [
      {
        label: '큰 소리로 웃고, 포옹하고, 춤추기',
        profileScores: { emotion: 3 }
      },
      {
        label: '미소 짓고 조용히 즐기기',
        profileScores: { emotion: -2 }
      },
      {
        label: '가까운 사람들과 나누기',
        profileScores: { emotion: 1 }
      },
      {
        label: '내면으로 깊이 느끼기',
        profileScores: { emotion: -1 }
      }
    ]
  },
  {
    id: 9,
    phase: 2,
    question: '새로운 사람을 만나면?',
    options: [
      {
        label: '적극적으로 다가가 대화 시작',
        profileScores: { social: 3 }
      },
      {
        label: '상대가 먼저 말 걸기를 기다림',
        profileScores: { social: -2 }
      },
      {
        label: '공통 관심사가 있으면 자연스럽게',
        profileScores: { social: 1 }
      },
      {
        label: '작은 모임을 선호함',
        profileScores: { social: -1 }
      }
    ]
  },
  {
    id: 10,
    phase: 2,
    question: '여행지에서 더 끌리는 것은?',
    options: [
      {
        label: '천년 역사의 유적과 전통 마을',
        profileScores: { tradition: 3 }
      },
      {
        label: '최신 트렌드의 현대 도시',
        profileScores: { tradition: -3 }
      },
      {
        label: '전통과 현대가 조화로운 곳',
        profileScores: { tradition: 0 }
      }
    ]
  },
  {
    id: 11,
    phase: 2,
    question: '중요한 결정을 내릴 때?',
    options: [
      {
        label: '내 판단이 가장 중요함',
        profileScores: { individualism: 3 }
      },
      {
        label: '가족/친구의 의견을 많이 참고함',
        profileScores: { individualism: -2 }
      },
      {
        label: '전문가의 조언을 구함',
        profileScores: { individualism: 1 }
      },
      {
        label: '모두의 의견을 종합해서 결정',
        profileScores: { individualism: -1 }
      }
    ]
  },
  {
    id: 12,
    phase: 2,
    question: '스트레스를 받으면 어떻게 하나요?',
    options: [
      {
        label: '맛있는 음식, 쇼핑 등 즐거운 활동',
        profileScores: { indulgence: 3 }
      },
      {
        label: '참고 견디며 일에 집중',
        profileScores: { indulgence: -3 }
      },
      {
        label: '운동이나 취미로 풀기',
        profileScores: { indulgence: 1 }
      },
      {
        label: '가까운 사람과 대화하기',
        profileScores: { indulgence: 0 }
      }
    ]
  }
];

export const totalQuestions = questions.length;
