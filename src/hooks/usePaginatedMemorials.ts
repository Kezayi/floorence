import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMemorialType, formatDateFrench } from "@/lib/dateUtils";

const PAGE_SIZE = 12;

export interface PaginatedMemorialCard {
  id: string;
  slug: string;
  shareToken: string | null;
  name: string;
  birthDate: string;
  deathDate: string;
  photoUrl: string;
  ripCount: number;
  candleCount: number;
  flowerCount: number;
  type: "RECENT" | "PAST";
  isDemo: boolean;
}

interface UsePaginatedMemorialsReturn {
  memorials: PaginatedMemorialCard[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  totalCount: number;
  loadMore: () => void;
  reset: () => void;
}

export const usePaginatedMemorials = (): UsePaginatedMemorialsReturn => {
  const [memorials, setMemorials] = useState<PaginatedMemorialCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const fetchingRef = useRef(false);

  const fetchPage = useCallback(async (pageOffset: number, isInitial: boolean) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const { data, error } = await supabase.rpc("get_paginated_memorials", {
        p_search_query: "",
        p_offset: pageOffset,
        p_limit: PAGE_SIZE,
      });

      if (error) {
        console.error("[PaginatedMemorials] RPC error:", error);
        return;
      }

      if (!data || data.length === 0) {
        if (isInitial) {
          setMemorials([]);
          setTotalCount(0);
        }
        return;
      }

      // total_count comes from every row
      const total = Number(data[0]?.total_count ?? 0);
      setTotalCount(total);

      // Fetch gesture stats for this batch
      const ids = data.map((m: any) => m.id);
      const { data: stats } = await supabase.rpc("get_memorial_gesture_stats", {
        p_memorial_ids: ids,
      });

      const statsMap: Record<string, { postCount: number; candles: number; flowers: number }> = {};
      (stats || []).forEach((s: any) => {
        statsMap[s.memorial_id] = {
          postCount: s.post_count,
          candles: s.total_candles,
          flowers: s.total_flowers,
        };
      });

      const cards: PaginatedMemorialCard[] = data.map((m: any) => {
        const st = statsMap[m.id] || { postCount: 0, candles: 0, flowers: 0 };
        const deathDate = formatDateFrench(m.death_date);
        return {
          id: m.id,
          slug: m.slug,
          shareToken: null,
          name: `${m.first_name} ${m.last_name}`,
          birthDate: formatDateFrench(m.birth_date),
          deathDate,
          photoUrl: m.photo_url || "",
          ripCount: st.postCount,
          candleCount: st.candles,
          flowerCount: st.flowers,
          type: getMemorialType(deathDate),
          isDemo: false,
        };
      });

      setMemorials((prev) => (isInitial ? cards : [...prev, ...cards]));
      setOffset(pageOffset + PAGE_SIZE);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchPage(0, true);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!fetchingRef.current && offset < totalCount) {
      fetchPage(offset, false);
    }
  }, [offset, totalCount, fetchPage]);

  const reset = useCallback(() => {
    setMemorials([]);
    setOffset(0);
    setTotalCount(0);
    fetchPage(0, true);
  }, [fetchPage]);

  const hasMore = offset < totalCount;

  return { memorials, loading, loadingMore, hasMore, totalCount, loadMore, reset };
};
