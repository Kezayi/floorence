import { useMemo, useState } from "react";
import { Users, Link2, GitBranch, ChevronLeft, ChevronRight } from "lucide-react";
import { inferAllRelationships, InferredRelationship, getCleanRelationName, getRelationWithDeceased } from "@/lib/relationshipInference";
import RelationshipGraph2D from "./RelationshipGraph2D";
import { Button } from "@/components/ui/button";

interface RelationshipMaillageProps {
  deceasedName: string;
  posts: Array<{
    authorId: string;
    authorName: string;
    relationCategory: string;
  }>;
}

// Palette Floorence — cohérente avec le graphe
const categoryStyles: Record<string, { dot: string; label: string }> = {
  famille: { dot: "bg-foreground", label: "Famille" },
  allies: { dot: "bg-[hsl(45,90%,50%)]", label: "Alliés" },
  amis: { dot: "bg-[hsl(340,60%,65%)]", label: "Amis & Connaissances" },
  autre: { dot: "bg-muted-foreground", label: "Autres" },
};

const getCategoryType = (category: string): string => {
  const lowerCategory = category.toLowerCase();
  if (
    lowerCategory.includes("fils") || lowerCategory.includes("fille") ||
    lowerCategory.includes("père") || lowerCategory.includes("mère") ||
    lowerCategory.includes("frère") || lowerCategory.includes("sœur") ||
    lowerCategory.includes("soeur") || lowerCategory.includes("grand") ||
    lowerCategory.includes("petit") || lowerCategory.includes("oncle") ||
    lowerCategory.includes("tante") || lowerCategory.includes("cousin") ||
    lowerCategory.includes("neveu") || lowerCategory.includes("nièce")
  ) return "famille";
  if (
    lowerCategory.includes("époux") || lowerCategory.includes("épouse") ||
    lowerCategory.includes("mari") || lowerCategory.includes("femme") ||
    lowerCategory.includes("beau") || lowerCategory.includes("belle") ||
    lowerCategory.includes("gendre") || lowerCategory.includes("bru")
  ) return "allies";
  if (
    lowerCategory.includes("ami") || lowerCategory.includes("connaissance") ||
    lowerCategory.includes("collègue") || lowerCategory.includes("voisin") ||
    lowerCategory.includes("camarade") || lowerCategory.includes("élève")
  ) return "amis";
  return "autre";
};

// Couleur du label selon la nature du lien
const getRelationColorClass = (relation: string): string => {
  if (relation.includes("Époux") || relation.includes("Épouse") || 
      relation.includes("Belle-") || relation.includes("Beau-") ||
      relation.includes("Gendre") || relation.includes("Bru")) {
    return "text-[hsl(var(--gesture-candle))]";
  }
  if (relation.includes("Mère") || relation.includes("Fille") || 
      relation.includes("Sœur") || relation.includes("Tante") ||
      relation.includes("Nièce") || relation.includes("Cousine") ||
      relation.includes("Grand-mère") || relation.includes("Petite-")) {
    return "text-[hsl(var(--gesture-flower))]";
  }
  return "text-foreground";
};

const confidenceBadges = {
  high: { label: "Lien direct", className: "bg-foreground/5 text-foreground border-foreground/15" },
  medium: { label: "Lien probable", className: "bg-[hsl(45,90%,50%)]/10 text-[hsl(45,70%,35%)] border-[hsl(45,90%,50%)]/20" },
  low: { label: "Lien indirect", className: "bg-muted text-muted-foreground border-border" },
};

