import { useMemo, Suspense, useState } from "react";
import { Users, Link2, GitBranch, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { inferAllRelationships, InferredRelationship, getCleanRelationName, getRelationWithDeceased } from "@/lib/relationshipInference";
import RelationshipGraph3D from "./RelationshipGraph3D";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
interface RelationshipMaillageProps {
  deceasedName: string;
  posts: Array<{
    authorId: string;
    authorName: string;
    relationCategory: string;
  }>;
}

// Category colors for display
const categoryColors: Record<string, string> = {
  famille: "bg-blue-500",
  allies: "bg-green-500",
  amis: "bg-yellow-500",
  autre: "bg-red-500",
};

const getCategoryType = (category: string): string => {
  const lowerCategory = category.toLowerCase();
  
  if (
    lowerCategory.includes("fils") ||
    lowerCategory.includes("fille") ||
    lowerCategory.includes("père") ||
    lowerCategory.includes("mère") ||
    lowerCategory.includes("frère") ||
    lowerCategory.includes("sœur") ||
    lowerCategory.includes("soeur") ||
    lowerCategory.includes("grand") ||
    lowerCategory.includes("petit") ||
    lowerCategory.includes("oncle") ||
    lowerCategory.includes("tante") ||
    lowerCategory.includes("cousin") ||
    lowerCategory.includes("neveu") ||
    lowerCategory.includes("nièce")
  ) {
    return "famille";
  }
  
  if (
    lowerCategory.includes("époux") ||
    lowerCategory.includes("épouse") ||
    lowerCategory.includes("mari") ||
    lowerCategory.includes("femme") ||
    lowerCategory.includes("beau") ||
    lowerCategory.includes("belle") ||
    lowerCategory.includes("gendre") ||
    lowerCategory.includes("bru")
  ) {
    return "allies";
  }
  
  if (
    lowerCategory.includes("ami") ||
    lowerCategory.includes("connaissance") ||
    lowerCategory.includes("collègue") ||
    lowerCategory.includes("voisin") ||
    lowerCategory.includes("camarade") ||
    lowerCategory.includes("élève")
  ) {
    return "amis";
  }
  
  return "autre";
};

const confidenceBadges = {
  high: { label: "Lien direct", className: "bg-green-100 text-green-800 border-green-200" },
  medium: { label: "Lien probable", className: "bg-amber-100 text-amber-800 border-amber-200" },
  low: { label: "Lien indirect", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

const RelationshipMaillage = ({ deceasedName, posts }: RelationshipMaillageProps) => {
  // Get unique authors with their relations to deceased
  const directRelations = useMemo(() => {
    const uniqueAuthors = new Map<string, { name: string; category: string }>();
    posts.forEach((post) => {
      if (!uniqueAuthors.has(post.authorId)) {
        uniqueAuthors.set(post.authorId, {
          name: post.authorName,
          category: post.relationCategory,
        });
      }
    });
    return Array.from(uniqueAuthors.values());
  }, [posts]);

  // Get all inferred relationships
  const inferredRelationships = useMemo(() => {
    const messages = posts.map((p) => ({
      authorName: p.authorName,
      relationCategory: p.relationCategory,
    }));
    return inferAllRelationships(messages);
  }, [posts]);

  // Group direct relations by category
  const groupedRelations = useMemo(() => {
    const groups: Record<string, Array<{ name: string; category: string }>> = {
      famille: [],
      allies: [],
      amis: [],
      autre: [],
    };
    
    directRelations.forEach((rel) => {
      const type = getCategoryType(rel.category);
      groups[type].push(rel);
    });
    
    return groups;
  }, [directRelations]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h3 className="flex items-center gap-2 mb-2">
          <GitBranch className="w-5 h-5 text-primary" />
          Maillage relationnel
        </h3>
        <p className="font-serif text-muted-foreground">
          Visualisation des liens autour de {deceasedName}
        </p>
      </div>

      {/* 3D Graph */}
      <div className="relative">
        <Suspense fallback={
          <Skeleton className="h-[400px] w-full rounded-sm" />
        }>
          <RelationshipGraph3D deceasedName={deceasedName} posts={posts} />
        </Suspense>
        <p className="text-xs text-muted-foreground mt-2 text-center font-sans">
          Faites glisser pour faire pivoter • Scroll pour zoomer
        </p>
      </div>

      {/* Direct Relations with Deceased */}
      <div className="bg-secondary p-6 rounded-sm">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h4>Relations directes avec le défunt</h4>
        </div>
        
        {directRelations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun hommage n'a encore été déposé.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Famille */}
            {groupedRelations.famille.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${categoryColors.famille}`} />
                  <span className="text-sm font-sans font-medium">Famille ({groupedRelations.famille.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-5">
                  {groupedRelations.famille.map((rel, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="font-serif">{rel.name}</span>
                      <span className="text-muted-foreground text-xs">({getCleanRelationName(rel.category)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Alliés */}
            {groupedRelations.allies.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${categoryColors.allies}`} />
                  <span className="text-sm font-sans font-medium">Alliés ({groupedRelations.allies.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-5">
                  {groupedRelations.allies.map((rel, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="font-serif">{rel.name}</span>
                      <span className="text-muted-foreground text-xs">({getCleanRelationName(rel.category)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Amis */}
            {groupedRelations.amis.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${categoryColors.amis}`} />
                  <span className="text-sm font-sans font-medium">Amis & Connaissances ({groupedRelations.amis.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-5">
                  {groupedRelations.amis.map((rel, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="font-serif">{rel.name}</span>
                      <span className="text-muted-foreground text-xs">({getCleanRelationName(rel.category)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Autre */}
            {groupedRelations.autre.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${categoryColors.autre}`} />
                  <span className="text-sm font-sans font-medium">Autres ({groupedRelations.autre.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-5">
                  {groupedRelations.autre.map((rel, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="font-serif">{rel.name}</span>
                      <span className="text-muted-foreground text-xs">({getCleanRelationName(rel.category)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inferred Relationships with Pagination */}
      {inferredRelationships.length > 0 && (
        <InferredRelationshipsSection relationships={inferredRelationships} />
      )}

      {/* Empty state for inferences */}
      {inferredRelationships.length === 0 && directRelations.length > 1 && (
        <div className="bg-muted/50 p-6 rounded-sm text-center">
          <Link2 className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Pas assez d'informations pour inférer des relations entre les proches.
          </p>
        </div>
      )}
    </div>
  );
};

// Pagination constants
const INFERENCES_PER_PAGE = 5;

// Inferred Relationships Section with Pagination
const InferredRelationshipsSection = ({ relationships }: { relationships: InferredRelationship[] }) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(relationships.length / INFERENCES_PER_PAGE);
  const startIndex = (currentPage - 1) * INFERENCES_PER_PAGE;
  const endIndex = startIndex + INFERENCES_PER_PAGE;
  const paginatedRelationships = relationships.slice(startIndex, endIndex);
  
  return (
    <div className="bg-secondary p-6 rounded-sm">
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="w-5 h-5 text-primary" />
        <h4>Relations inférées entre les proches</h4>
        <span className="text-sm text-muted-foreground font-sans">
          ({relationships.length})
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-4 font-sans">
        Liens déduits automatiquement à partir des relations avec le défunt
      </p>
      
      <div className="space-y-3">
        {paginatedRelationships.map((rel, index) => (
          <InferredRelationshipCard key={startIndex + index} relationship={rel} />
        ))}
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <span className="text-sm text-muted-foreground font-sans">
            {startIndex + 1}-{Math.min(endIndex, relationships.length)} sur {relationships.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-sans px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-2"
            >
              <ChevronRight className="h-4 w-4" />
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
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-background rounded-sm border border-border">
      {/* From person */}
      <div className="flex-1 min-w-0">
        <div className="font-serif text-foreground truncate">{relationship.fromAuthor}</div>
        <div className="text-xs text-muted-foreground font-sans">{getRelationWithDeceased(relationship.fromRelation)}</div>
      </div>
      
      {/* Inferred link */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="h-px w-4 bg-border hidden sm:block" />
        <div className="flex flex-col items-center">
          <span className={`text-xs px-3 py-1 rounded-full border font-sans ${badge.className}`}>
            {relationship.inferredLink}
          </span>
          <span className="text-[10px] text-muted-foreground mt-1 font-sans">{badge.label}</span>
        </div>
        <div className="h-px w-4 bg-border hidden sm:block" />
      </div>
      
      {/* To person */}
      <div className="flex-1 min-w-0 sm:text-right">
        <div className="font-serif text-foreground truncate">{relationship.toAuthor}</div>
        <div className="text-xs text-muted-foreground font-sans">{getRelationWithDeceased(relationship.toRelation)}</div>
      </div>
    </div>
  );
};

export default RelationshipMaillage;
