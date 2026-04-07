import type { UserAnswer, MatchResult, RegionId, Profile, FoodType } from '../types';
import { countryList } from '../data/countries';

interface RegionScores {
  eastAsia: number;
  southeastAsia: number;
  southAsia: number;
  middleEast: number;
  europeWest: number;
  europeSouth: number;
  africa: number;
  americas: number;
}

const initialRegionScores: RegionScores = {
  eastAsia: 0,
  southeastAsia: 0,
  southAsia: 0,
  middleEast: 0,
  europeWest: 0,
  europeSouth: 0,
  africa: 0,
  americas: 0
};

const initialProfile: Profile = {
  pace: 3,
  social: 3,
  tradition: 3,
  order: 3,
  emotion: 3,
  individualism: 3,
  uncertainty: 3,
  indulgence: 3
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function calculateMatch(userAnswers: UserAnswer[]): MatchResult {
  // ========== Phase 1: 지역 클러스터 결정 ==========
  const regionScores: RegionScores = { ...initialRegionScores };

  // Q1~Q6 응답에서 지역 점수 집계
  const phase1Answers = userAnswers.filter(a => a.questionId <= 6);

  phase1Answers.forEach(answer => {
    const weights = answer.selectedOption.regionWeights;
    if (weights) {
      (Object.entries(weights) as [RegionId, number][]).forEach(([region, weight]) => {
        regionScores[region] += weight;
      });
    }
  });

  // 상위 2개 지역 선택
  const sortedRegions = (Object.entries(regionScores) as [RegionId, number][])
    .sort((a, b) => b[1] - a[1]);

  const topRegions: RegionId[] = sortedRegions.slice(0, 2).map(([region]) => region);

  // ========== Phase 2: 세부 성향 파악 ==========
  const userProfile: Profile = { ...initialProfile };

  // Q7~Q12 응답에서 성향 점수 집계
  const phase2Answers = userAnswers.filter(a => a.questionId > 6);

  phase2Answers.forEach(answer => {
    const scores = answer.selectedOption.profileScores;
    if (scores) {
      (Object.entries(scores) as [keyof Profile, number][]).forEach(([trait, score]) => {
        userProfile[trait] = clamp(userProfile[trait] + score, 1, 5);
      });
    }
  });

  // 음식 취향 추출 (Q2)
  const foodAnswer = userAnswers.find(a => a.questionId === 2);
  const userFoodType: FoodType | undefined = foodAnswer?.selectedOption.foodType;

  // ========== 국가 매칭 ==========
  // 선택된 지역의 국가들만 필터링
  const candidateCountries = countryList.filter(
    country => topRegions.includes(country.region)
  );

  // 각 국가와 유사도 계산 (유클리드 거리)
  const similarities = candidateCountries.map(country => {
    let distance = 0;

    // 8개 성향 축 비교
    const traits: (keyof Profile)[] = [
      'pace', 'social', 'tradition', 'order',
      'emotion', 'individualism', 'uncertainty', 'indulgence'
    ];

    traits.forEach(trait => {
      const countryValue = country.profile[trait];
      const userValue = userProfile[trait];
      distance += Math.pow(userValue - countryValue, 2);
    });

    // 음식 취향 추가
    if (userFoodType && country.food[userFoodType] !== undefined) {
      // 음식 선호도가 높을수록 거리 감소 (5에 가까울수록 좋음)
      distance += Math.pow(5 - country.food[userFoodType], 2) * 0.5;
    }

    // 유사도 계산 (0~1 범위)
    const similarity = 1 / (1 + Math.sqrt(distance));

    return {
      country,
      distance,
      similarity
    };
  });

  // 유사도 순으로 정렬
  similarities.sort((a, b) => b.similarity - a.similarity);

  // 최종 결과 반환
  const bestMatch = similarities[0];

  // 매칭률 계산 (50~99% 범위로 조정)
  const matchPercent = Math.round(50 + bestMatch.similarity * 49);

  return {
    country: bestMatch.country,
    matchPercent,
    topRegions,
    alternatives: similarities.slice(1, 4).map(s => s.country)
  };
}
