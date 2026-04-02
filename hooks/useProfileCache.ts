"use client";

import { useState, useEffect } from "react";

interface CacheData<T> {
  data: T;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5분

export function useProfileCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const cacheKey = `profile-cache-${key}`;

    // 1. SessionStorage에서 캐시 읽기
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed: CacheData<T> = JSON.parse(cached);
        const age = Date.now() - parsed.timestamp;

        if (age < CACHE_DURATION) {
          setData(parsed.data);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error("Cache parse error:", e);
        sessionStorage.removeItem(cacheKey);
      }
    }

    // 2. 캐시 없거나 만료됨 - fetch 실행
    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        setData(result);

        // 3. SessionStorage에 저장
        try {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({ data: result, timestamp: Date.now() })
          );
        } catch (e) {
          console.warn("Cache storage failed:", e);
        }
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  const invalidate = () => {
    sessionStorage.removeItem(`profile-cache-${key}`);
  };

  return { data, loading, error, invalidate };
}
