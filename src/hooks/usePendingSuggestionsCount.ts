import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Lightweight hook that only returns the pending suggested links count.
 * Used by Header badge — avoids loading the full useUserSuggestedLinks hook.
 */
export const usePendingSuggestionsCount = () => {
  const { user } = useAuth();

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["pending-suggestions-count-light", user?.id],
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 min cache
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!user) return 0;

      // Single optimized query: count pending suggestions for user's memorials
      const { data: myMemorials } = await supabase
        .from("memorials")
        .select("id")
        .or(`created_by.eq.${user.id},heir_user_id.eq.${user.id}`);

      if (!myMemorials || myMemorials.length === 0) return 0;

      const myIds = myMemorials.map((m) => m.id);

      const { count, error } = await supabase
        .from("suggested_links")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .or(`source_memorial_id.in.(${myIds.join(",")}),target_memorial_id.in.(${myIds.join(",")})`);

      if (error) return 0;
      return count || 0;
    },
  });

  return pendingCount;
};
