import { useMemo } from "react";
import { Lightbulb, Link2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemorials } from "@/contexts/MemorialsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getRelationVector } from "@/lib/relationshipInference";
import { toast } from "sonner";

interface InferredLinkSuggestionsProps {
  memorialId: string;
  memorialName: string;
}

interface Suggestion {
  targetMemorialId: string;
  targetName: string;
  suggestedRelationType: string;
  reason: string;
  confidence: "high" | "medium";
  userName: string;
}

/**
 * Detects when users' roles across memorials imply a relationship between the deceased.
 * Example: If user X is "Son Fils" (G=-1) on Memorial A and "Son Petit-fils" (G=-2) on Memorial B,
 * then A is likely the child of B (Père/Fils relationship).
 */
const InferredLinkSuggestions = ({ memorialId, memorialName }: InferredLinkSuggestionsProps) => {
  const { user } = useAuth();
  const { memorials } = useMemorials();

  // Fetch all guestbook posts to find cross-memorial users
  const { data: allPosts } = useQuery({
    queryKey: ["inferred-links-posts", memorialId],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_public_guestbook_posts");
      return data || [];
    },
  });

  // Fetch existing relations to avoid suggesting duplicates
  const { data: existingRelations } = useQuery({
    queryKey: ["existing-memorial-relations", memorialId],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("memorial_relations")
        .select("memorial_id_1, memorial_id_2");
      return data || [];
    },
  });

  const suggestions = useMemo(() => {
    if (!allPosts || allPosts.length === 0) return [];

    const results: Suggestion[] = [];
    const existingPairs = new Set<string>();

    // Build set of existing relations
    (existingRelations || []).forEach((rel) => {
      const key = [rel.memorial_id_1, rel.memorial_id_2].sort().join("|");
      existingPairs.add(key);
    });

    // Get posts for the current memorial
    const currentMemorialPosts = allPosts.filter((p) => p.memorial_id === memorialId);

    // Group all posts by user_id
    const userPosts = new Map<string, Array<{ memorialId: string; relation: string; authorName: string }>>();
    allPosts.forEach((post) => {
      if (!post.user_id) return;
      if (!userPosts.has(post.user_id)) userPosts.set(post.user_id, []);
      userPosts.get(post.user_id)!.push({
        memorialId: post.memorial_id,
        relation: post.relation_category,
        authorName: post.author_name,
      });
    });

    // For each user who posted on the current memorial AND other memorials
    const seenSuggestions = new Set<string>();

    currentMemorialPosts.forEach((post) => {
      if (!post.user_id) return;
      const userAllPosts = userPosts.get(post.user_id);
      if (!userAllPosts || userAllPosts.length < 2) return;

      const vectorA = getRelationVector(post.relation_category);
      if (!vectorA) return;

      // Check against posts on other memorials
      userAllPosts.forEach((otherPost) => {
        if (otherPost.memorialId === memorialId) return;

        const vectorB = getRelationVector(otherPost.relation);
        if (!vectorB) return;

        // Skip if already linked
        const pairKey = [memorialId, otherPost.memorialId].sort().join("|");
        if (existingPairs.has(pairKey) || seenSuggestions.has(pairKey)) return;

        // Compute generational relationship between the two deceased
        // User is at generation -vectorA.g relative to deceased A
        // User is at generation -vectorB.g relative to deceased B
        // So deceased A is at generation vectorA.g - vectorB.g relative to deceased B
        const deltaG = vectorA.g - vectorB.g;

        let suggestedRelation: string | null = null;
        let reason = "";
        let confidence: "high" | "medium" = "medium";

        const otherMemorial = memorials.find((m) => m.id === otherPost.memorialId);
        if (!otherMemorial) return;

        if (deltaG === 1) {
          // Current memorial's deceased is one generation above the other
          suggestedRelation = "Père";
          reason = `${otherPost.authorName} est ${post.relation_category.replace("Son ", "").replace("Sa ", "")} de ${memorialName} et ${otherPost.relation.replace("Son ", "").replace("Sa ", "")} de ${otherMemorial.name}`;
          confidence = vectorA.l === "direct" && vectorB.l === "direct" ? "high" : "medium";
        } else if (deltaG === -1) {
          // Current memorial's deceased is one generation below
          suggestedRelation = "Fils";
          reason = `${otherPost.authorName} est ${post.relation_category.replace("Son ", "").replace("Sa ", "")} de ${memorialName} et ${otherPost.relation.replace("Son ", "").replace("Sa ", "")} de ${otherMemorial.name}`;
          confidence = vectorA.l === "direct" && vectorB.l === "direct" ? "high" : "medium";
        } else if (deltaG === 0 && vectorA.l === "direct" && vectorB.l === "direct") {
          // Same generation, direct lineage = siblings
          suggestedRelation = "Frère";
          reason = `${otherPost.authorName} a le même degré de filiation avec les deux défunts`;
          confidence = "high";
        } else if (deltaG === 2) {
          suggestedRelation = "Grand-père";
          reason = `${otherPost.authorName} relie les deux défunts sur 2 générations`;
          confidence = "medium";
        } else if (deltaG === -2) {
          suggestedRelation = "Petit-fils";
          reason = `${otherPost.authorName} relie les deux défunts sur 2 générations`;
          confidence = "medium";
        }

        if (suggestedRelation) {
          seenSuggestions.add(pairKey);
          results.push({
            targetMemorialId: otherPost.memorialId,
            targetName: otherMemorial.name,
            suggestedRelationType: suggestedRelation,
            reason,
            confidence,
            userName: otherPost.authorName,
          });
        }
      });
    });

    return results;
  }, [allPosts, existingRelations, memorialId, memorialName, memorials]);

  const handleOfficialize = async (suggestion: Suggestion) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("memorial_relations").insert({
        memorial_id_1: memorialId,
        memorial_id_2: suggestion.targetMemorialId,
        relation_type: suggestion.suggestedRelationType,
        requested_by: user.id,
        status: "pending",
        is_demo: false,
      });

      if (error) {
        console.error("Error creating suggestion:", error);
        toast.error("Erreur lors de l'envoi de la suggestion");
        return;
      }

      toast.success(`Demande de liaison "${suggestion.suggestedRelationType}" envoyée au propriétaire de ${suggestion.targetName}`);
    } catch (err) {
      console.error("Error:", err);
      toast.error("Une erreur est survenue");
    }
  };

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-[hsl(45,90%,50%,0.06)] border border-[hsl(45,90%,50%,0.2)] rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-[hsl(45,90%,50%)]" />
        <h4 className="text-sm font-medium">Suggestions de liaison</h4>
      </div>
      <p className="text-xs text-muted-foreground">
        L'intelligence d'inférence a détecté des liens potentiels entre mémoriaux.
      </p>

      <div className="space-y-2">
        {suggestions.map((suggestion, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-3 p-3 bg-background/80 rounded-lg border border-border/50"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium truncate">{memorialName}</span>
                <ArrowRight className="w-3 h-3 text-[hsl(45,90%,50%)] shrink-0" />
                <span className="font-medium text-[hsl(45,90%,50%)]">{suggestion.suggestedRelationType}</span>
                <ArrowRight className="w-3 h-3 text-[hsl(45,90%,50%)] shrink-0" />
                <span className="font-medium truncate">{suggestion.targetName}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
                {suggestion.reason}
              </p>
              <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full mt-1 ${
                suggestion.confidence === "high"
                  ? "bg-[hsl(var(--accent-green)/0.15)] text-[hsl(var(--accent-green))]"
                  : "bg-muted text-muted-foreground"
              }`}>
                Confiance {suggestion.confidence === "high" ? "élevée" : "moyenne"}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1 text-xs"
              onClick={() => handleOfficialize(suggestion)}
            >
              <Link2 className="w-3 h-3" />
              Officialiser
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InferredLinkSuggestions;
