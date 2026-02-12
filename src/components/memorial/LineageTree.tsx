import { useMemo, useState, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TreePine, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { displayName } from "@/lib/privacyUtils";
import { getGenderAwareRelation, getInverseRelation } from "@/lib/relationshipInference";
import { inferGender } from "@/lib/genderInference";
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

const LineageTree = memo(({ memorialId, deceasedName, deceasedPhoto, isOwner }: LineageTreeProps) => {
  const deceasedGender = inferGender(deceasedName.split(" ")[0]);
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
        .select("id, relation_type, memorial_id_1, memorial_id_2, status, is_lineage")
        .or(`memorial_id_1.eq.${memorialId},memorial_id_2.eq.${memorialId}`)
        .in("status", ["accepted", "pending"]);

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

        const relType = r.relation_type;
        const relation = isSource
          ? getGenderAwareRelation(relType, currentFirstName)
          : getInverseRelation(relType, currentFirstName);

        const photos = (linked.photos && linked.photos.length > 0)
          ? linked.photos.filter((p: string) => p && !p.startsWith("data:"))
          : linked.photo_url ? [linked.photo_url] : [];
        const safeIdx = (linked.default_photo_index ?? 0) < photos.length ? (linked.default_photo_index ?? 0) : 0;

        return {
          id: linked.id,
          name: `${linked.first_name || ''} ${linked.last_name || ''}`.trim(),
          firstName: linked.first_name || '',
          photo: photos[safeIdx] || null,
          shareToken: linked.share_token || null,
          relation,
          createdBy: linked.created_by,
          isLineageFromDb: r.is_lineage !== false, // Use DB column
          source: "memorial" as const,
        };
      }).filter(Boolean) as Array<{
        id: string; name: string; firstName: string; photo: string | null;
        shareToken: string | null; relation: string; createdBy: string; 
        isLineageFromDb: boolean; source: "memorial";
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

      // Filter: only include posts whose relation_link classifies as lineage
      const lineagePosts = Array.from(authorMap.values())
        .filter(post => {
          // Use relation_link ("Sa Mère") not relation_category ("famille_directe")
          const classified = classifyRelation(post.relation_link || post.relation_category);
          return classified.isLineage;
        });

      // Fetch avatars for tribute authors with user accounts
      const userIds = [...new Set(lineagePosts.map(p => p.user_id).filter(Boolean))] as string[];
      let avatarLookup = new Map<string, string | null>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles_public")
          .select("user_id, avatar_url")
          .in("user_id", userIds);

        (profiles || []).forEach((p: any) => {
          avatarLookup.set(p.user_id, p.avatar_url);
        });
      }

      return lineagePosts.map(post => ({
          id: `tribute-${post.user_id || post.id}`,
          name: post.author_name,
          firstName: post.author_name.split(" ")[0],
          photo: post.user_id ? avatarLookup.get(post.user_id) || null : null,
          shareToken: null as string | null,
          relation: post.relation_link || post.relation_category,
          createdBy: post.user_id || "",
          source: "tribute" as const,
        }));
    },
  });

  // Combine and deduplicate: memorial relations take priority over tribute nodes
  const allNodes = useMemo(() => {
    const memNodes = (interMemorialNodes || []).filter(n => !!n.name);
    const tribNodes = (tributeNodes || []).filter(n => !!n.name);

    // Names from memorial relations (already linked)
    const memorialNames = new Set(memNodes.map(n => n.name.toLowerCase()));

    // Add tribute nodes that don't duplicate memorial relation nodes
    const uniqueTribNodes = tribNodes.filter(
      t => !memorialNames.has(t.name.toLowerCase())
    );

    return [...memNodes, ...uniqueTribNodes];
  }, [interMemorialNodes, tributeNodes]);

  // Classify into generations — use DB is_lineage for memorial relations
  const { lineageNodes, allianceNodes } = useMemo(() => {
    const lineage: TreeNode[] = [];
    const alliance: TreeNode[] = [];

    allNodes.forEach(r => {
      const classified = classifyRelation(r.relation);
      // For memorial relations, DB is_lineage takes precedence
      const dbLineage = "isLineageFromDb" in r ? (r as any).isLineageFromDb : true;
      const isLineage = dbLineage && classified.isLineage;

      const node: TreeNode = {
        ...r,
        generation: classified.generation,
        linkStyle: isLineage ? classified.linkStyle : "alliance",
      };

      if (isLineage) {
        lineage.push(node);
      } else if (classified.linkStyle === "alliance" || !dbLineage) {
        // Alliance nodes shown at generation 0 (pivot level)
        alliance.push({ ...node, generation: 0 });
      }
    });

    return { lineageNodes: lineage, allianceNodes: alliance };
  }, [allNodes]);

  // Apply view filter
  const filteredNodes = useMemo(() => {
    switch (viewFilter) {
      case "ascendance":
        return lineageNodes.filter(n => n.generation < 0);
      case "descendance":
        return lineageNodes.filter(n => n.generation > 0);
      case "complete":
      default:
        return lineageNodes;
    }
  }, [lineageNodes, viewFilter]);

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
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-40" />
        </div>
        {/* Tree skeleton — mimics generation rows */}
        <div className="flex flex-col items-center gap-6">
          {/* Ancestor row */}
          <div className="flex gap-8 justify-center">
            {[1, 2].map(i => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="w-16 h-16 md:w-20 md:h-20 rounded-full" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-2.5 w-12" />
              </div>
            ))}
          </div>
          {/* Connector line */}
          <Skeleton className="h-[2px] w-1/3" />
          {/* De Cujus */}
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="w-20 h-20 md:w-24 md:h-24 rounded-full" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          {/* Connector line */}
          <Skeleton className="h-[2px] w-1/3" />
          {/* Descendant row */}
          <div className="flex gap-8 justify-center">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="w-16 h-16 md:w-20 md:h-20 rounded-full" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-2.5 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = lineageNodes.length === 0 && allianceNodes.length === 0;
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
        <div className="relative">
          {/* Central vertical blood line — grows from bottom (roots) to top (branches) */}
          <div
            className="absolute left-1/2 top-0 bottom-0 w-[3px] hidden md:block"
            style={{
              background: "hsl(0 70% 25% / 0.8)",
              transformOrigin: "bottom",
              animation: "grow-up 1.4s ease-out forwards",
            }}
          />

          {/* Descendants at TOP (branches / leaves) — sorted highest gen first */}
          {[...descendantGens].reverse().map(([gen, nodes], i) => (
            <LineageGenerationRow
              key={gen}
              generation={gen}
              nodes={nodes}
              isAuthenticated={isAuthenticated}
              currentUserId={user?.id}
              animDelay={800 + i * 200}
              treePosition="branch"
              deceasedGender={deceasedGender}
            />
          ))}

          {/* Siblings & same-generation (generation 0) */}
          {siblingAndAllianceGen.map(([gen, nodes]) => (
            <LineageGenerationRow
              key={gen}
              generation={gen}
              nodes={nodes}
              isAuthenticated={isAuthenticated}
              currentUserId={user?.id}
              animDelay={600}
              treePosition="trunk"
              deceasedGender={deceasedGender}
            />
          ))}

          {/* De Cujus — central pivot (Niveau 0) */}
          <div
            className="relative z-10 flex justify-center py-6"
            style={{ animation: "germinate 0.8s ease-out 0.4s both" }}
          >
            <div className="flex flex-col items-center">
              {/* Alliance nodes — horizontal gold connectors */}
              {allianceNodes.length > 0 && viewFilter === "complete" && (
                <div className="flex items-center gap-4 mb-4">
                  {allianceNodes.map(node => (
                    <div key={node.id} className="flex items-center gap-2">
                      {/* Gold dashed connector */}
                      <div
                        className="hidden md:block h-[1.5px] w-8"
                        style={{
                          background: "repeating-linear-gradient(90deg, #D4AF37 0, #D4AF37 6px, transparent 6px, transparent 10px)",
                          opacity: 0.6,
                        }}
                      />
                      <LineageNodeCard
                        node={node}
                        isAuthenticated={isAuthenticated}
                        isCurrentUser={false}
                        isDeceased={true}
                        deceasedGender={deceasedGender}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-[3px] border-[#800000] bg-muted overflow-hidden grayscale hover:grayscale-0 transition-all duration-600 shadow-lg">
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

          {/* Ancestors at BOTTOM (roots) — closest to cujus first, deepest at very bottom */}
          {[...ancestorGens].reverse().map(([gen, nodes], i) => (
            <LineageGenerationRow
              key={gen}
              generation={gen}
              nodes={nodes}
              isAuthenticated={isAuthenticated}
              currentUserId={user?.id}
              animDelay={i * 200}
              treePosition="root"
              deceasedGender={deceasedGender}
            />
          ))}
        </div>
      )}
    </div>
  );
});

LineageTree.displayName = "LineageTree";

export default LineageTree;