const RelationshipMaillage = ({ deceasedName, posts }: RelationshipMaillageProps) => {
  const directRelations = useMemo(() => {
    const uniqueAuthors = new Map<string, { name: string; category: string }>();
    posts.forEach((post) => {
      if (!uniqueAuthors.has(post.authorId)) {
        uniqueAuthors.set(post.authorId, { name: post.authorName, category: post.relationCategory });
      }
    });
    return Array.from(uniqueAuthors.values());
  }, [posts]);

  const inferredRelationships = useMemo(() => {
    const messages = posts.map((p) => ({ authorName: p.authorName, relationCategory: p.relationCategory }));
    return inferAllRelationships(messages);
  }, [posts]);

  const groupedRelations = useMemo(() => {
    const groups: Record<string, Array<{ name: string; category: string }>> = {
      famille: [], allies: [], amis: [], autre: [],
    };
    directRelations.forEach((rel) => {
      groups[getCategoryType(rel.category)].push(rel);
    });
    return groups;
  }, [directRelations]);

  const isMaillageEmpty = directRelations.length === 0;

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h3 className="flex items-center gap-2 mb-2">
          <GitBranch className="w-5 h-5 text-foreground/70" />
          Maillage relationnel
        </h3>
        <p className="font-serif text-muted-foreground">
          Visualisation des liens autour de {deceasedName}
        </p>
      </div>

      {isMaillageEmpty ? (
        <div className="bg-muted/30 border border-border rounded-sm p-10 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
          <h4 className="text-lg font-serif mb-2">Commencer à tisser la communauté</h4>
          <p className="text-sm text-muted-foreground font-serif max-w-md mx-auto mb-3">
            Aucun hommage n'a encore été déposé. Soyez le premier à partager un souvenir 
            et à construire le maillage relationnel autour de {deceasedName}.
          </p>
          <p className="text-xs text-muted-foreground/60 font-sans italic">
            Chaque témoignage enrichit la mémoire collective et révèle les liens qui unissent les proches.
          </p>
        </div>
      ) : (
        <>
          {/* Graphe 2D */}
          <div className="relative bg-card/50 border border-border/60 rounded-sm p-4">
            <RelationshipGraph2D deceasedName={deceasedName} posts={posts} />
          </div>

          {/* Relations directes */}
          <div className="bg-muted/30 border border-border/60 p-6 rounded-sm">
            <div className="flex items-center gap-2 mb-5">
              <Users className="w-4 h-4 text-foreground/60" />
              <h4 className="font-serif text-lg">Relations directes avec le défunt</h4>
            </div>
            
            <div className="space-y-5">
              {(["famille", "allies", "amis", "autre"] as const).map((catKey) => {
                const members = groupedRelations[catKey];
                if (members.length === 0) return null;
                const style = categoryStyles[catKey];
                
                return (
                  <div key={catKey}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                      <span className="text-sm font-sans font-medium tracking-wide">
                        {style.label} ({members.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 ml-4">
                      {members.map((rel, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm py-1">
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span className="font-serif">{rel.name}</span>
                          <span className={`text-xs ${getRelationColorClass(rel.category)}`}>
                            ({getCleanRelationName(rel.category)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Liens inférés */}
          {inferredRelationships.length > 0 && (
            <InferredRelationshipsSection relationships={inferredRelationships} />
          )}

          {inferredRelationships.length === 0 && directRelations.length > 1 && (
            <div className="bg-muted/20 p-6 rounded-sm text-center border border-border/40">
              <Link2 className="w-7 h-7 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground font-serif italic">
                Pas assez d'informations pour inférer des relations entre les proches.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Pagination
const INFERENCES_PER_PAGE = 5;

const InferredRelationshipsSection = ({ relationships }: { relationships: InferredRelationship[] }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(relationships.length / INFERENCES_PER_PAGE);
  const startIndex = (currentPage - 1) * INFERENCES_PER_PAGE;
  const endIndex = startIndex + INFERENCES_PER_PAGE;
  const paginatedRelationships = relationships.slice(startIndex, endIndex);
  
  return (
    <div className="bg-muted/30 border border-border/60 p-6 rounded-sm">
      <div className="flex items-center gap-2 mb-1">
        <Link2 className="w-4 h-4 text-foreground/60" />
        <h4 className="font-serif text-lg">Liens de parenté retrouvés</h4>
        <span className="text-sm text-muted-foreground font-sans">({relationships.length})</span>
      </div>
      <p className="text-xs text-muted-foreground mb-5 font-sans italic">
        Liens déduits automatiquement à partir des relations avec le défunt
      </p>
      
      <div className="space-y-3">
        {paginatedRelationships.map((rel, index) => (
          <InferredRelationshipCard key={startIndex + index} relationship={rel} />
        ))}
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
          <span className="text-xs text-muted-foreground font-sans">
            {startIndex + 1}–{Math.min(endIndex, relationships.length)} sur {relationships.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-7 px-2"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-sans px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-7 px-2"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const InferredRelationshipCard = ({ relationship }: { relationship: InferredRelationship }) => {
  const badge = confidenceBadges[relationship.confidence];
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-card/80 rounded-sm border border-border/40">
      <div className="flex-1 min-w-0">
        <div className="font-serif text-foreground truncate">{relationship.fromAuthor}</div>
        <div className="text-xs text-muted-foreground font-sans">{getRelationWithDeceased(relationship.fromRelation)}</div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <div className="h-px w-4 bg-border/60 hidden sm:block" />
        <div className="flex flex-col items-center">
          <span className={`text-xs px-3 py-1 rounded-sm border font-serif ${badge.className}`}>
            {relationship.inferredLink}
          </span>
          <span className="text-[10px] text-muted-foreground mt-1 font-sans italic">{badge.label}</span>
        </div>
        <div className="h-px w-4 bg-border/60 hidden sm:block" />
      </div>
      
      <div className="flex-1 min-w-0 sm:text-right">
        <div className="font-serif text-foreground truncate">{relationship.toAuthor}</div>
        <div className="text-xs text-muted-foreground font-sans">{getRelationWithDeceased(relationship.toRelation)}</div>
      </div>
    </div>
  );
};

export default RelationshipMaillage;
