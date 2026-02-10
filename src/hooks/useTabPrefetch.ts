import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Prefetches tab data on hover so content is instant on click.
 */
export const useTabPrefetch = (memorialId: string) => {
  const queryClient = useQueryClient();
  const prefetchedTabs = useRef(new Set<string>());

  const isValid = /^[0-9a-f]{8}-/.test(memorialId);

  const prefetchTab = useCallback(
    (tabName: string) => {
      if (!isValid || prefetchedTabs.current.has(tabName)) return;
      prefetchedTabs.current.add(tabName);

      switch (tabName) {
        case "relationships":
          queryClient.prefetchQuery({
            queryKey: ["memorial-relations", memorialId],
            queryFn: async () => {
              const { data } = await supabase
                .from("memorial_relations")
                .select("id, relation_type, memorial_id_1, memorial_id_2, status")
                .or(`memorial_id_1.eq.${memorialId},memorial_id_2.eq.${memorialId}`)
                .eq("status", "accepted");
              return data;
            },
            staleTime: 5 * 60_000,
          });
          break;

        case "lineage":
          queryClient.prefetchQuery({
            queryKey: ["lineage-tree-relations", memorialId],
            queryFn: async () => {
              const { data } = await supabase
                .from("memorial_relations")
                .select("id, relation_type, memorial_id_1, memorial_id_2")
                .or(`memorial_id_1.eq.${memorialId},memorial_id_2.eq.${memorialId}`)
                .eq("status", "accepted");
              return data;
            },
            staleTime: 2 * 60_000,
          });
          queryClient.prefetchQuery({
            queryKey: ["lineage-tree-tributes", memorialId],
            queryFn: async () => {
              const { data } = await supabase
                .rpc("get_public_guestbook_posts", { p_memorial_id: memorialId });
              return data;
            },
            staleTime: 2 * 60_000,
          });
          break;

        case "gatherings":
          queryClient.prefetchQuery({
            queryKey: ["memorial-events", memorialId],
            queryFn: async () => {
              const { data } = await supabase
                .from("memorial_events")
                .select("id, event_type, event_date, event_end_time, location, description, is_public")
                .eq("memorial_id", memorialId)
                .order("event_date", { ascending: true });
              return data;
            },
            staleTime: 5 * 60_000,
          });
          break;
      }
    },
    [memorialId, isValid, queryClient]
  );

  return { prefetchTab };
};
