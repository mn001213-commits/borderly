export interface Engagement {
  like_count?: number | null;
  comment_count?: number | null;
  created_at: string;
}

/**
 * 게시글 인기도 점수 계산
 * - 좋아요 가중치: 2
 * - 댓글 가중치: 1
 */
export function calculateEngagementScore(item: Engagement): number {
  return (item.like_count || 0) * 2 + (item.comment_count || 0);
}

/**
 * 게시글을 인기도 순으로 정렬 (내림차순)
 * 동점일 경우 최신순
 */
export function sortByEngagement<T extends Engagement>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const scoreA = calculateEngagementScore(a);
    const scoreB = calculateEngagementScore(b);
    const diff = scoreB - scoreA;
    if (diff !== 0) return diff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
