import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLogger";

const CACHE_CONFIG = { staleTime: 60 * 1000, gcTime: 5 * 60 * 1000 };

export interface SuggestedLink {
  id: string;
  sourceMemorialId: string;
  targetMemorialId: string;
  suggestedRelation: string;
  inferenceLogic: string | null;
  status: string;
  createdByAi: boolean;
  createdAt: string;
  notifiedAt: string | null;
  // Enriched fields
  sourceName: string;
  targetName: string;
  sourceSlug: string;
  targetSlug: string;
  sourceShareToken: string | null;
  targetShareToken: string | null;
  sourcePhotoUrl: string | null;
  targetPhotoUrl: string | null;
}

/**
 * Hook for memorial creators: fetches suggested links 
 * targeting their memorials (status = pending).
 */
export const useUserSuggestedLinks = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["user-suggested-links", user?.id],
    ...CACHE_CONFIG,
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      // Get memorials owned by user
      const { data: myMemorials } = await supabase
        .from("memorials")
        .select("id, first_name, last_name, slug, share_token, photo_url, photos, default_photo_index")
        .or(`created_by.eq.${user.id},heir_user_id.eq.${user.id}`);

      if (!myMemorials || myMemorials.length === 0) return [];

      const myIds = myMemorials.map((m) => m.id);
      const memorialMap = new Map(
        myMemorials.map((m: any) => {
          const photos = (m.photos && m.photos.length > 0)
            ? m.photos.filter((p: string) => p && !p.startsWith("data:"))
            : (m.photo_url ? [m.photo_url] : []);
          const safeIdx = (m.default_photo_index ?? 0) < photos.length ? (m.default_photo_index ?? 0) : 0;
          return [m.id, { name: `${m.first_name} ${m.last_name}`, slug: m.slug, shareToken: m.share_token, photoUrl: photos[safeIdx] || null }];
        })
      );

      // Get pending suggestions where source or target is one of my memorials
      const { data: links, error } = await supabase
        .from("suggested_links")
        .select("*")
        .eq("status", "pending")
        .or(`source_memorial_id.in.(${myIds.join(",")}),target_memorial_id.in.(${myIds.join(",")})`);

      if (error) {
        console.error("Error fetching suggested links:", error);
        return [];
      }

      if (!links || links.length === 0) return [];

      // Fetch all referenced memorial IDs for names
      const allIds = new Set<string>();
      links.forEach((l) => {
        if (l.source_memorial_id) allIds.add(l.source_memorial_id);
        if (l.target_memorial_id) allIds.add(l.target_memorial_id);
      });

      const missingIds = Array.from(allIds).filter((id) => !memorialMap.has(id));
      if (missingIds.length > 0) {
        const { data: otherMemorials } = await supabase
          .from("memorials")
          .select("id, first_name, last_name, slug, share_token, photo_url, photos, default_photo_index")
          .in("id", missingIds);

        (otherMemorials || []).forEach((m: any) => {
          const photos = (m.photos && m.photos.length > 0)
            ? m.photos.filter((p: string) => p && !p.startsWith("data:"))
            : (m.photo_url ? [m.photo_url] : []);
          const safeIdx = (m.default_photo_index ?? 0) < photos.length ? (m.default_photo_index ?? 0) : 0;
          memorialMap.set(m.id, { name: `${m.first_name} ${m.last_name}`, slug: m.slug, shareToken: m.share_token, photoUrl: photos[safeIdx] || null });
        });
      }

      return links.map((l): SuggestedLink => {
        const source = memorialMap.get(l.source_memorial_id || "") || { name: "Inconnu", slug: "", shareToken: null, photoUrl: null };
        const target = memorialMap.get(l.target_memorial_id || "") || { name: "Inconnu", slug: "", shareToken: null, photoUrl: null };
        return {
          id: l.id,
          sourceMemorialId: l.source_memorial_id || "",
          targetMemorialId: l.target_memorial_id || "",
          suggestedRelation: l.suggested_relation || "",
          inferenceLogic: l.inference_logic,
          status: l.status || "pending",
          createdByAi: l.created_by_ai ?? true,
          createdAt: l.created_at || "",
          notifiedAt: (l as any).notified_at || null,
          sourceName: source.name,
          targetName: target.name,
          sourceSlug: source.slug,
          targetSlug: target.slug,
          sourceShareToken: source.shareToken,
          targetShareToken: target.shareToken,
          sourcePhotoUrl: source.photoUrl,
          targetPhotoUrl: target.photoUrl,
        };
      });
    },
  });

  // Validate: move to memorial_relations as accepted (with duplicate sealing)
  const validateMutation = useMutation({
    mutationFn: async (suggestion: SuggestedLink) => {
      if (!user) throw new Error("Not authenticated");

      // Check if this link already exists (sealed by another creator)
      const { data: existing } = await supabase
        .from("memorial_relations")
        .select("id")
        .or(
          `and(memorial_id_1.eq.${suggestion.sourceMemorialId},memorial_id_2.eq.${suggestion.targetMemorialId}),and(memorial_id_1.eq.${suggestion.targetMemorialId},memorial_id_2.eq.${suggestion.sourceMemorialId})`
        )
        .eq("relation_type", suggestion.suggestedRelation)
        .eq("status", "accepted")
        .maybeSingle();

      if (existing) {
        // Link already sealed by another creator — just mark this suggestion as accepted
        await supabase
          .from("suggested_links")
          .update({ status: "accepted" })
          .eq("id", suggestion.id);
        return { ...suggestion, alreadySealed: true };
      }

      // Create the relation
      const { error: insertError } = await supabase.from("memorial_relations").insert({
        memorial_id_1: suggestion.sourceMemorialId,
        memorial_id_2: suggestion.targetMemorialId,
        relation_type: suggestion.suggestedRelation,
        requested_by: user.id,
        status: "accepted",
        is_demo: false,
      });
      if (insertError) throw insertError;

      // Update suggestion status
      const { error: updateError } = await supabase
        .from("suggested_links")
        .update({ status: "accepted" })
        .eq("id", suggestion.id);
      if (updateError) throw updateError;

      // Also seal any duplicate pending suggestions for the same pair
      await supabase
        .from("suggested_links")
        .update({ status: "accepted" })
        .eq("status", "pending")
        .or(
          `and(source_memorial_id.eq.${suggestion.sourceMemorialId},target_memorial_id.eq.${suggestion.targetMemorialId}),and(source_memorial_id.eq.${suggestion.targetMemorialId},target_memorial_id.eq.${suggestion.sourceMemorialId})`
        );

      // Audit log
      await logAuditAction(
        "memorial_relation_created",
        user.id,
        user.email || null,
        {
          memorial_id: suggestion.sourceMemorialId,
          source_memorial: suggestion.sourceName,
          target_memorial: suggestion.targetName,
          relation_type: suggestion.suggestedRelation,
          origin: "suggested_link_validation",
          suggestion_id: suggestion.id,
        }
      );

      return { ...suggestion, alreadySealed: false };
    },
    onSuccess: (result) => {
      // Fire golden confetti celebration
      void import("@/lib/goldenConfetti").then((m) => m.fireGoldenConfetti());

      if ((result as any).alreadySealed) {
        toast.info(
          `Ce lien a déjà été scellé par un autre créateur. Votre confirmation est enregistrée.`,
          { duration: 5000 }
        );
      } else {
        toast.success(
          `🌿 Vérité scellée : ${result.sourceName} est ${result.suggestedRelation} de ${result.targetName}`,
          { duration: 6000 }
        );
      }
      queryClient.invalidateQueries({ queryKey: ["user-suggested-links"] });
      queryClient.invalidateQueries({ queryKey: ["memorial-relations-graph"] });
      queryClient.invalidateQueries({ queryKey: ["transitive-all-relations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-suggested-links-audit"] });
      queryClient.invalidateQueries({ queryKey: ["pending-suggested-links-count"] });
    },
    onError: () => {
      toast.error("Erreur lors de la validation du lien");
    },
  });

  // Reject
  const rejectMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      const { error } = await supabase
        .from("suggested_links")
        .update({ status: "rejected" })
        .eq("id", suggestionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.info("Suggestion rejetée");
      queryClient.invalidateQueries({ queryKey: ["user-suggested-links"] });
      queryClient.invalidateQueries({ queryKey: ["admin-suggested-links-audit"] });
      queryClient.invalidateQueries({ queryKey: ["pending-suggested-links-count"] });
    },
    onError: () => {
      toast.error("Erreur lors du rejet");
    },
  });

  return {
    suggestions,
    isLoading,
    pendingCount: suggestions.length,
    validateSuggestion: validateMutation.mutate,
    rejectSuggestion: rejectMutation.mutate,
    isValidating: validateMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
};

