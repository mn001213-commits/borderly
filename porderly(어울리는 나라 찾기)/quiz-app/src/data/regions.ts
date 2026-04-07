import type { Region, RegionId } from '../types';

export const regions: Record<RegionId, Region> = {
  eastAsia: {
    id: 'eastAsia',
    name: '동아시아',
    profile: {
      pace: 4.5,
      social: 3,
      tradition: 4,
      order: 4.5,
      emotion: 2,
      individualism: 2,
      uncertainty: 4,
      indulgence: 3
    },
    food: { spicy: 3, bland: 4, sweet: 3, aromatic: 2 },
    climate: 'temperate',
    religion: 'buddhism_confucianism'
  },
  southeastAsia: {
    id: 'southeastAsia',
    name: '동남아시아',
    profile: {
      pace: 2,
      social: 4,
      tradition: 3.5,
      order: 2,
      emotion: 4,
      individualism: 2,
      uncertainty: 3,
      indulgence: 4
    },
    food: { spicy: 4, bland: 1, sweet: 4, aromatic: 5 },
    climate: 'tropical',
    religion: 'buddhism_islam'
  },
  southAsia: {
    id: 'southAsia',
    name: '남아시아',
    profile: {
      pace: 2.5,
      social: 4,
      tradition: 5,
      order: 2,
      emotion: 4,
      individualism: 2,
      uncertainty: 3,
      indulgence: 3
    },
    food: { spicy: 5, bland: 1, sweet: 4, aromatic: 5 },
    climate: 'tropical_monsoon',
    religion: 'hinduism_islam'
  },
  middleEast: {
    id: 'middleEast',
    name: '중동/북아프리카',
    profile: {
      pace: 2,
      social: 4.5,
      tradition: 5,
      order: 4,
      emotion: 3,
      individualism: 2,
      uncertainty: 4,
      indulgence: 3
    },
    food: { spicy: 3, bland: 2, sweet: 5, aromatic: 5 },
    climate: 'desert',
    religion: 'islam'
  },
  europeWest: {
    id: 'europeWest',
    name: '서유럽/북유럽',
    profile: {
      pace: 3,
      social: 2.5,
      tradition: 3,
      order: 4,
      emotion: 2,
      individualism: 4,
      uncertainty: 4,
      indulgence: 3
    },
    food: { spicy: 1, bland: 4, sweet: 4, aromatic: 2 },
    climate: 'temperate_cold',
    religion: 'christianity_secular'
  },
  europeSouth: {
    id: 'europeSouth',
    name: '남유럽/동유럽',
    profile: {
      pace: 2,
      social: 5,
      tradition: 4,
      order: 2,
      emotion: 5,
      individualism: 3,
      uncertainty: 4,
      indulgence: 4
    },
    food: { spicy: 2, bland: 2, sweet: 4, aromatic: 4 },
    climate: 'mediterranean',
    religion: 'christianity_orthodox'
  },
  africa: {
    id: 'africa',
    name: '아프리카',
    profile: {
      pace: 2,
      social: 5,
      tradition: 4,
      order: 2,
      emotion: 5,
      individualism: 2,
      uncertainty: 3,
      indulgence: 4
    },
    food: { spicy: 4, bland: 2, sweet: 3, aromatic: 4 },
    climate: 'tropical_varied',
    religion: 'mixed'
  },
  americas: {
    id: 'americas',
    name: '아메리카/오세아니아',
    profile: {
      pace: 3.5,
      social: 4,
      tradition: 2,
      order: 3,
      emotion: 4,
      individualism: 4,
      uncertainty: 3,
      indulgence: 4
    },
    food: { spicy: 3, bland: 3, sweet: 4, aromatic: 3 },
    climate: 'varied',
    religion: 'christianity_mixed'
  }
};

export const regionList = Object.values(regions);
