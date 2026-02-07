import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Global in-memory prefetch cache
const prefetchCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60_000; // 1 minute

export const getFromPrefetchCache = (key: string) => {
  const cached = prefetchCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  prefetchCache.delete(key);
  return null;
};

export const useMemorialPrefetch = () => {
  const prefetchedIds = useRef(new Set<string>());

  const prefetchMemorial = useCallback((memorialId: string) => {
    if (prefetchedIds.current.has(memorialId)) return;
    prefetchedIds.current.add(memorialId);

    // Preload Memorial page JS chunk (React.lazy)
    import("@/pages/Memorial").catch(() => {});

    // Warm up guestbook posts
    supabase
      .rpc("get_public_guestbook_posts", { p_memorial_id: memorialId })
      .then(({ data }) => {
        if (data) {
          prefetchCache.set(`guestbook-${memorialId}`, {
            data,
            timestamp: Date.now(),
          });
        }
      })
      .then(() => {}, () => {});

    // Warm up events
    supabase
      .from("memorial_events")
      .select("*")
      .eq("memorial_id", memorialId)
      .order("event_date", { ascending: true })
      .then(({ data }) => {
        if (data) {
          prefetchCache.set(`events-${memorialId}`, {
            data,
            timestamp: Date.now(),
          });
        }
      })
      .then(() => {}, () => {});
  }, []);

  return { prefetchMemorial };
};
