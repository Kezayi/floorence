import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TreePine, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { displayName } from "@/lib/privacyUtils";
import { getGenderAwareRelation, getInverseRelation } from "@/lib/relationshipInference";
import { Skeleton } from "@/components/ui/skeleton";

interface LineageTreeProps {
  memorialId: string;
  deceasedName: string;
  deceasedPhoto?: string | null;
  isOwner: boolean;
}

interface TreeNode {
  id: string;
  name: string;
  firstName: string;
  photo: string | null;
  shareToken: string | null;
  relation: string; // relation label relative to the deceased
  generation: number; // -2 = grandparents, -1 = parents, 0 = self, 1 = children, 2 = grandchildren
}

// Parent/child relation keywords for filtering
const PARENT_RELATIONS = [
  "père", "mère", "parent", "papa", "maman",
  "grand-père", "grand-mère", "grandpère", "grandmère",
  "arrière-grand-père", "arrière-grand-mère",
];
const CHILD_RELATIONS = [
  "fils", "fille", "enfant",
  "petit-fils", "petite-fille",
  "arrière-petit-fils", "arrière-petite-fille",
];
const SPOUSE_RELATIONS = [
  "époux", "épouse", "mari", "femme", "conjoint", "conjointe",
];

const classifyRelation = (relation: string): { generation: number; isLineage: boolean } => {
  const lower = relation.toLowerCase();
  
  if (lower.includes("arrière-grand-p") || lower.includes("arrière-grand-m")) {
    return { generation: -3, isLineage: true };
  }
  if (lower.includes("grand-p") || lower.includes("grand-m") || lower.includes("grandp") || lower.includes("grandm")) {
    return { generation: -2, isLineage: true };
  }
  if (PARENT_RELATIONS.some(p => lower.includes(p)) && !lower.includes("grand")) {
    return { generation: -1, isLineage: true };
  }
  if (lower.includes("arrière-petit")) {
    return { generation: 3, isLineage: true };
  }
  if (lower.includes("petit-fils") || lower.includes("petite-fille")) {
    return { generation: 2, isLineage: true };
  }
  if (CHILD_RELATIONS.some(c => lower.includes(c)) && !lower.includes("petit") && !lower.includes("grand")) {
    return { generation: 1, isLineage: true };
  }
  if (SPOUSE_RELATIONS.some(s => lower.includes(s))) {
    return { generation: 0, isLineage: true };
  }
  return { generation: 0, isLineage: false };
};

const GENERATION_LABELS: Record<number, string> = {
  [-3]: "Arrière-grands-parents",
  [-2]: "Grands-parents",
  [-1]: "Parents",
  [0]: "Conjoint(e)",
  [1]: "Enfants",
  [2]: "Petits-enfants",
  [3]: "Arrière-petits-enfants",
};