/**
 * Hook for admin: fetches ALL suggested links with stats.
 */
export const useAdminSuggestedLinks = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-suggested-links-audit"],
    ...CACHE_CONFIG,
    queryFn: async () => {
      const { data: links, error } = await supabase
        .from("suggested_links")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching admin suggested links:", error);
        return { links: [], stats: { total: 0, accepted: 0, rejected: 0, pending: 0, rate: 0 } };
      }

      const allLinks = links || [];

      // Enrich with memorial names
      const allIds = new Set<string>();
      allLinks.forEach((l) => {
        if (l.source_memorial_id) allIds.add(l.source_memorial_id);
        if (l.target_memorial_id) allIds.add(l.target_memorial_id);
      });

      const memorialMap = new Map<string, { name: string; slug: string; shareToken: string | null; photoUrl: string | null }>();
      if (allIds.size > 0) {
        const { data: memorials } = await supabase
          .from("memorials")
          .select("id, first_name, last_name, slug, share_token, photo_url, photos, default_photo_index")
          .in("id", Array.from(allIds));

        (memorials || []).forEach((m: any) => {
          const photos = (m.photos && m.photos.length > 0)
            ? m.photos.filter((p: string) => p && !p.startsWith("data:"))
            : (m.photo_url ? [m.photo_url] : []);
          const safeIdx = (m.default_photo_index ?? 0) < photos.length ? (m.default_photo_index ?? 0) : 0;
          memorialMap.set(m.id, { name: `${m.first_name} ${m.last_name}`, slug: m.slug, shareToken: m.share_token, photoUrl: photos[safeIdx] || null });
        });
      }

      const enriched: SuggestedLink[] = allLinks.map((l) => {
        const source = memorialMap.get(l.source_memorial_id || "") || { name: "Inconnu", slug: "", shareToken: null, photoUrl: null };
        const target = memorialMap.get(l.target_memorial_id || "") || { name: "Inconnu", slug: "", shareToken: null, photoUrl: null };
        return {
          id: l.id,
          sourceMemorialId: l.source_memorial_id || "",
          targetMemorialId: l.target_memorial_id || "",
          suggestedRelation: l.suggested_relation || "",
          inferenceLogic: l.inference_logic,
          status: l.status || "pending",
          createdByAi: l.created_by_ai ?? true,
          createdAt: l.created_at || "",
          notifiedAt: (l as any).notified_at || null,
          sourceName: source.name,
          targetName: target.name,
          sourceSlug: source.slug,
          targetSlug: target.slug,
          sourceShareToken: source.shareToken,
          targetShareToken: target.shareToken,
          sourcePhotoUrl: source.photoUrl,
          targetPhotoUrl: target.photoUrl,
        };
      });

      const total = allLinks.length;
      const accepted = allLinks.filter((l) => l.status === "accepted").length;
      const rejected = allLinks.filter((l) => l.status === "rejected").length;
      const pending = allLinks.filter((l) => l.status === "pending").length;
      const unnotifiedPending = allLinks.filter(
        (l) => l.status === "pending" && !l.notified_at
      ).length;
      const decided = accepted + rejected;
      const rate = decided > 0 ? Math.round((accepted / decided) * 100) : 0;

      return {
        links: enriched,
        stats: { total, accepted, rejected, pending, unnotifiedPending, rate },
      };
    },
  });

  return {
    links: data?.links || [],
    stats: data?.stats || { total: 0, accepted: 0, rejected: 0, pending: 0, unnotifiedPending: 0, rate: 0 },
    isLoading,
  };
};

/**
 * Hook to check if current user has any memorials (for showing menu item).
 */
export const useHasMemorials = () => {
  const { user } = useAuth();

  const { data: hasMemorials = false } = useQuery({
    queryKey: ["user-has-memorials", user?.id],
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
    queryFn: async () => {
      if (!user) return false;
      const { count, error } = await supabase
        .from("memorials")
        .select("id", { count: "exact", head: true })
        .or(`created_by.eq.${user.id},heir_user_id.eq.${user.id}`);

      if (error) return false;
      return (count || 0) > 0;
    },
  });

  return hasMemorials;
};
