import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TreePine, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { displayName } from "@/lib/privacyUtils";
import { getGenderAwareRelation, getInverseRelation } from "@/lib/relationshipInference";
import { Skeleton } from "@/components/ui/skeleton";

import { classifyRelation, type ViewFilter } from "./lineage/lineageConstants";
import LineageNodeCard, { type TreeNode } from "./lineage/LineageNodeCard";
import LineageGenerationRow from "./lineage/LineageGenerationRow";
import LineageViewFilter from "./lineage/LineageViewFilter";

interface LineageTreeProps {
  memorialId: string;
  deceasedName: string;
  deceasedPhoto?: string | null;
  isOwner: boolean;
}

const LineageTree = ({ memorialId, deceasedName, deceasedPhoto, isOwner }: LineageTreeProps) => {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const isValidUUID = /^[0-9a-f]{8}-/.test(memorialId);
  const [viewFilter, setViewFilter] = useState<ViewFilter>("complete");

  // 1. Fetch inter-memorial relations (Pont des Ancêtres)
  const { data: interMemorialNodes, isLoading: loadingRelations } = useQuery({
    queryKey: ["lineage-tree-relations", memorialId],
    enabled: isValidUUID,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("memorial_relations")
        .select("id, relation_type, memorial_id_1, memorial_id_2")
        .or(`memorial_id_1.eq.${memorialId},memorial_id_2.eq.${memorialId}`)
        .eq("status", "accepted");

      if (!data || data.length === 0) return [];

      const linkedIds = data
        .map(r => r.memorial_id_1 === memorialId ? r.memorial_id_2 : r.memorial_id_1)
        .filter((id): id is string => !!id);

      if (linkedIds.length === 0) return [];

      const { data: linkedMemorials } = await supabase
        .from("memorials")
        .select("id, first_name, last_name, photo_url, photos, default_photo_index, share_token, created_by")
        .in("id", linkedIds);

      if (!linkedMemorials) return [];

      const memorialMap = new Map(linkedMemorials.map(m => [m.id, m]));
      const currentFirstName = deceasedName.split(" ")[0];

      return data.map(r => {
        const isSource = r.memorial_id_1 === memorialId;
        const linkedId = isSource ? r.memorial_id_2 : r.memorial_id_1;
        if (!linkedId) return null;

        const linked = memorialMap.get(linkedId);
        if (!linked) return null;

        const relation = isSource
          ? getGenderAwareRelation(r.relation_type, currentFirstName)
          : getInverseRelation(r.relation_type, currentFirstName);

        const photos = (linked.photos && linked.photos.length > 0)
          ? linked.photos.filter((p: string) => p && !p.startsWith("data:"))
          : linked.photo_url ? [linked.photo_url] : [];
        const safeIdx = (linked.default_photo_index ?? 0) < photos.length ? (linked.default_photo_index ?? 0) : 0;

        return {
          id: linked.id,
          name: `${linked.first_name} ${linked.last_name}`,
          firstName: linked.first_name,
          photo: photos[safeIdx] || null,
          shareToken: linked.share_token || null,
          relation,
          createdBy: linked.created_by,
          source: "memorial" as const,
        };
      }).filter(Boolean) as Array<{
        id: string; name: string; firstName: string; photo: string | null;
        shareToken: string | null; relation: string; createdBy: string; source: "memorial";
      }>;
    },
  });

  // 2. Fetch guestbook tributes with family relations (Le Semeur)
  const { data: tributeNodes, isLoading: loadingTributes } = useQuery({
    queryKey: ["lineage-tree-tributes", memorialId],
    enabled: isValidUUID,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .rpc("get_public_guestbook_posts", { p_memorial_id: memorialId });

      if (!data || data.length === 0) return [];

      // Deduplicate by author (keep the one with the most specific relation)
      const authorMap = new Map<string, typeof data[number]>();
      for (const post of data) {
        const key = post.user_id || post.author_name;
        if (!authorMap.has(key)) {
          authorMap.set(key, post);
        }
      }

      // Only include Famille directe and Famille élargie in the tree
      const ALLOWED_CATEGORIES = new Set(["Famille directe", "Famille élargie"]);

      return Array.from(authorMap.values())
        .filter(post => ALLOWED_CATEGORIES.has(post.relation_category))
        .map(post => ({
          id: `tribute-${post.user_id || post.id}`,
          name: post.author_name,
          firstName: post.author_name.split(" ")[0],
          photo: null as string | null,
          shareToken: null as string | null,
          relation: post.relation_category,
          createdBy: post.user_id || "",
          source: "tribute" as const,
        }));
    },
  });

  // Combine and deduplicate: memorial relations take priority over tribute nodes
  const allNodes = useMemo(() => {
    const memNodes = interMemorialNodes || [];
    const tribNodes = tributeNodes || [];

    // Names from memorial relations (already linked)
    const memorialNames = new Set(memNodes.map(n => n.name.toLowerCase()));

    // Add tribute nodes that don't duplicate memorial relation nodes
    const uniqueTribNodes = tribNodes.filter(
      t => !memorialNames.has(t.name.toLowerCase())
    );

    return [...memNodes, ...uniqueTribNodes];
  }, [interMemorialNodes, tributeNodes]);

  // Classify into generations with the 5-pillar system
  const treeNodes = useMemo(() => {
    return allNodes
      .map(r => {
        const classified = classifyRelation(r.relation);
        if (!classified.isLineage) return null;
        return { ...r, generation: classified.generation, linkStyle: classified.linkStyle } as TreeNode;
      })
      .filter(Boolean) as TreeNode[];
  }, [allNodes]);

  // Apply view filter
  const filteredNodes = useMemo(() => {
    switch (viewFilter) {
      case "ascendance":
        return treeNodes.filter(n => n.generation < 0);
      case "descendance":
        return treeNodes.filter(n => n.generation > 0);
      case "complete":
      default:
        return treeNodes;
    }
  }, [treeNodes, viewFilter]);

  // Group by generation
  const generations = useMemo(() => {
    const map = new Map<number, TreeNode[]>();
    filteredNodes.forEach(node => {
      if (!map.has(node.generation)) map.set(node.generation, []);
      map.get(node.generation)!.push(node);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [filteredNodes]);

  const isLoading = loadingRelations || loadingTributes;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const isEmpty = treeNodes.length === 0;
  const ancestorGens = generations.filter(([gen]) => gen < 0);
  const siblingAndAllianceGen = generations.filter(([gen]) => gen === 0);
  const descendantGens = generations.filter(([gen]) => gen > 0);

  return (
    <div className="space-y-8">
      {/* Header with view filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 mb-1">
            <TreePine className="w-5 h-5 text-foreground/70" />
            Arbre de lignage
          </h3>
          <p className="font-serif text-muted-foreground text-sm">
            La lignée de {deceasedName}
          </p>
        </div>
        {!isEmpty && (
          <LineageViewFilter value={viewFilter} onChange={setViewFilter} />
        )}
      </div>

      {isEmpty ? (
        <div className="bg-muted/30 border border-border rounded-sm p-10 text-center">
          <TreePine className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
          <h4 className="text-lg font-serif mb-2">Aucune racine plantée</h4>
          <p className="text-sm text-muted-foreground font-serif max-w-md mx-auto mb-3">
            Cet arbre attend ses premières branches. Les liens de parenté directe 
            (parents, enfants, conjoints) viendront dessiner la lignée.
          </p>
          {isOwner && (
            <p className="text-xs text-muted-foreground/60 font-sans italic flex items-center justify-center gap-1">
              <Plus className="w-3 h-3" />
              Utilisez l'onglet Maillage pour proposer un lien de parenté
            </p>
          )}
          <p className="text-xs text-muted-foreground/40 font-serif italic mt-6">
            « Les racines les plus profondes ne se voient jamais, mais elles portent l'arbre entier. »
          </p>
        </div>
      ) : (
        <div className="relative animate-fade-in">
          {/* Central vertical blood line */}
          <div
            className="absolute left-1/2 top-0 bottom-0 w-[2.5px] -translate-x-1/2 hidden md:block bg-[#800000]/80"
            style={{ transformOrigin: "top", animation: "grow-down 1.2s ease-out forwards" }}
          />

          {/* Ancestors (top) */}
          {ancestorGens.map(([gen, nodes], i) => (
            <LineageGenerationRow
              key={gen}
              generation={gen}
              nodes={nodes}
              isAuthenticated={isAuthenticated}
              currentUserId={user?.id}
              animDelay={i * 200}
            />
          ))}

          {/* De Cujus — central node */}
          <div className="relative z-10 flex justify-center py-6">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-[2.5px] border-[#800000] bg-muted overflow-hidden grayscale hover:grayscale-0 transition-all duration-600 shadow-lg">
                {deceasedPhoto ? (
                  <img src={deceasedPhoto} alt={deceasedName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-serif text-2xl text-muted-foreground">
                      {deceasedName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </span>
                  </div>
                )}
              </div>
              <span className="mt-2 font-serif text-sm font-medium text-foreground text-center">
                {deceasedName}
              </span>
              <span className="text-xs text-primary font-sans italic">De Cujus</span>
            </div>
          </div>

          {/* Siblings & Alliances (generation 0) */}
          {siblingAndAllianceGen.map(([gen, nodes]) => (
            <LineageGenerationRow
              key={gen}
              generation={gen}
              nodes={nodes}
              isAuthenticated={isAuthenticated}
              currentUserId={user?.id}
              animDelay={400}
            />
          ))}

          {/* Descendants (bottom) */}
          {descendantGens.map(([gen, nodes], i) => (
            <LineageGenerationRow
              key={gen}
              generation={gen}
              nodes={nodes}
              isAuthenticated={isAuthenticated}
              currentUserId={user?.id}
              animDelay={600 + i * 200}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default LineageTree;
