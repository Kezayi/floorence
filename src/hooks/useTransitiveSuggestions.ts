import { useMemo, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  computeTransitiveSuggestions,
  getIgnoredSuggestions,
  ignoreSuggestion as persistIgnore,
  type TransitiveSuggestion,
  type MemorialNode,
  type RelationEdge,
} from "@/lib/transitiveInference";
import { getGenderAwareRelation } from "@/lib/relationshipInference";
import { toast } from "sonner";

const CACHE_CONFIG = { staleTime: 3 * 60 * 1000, gcTime: 10 * 60 * 1000 };

/**
 * Hook to compute and manage transitive relationship suggestions
 * for a given memorial.
 */
export const useTransitiveSuggestions = (memorialId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [ignoredKeys, setIgnoredKeys] = useState(() => getIgnoredSuggestions());

  // Fetch all accepted + pending memorial_relations
  const { data: allRelations } = useQuery({
    queryKey: ["transitive-all-relations"],
    ...CACHE_CONFIG,
    enabled: !!memorialId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memorial_relations")
        .select("id, memorial_id_1, memorial_id_2, relation_type, status");
      if (error) {
        console.error("Error fetching relations:", error);
        return [];
      }
      return (data || []).map((r): RelationEdge => ({
        id: r.id,
        memorialId1: r.memorial_id_1 || "",
        memorialId2: r.memorial_id_2 || "",
        relationType: r.relation_type,
        status: r.status || "pending",
      }));
    },
  });

  // Fetch all memorials (minimal data + M2.3F identity fields)
  const { data: allMemorials } = useQuery({
    queryKey: ["transitive-all-memorials"],
    ...CACHE_CONFIG,
    enabled: !!memorialId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memorials")
        .select("id, first_name, last_name, birth_date, merged_into, is_published, created_by")
        .eq("is_active", true);
      if (error) {
        console.error("Error fetching memorials:", error);
        return [];
      }
      return data || [];
    },
  });

  // M2.3F: existing suggestions (family-level dedup)
  const { data: existingSuggestions } = useQuery({
    queryKey: ["transitive-existing-suggestions"],
    ...CACHE_CONFIG,
    enabled: !!memorialId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suggested_links")
        .select("source_memorial_id, target_memorial_id");
      if (error) return [];
      return (data || []).map((s) => ({
        sourceMemorialId: s.source_memorial_id || "",
        targetMemorialId: s.target_memorial_id || "",
      }));
    },
  });

  // Build memorial map
  const memorialMap = useMemo(() => {
    const map = new Map<string, MemorialNode>();
    (allMemorials || []).forEach((m) => {
      map.set(m.id, {
        id: m.id,
        firstName: m.first_name,
        lastName: m.last_name,
        birthDate: m.birth_date,
        mergedInto: m.merged_into,
        isPublished: !!m.is_published,
        createdBy: m.created_by,
      });
    });
    return map;
  }, [allMemorials]);

  // Compute suggestions
  const suggestions = useMemo(() => {
    if (!memorialId || !allRelations || allRelations.length === 0 || memorialMap.size === 0) {
      return [];
    }
    const raw = computeTransitiveSuggestions(memorialId, allRelations, memorialMap, existingSuggestions || []);
    // Filter out ignored suggestions
    return raw.filter((s) => !ignoredKeys.has(s.pairKey));
  }, [memorialId, allRelations, memorialMap, ignoredKeys, existingSuggestions]);

  // Confirm a suggestion: create the relation as accepted
  const confirmSuggestion = useCallback(
    async (suggestion: TransitiveSuggestion) => {
      if (!user) {
        toast.error("Vous devez être connecté");
        return;
      }

      try {
        const { error } = await supabase.from("memorial_relations").insert({
          memorial_id_1: suggestion.xMemorialId,
          memorial_id_2: suggestion.yMemorialId,
          relation_type: suggestion.genderedRelation,
          requested_by: user.id,
          status: "accepted",
          is_demo: false,
        });

        if (error) {
          console.error("Error confirming suggestion:", error);
          toast.error("Erreur lors de la confirmation du lien");
          return;
        }

        toast.success(
          `Lien confirmé : ${suggestion.xName} est ${suggestion.genderedRelation} de ${suggestion.yName}`,
          { duration: 5000 }
        );

        // Invalidate caches to refresh graph
        queryClient.invalidateQueries({ queryKey: ["transitive-all-relations"] });
        queryClient.invalidateQueries({ queryKey: ["memorial-relations-graph"] });
        queryClient.invalidateQueries({ queryKey: ["admin-memorial-relations"] });
      } catch (err) {
        console.error("Error:", err);
        toast.error("Une erreur est survenue");
      }
    },
    [user, queryClient]
  );

  // Ignore a suggestion
  const ignoreSuggestionHandler = useCallback((pairKey: string) => {
    persistIgnore(pairKey);
    setIgnoredKeys((prev) => new Set([...prev, pairKey]));
    toast("Suggestion ignorée", { duration: 2000 });
  }, []);

  return {
    suggestions,
    confirmSuggestion,
    ignoreSuggestion: ignoreSuggestionHandler,
    isLoading: !allRelations || !allMemorials,
  };
};