const LineageTree = ({ memorialId, deceasedName, deceasedPhoto, isOwner }: LineageTreeProps) => {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const isValidUUID = /^[0-9a-f]{8}-/.test(memorialId);

  // Fetch inter-memorial relations (accepted links)
  const { data: relations, isLoading } = useQuery({
    queryKey: ["lineage-tree", memorialId],
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

        // Determine the relation label from the deceased's perspective
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
        };
      }).filter(Boolean) as Array<TreeNode & { createdBy: string }>;
    },
  });

  // Classify into lineage generations
  const treeNodes = useMemo(() => {
    if (!relations) return [];
    return relations
      .map(r => {
        const { generation, isLineage } = classifyRelation(r.relation);
        if (!isLineage) return null;
        return { ...r, generation };
      })
      .filter(Boolean) as TreeNode[];
  }, [relations]);

  // Group by generation
  const generations = useMemo(() => {
    const map = new Map<number, TreeNode[]>();
    treeNodes.forEach(node => {
      if (!map.has(node.generation)) map.set(node.generation, []);
      map.get(node.generation)!.push(node);
    });
    // Sort by generation number ascending (ancestors first)
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [treeNodes]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const isEmpty = treeNodes.length === 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h3 className="flex items-center gap-2 mb-2">
          <TreePine className="w-5 h-5 text-foreground/70" />
          Arbre de lignage
        </h3>
        <p className="font-serif text-muted-foreground">
          La lignée de {deceasedName}
        </p>
      </div>

      {isEmpty ? (
        /* Empty State */
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
        /* Tree Visualization */
        <div className="relative">
          {/* Central vertical line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/60 -translate-x-1/2 hidden md:block" />

          {/* Ancestor generations */}
          {generations
            .filter(([gen]) => gen < 0)
            .map(([gen, nodes]) => (
              <GenerationRow
                key={gen}
                generation={gen}
                nodes={nodes}
                isAuthenticated={isAuthenticated}
                currentUserId={user?.id}
              />
            ))}

          {/* Central deceased node */}
          <div className="relative z-10 flex justify-center py-6">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-primary bg-muted overflow-hidden grayscale hover:grayscale-0 transition-all duration-600">
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
              <span className="text-xs text-primary font-sans">Défunt(e)</span>
            </div>
          </div>

          {/* Spouse row (generation 0) */}
          {generations
            .filter(([gen]) => gen === 0)
            .map(([gen, nodes]) => (
              <GenerationRow
                key={gen}
                generation={gen}
                nodes={nodes}
                isAuthenticated={isAuthenticated}
                currentUserId={user?.id}
              />
            ))}

          {/* Descendant generations */}
          {generations
            .filter(([gen]) => gen > 0)
            .map(([gen, nodes]) => (
              <GenerationRow
                key={gen}
                generation={gen}
                nodes={nodes}
                isAuthenticated={isAuthenticated}
                currentUserId={user?.id}
              />
            ))}
        </div>
      )}
    </div>
  );
};

/* ── Generation Row ── */
interface GenerationRowProps {
  generation: number;
  nodes: TreeNode[];
  isAuthenticated: boolean;
  currentUserId?: string;
}

const GenerationRow = ({ generation, nodes, isAuthenticated, currentUserId }: GenerationRowProps) => {
  const label = GENERATION_LABELS[generation] || "Famille";

  return (
    <div className="relative py-4">
      {/* Generation label */}
      <div className="text-center mb-3">
        <span className="text-xs font-sans text-muted-foreground tracking-widest uppercase bg-background px-3 relative z-10">
          {label}
        </span>
      </div>

      {/* Nodes */}
      <div className="flex flex-wrap justify-center gap-6 md:gap-8">
        {nodes.map(node => (
          <TreeNodeCard
            key={node.id}
            node={node}
            isAuthenticated={isAuthenticated}
            isCurrentUser={false}
          />
        ))}
      </div>
    </div>
  );
};

/* ── Tree Node Card ── */
interface TreeNodeCardProps {
  node: TreeNode;
  isAuthenticated: boolean;
  isCurrentUser: boolean;
}

const TreeNodeCard = ({ node, isAuthenticated, isCurrentUser }: TreeNodeCardProps) => {
  const content = (
    <div
      className={`flex flex-col items-center group transition-all duration-300 ${
        isCurrentUser ? "ring-2 ring-ai-gold/50 rounded-lg p-2 bg-ai-gold/5" : ""
      }`}
    >
      <div
        className={`w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden grayscale hover:grayscale-0 transition-all duration-600 border ${
          isCurrentUser ? "border-ai-gold bg-ai-gold/20" : "border-border bg-muted"
        }`}
      >
        {node.photo ? (
          <img
            src={node.photo}
            alt={displayName(node.name, isAuthenticated)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-serif text-lg text-muted-foreground">
              {node.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </span>
          </div>
        )}
      </div>
      <span className="mt-2 font-serif text-xs md:text-sm text-foreground text-center max-w-[100px] truncate">
        {displayName(node.name, isAuthenticated)}
      </span>
      <span className="text-[10px] md:text-xs text-muted-foreground font-sans text-center">
        {node.relation}
      </span>
    </div>
  );

  // Wrap in link if share token is available
  if (node.shareToken) {
    return (
      <Link
        to={`/m/${node.shareToken}`}
        className="hover:opacity-80 transition-opacity"
        title={`Voir l'espace mémoriel de ${displayName(node.name, isAuthenticated)}`}
      >
        {content}
      </Link>
    );
  }

  return content;
};

export default LineageTree;
