import { Link } from "react-router-dom";
import { SearchResult, RelationshipEdge } from "@/lib/searchWithRelations";
import { User, Heart, Link2, ArrowRight } from "lucide-react";
import { useMemo } from "react";

interface SearchResultsProps {
  results: SearchResult[];
  relationships: RelationshipEdge[];
  clusters: SearchResult[][];
  query: string;
  onClose: () => void;
}

const confidenceColors = {
  high: "bg-green-500/20 text-green-400 border-green-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  low: "bg-muted/50 text-muted-foreground border-muted",
};

// Groupe les relations par label et type
interface GroupedRelationship {
  label: string;
  relationshipType: string;
  confidence: "high" | "medium" | "low";
  count: number;
  pairs: Array<{
    from: SearchResult;
    to: SearchResult;
    memorialSlug: string;
    memorialName: string;
  }>;
}

const groupRelationships = (relationships: RelationshipEdge[]): GroupedRelationship[] => {
  const grouped = new Map<string, GroupedRelationship>();

  for (const rel of relationships) {
    const key = `${rel.label}-${rel.relationshipType}`;
    
    if (grouped.has(key)) {
      const existing = grouped.get(key)!;
      existing.count++;
      existing.pairs.push({
        from: rel.from,
        to: rel.to,
        memorialSlug: rel.to.type === "memorial" ? rel.to.memorialSlug : rel.from.memorialSlug,
        memorialName: rel.to.type === "memorial" ? rel.to.memorialName : rel.from.memorialName,
      });
    } else {
      grouped.set(key, {
        label: rel.label,
        relationshipType: rel.relationshipType,
        confidence: rel.confidence,
        count: 1,
        pairs: [{
          from: rel.from,
          to: rel.to,
          memorialSlug: rel.to.type === "memorial" ? rel.to.memorialSlug : rel.from.memorialSlug,
          memorialName: rel.to.type === "memorial" ? rel.to.memorialName : rel.from.memorialName,
        }],
      });
    }
  }

  return Array.from(grouped.values());
};

const SearchResults = ({ results, relationships, clusters, query, onClose }: SearchResultsProps) => {
  const groupedRelationships = useMemo(() => groupRelationships(relationships), [relationships]);

  if (results.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground font-sans">
          Aucun résultat pour "{query}"
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[70vh] overflow-y-auto">
      {/* Results Summary */}
      <div className="p-4 border-b border-border bg-muted/30">
        <p className="text-sm text-muted-foreground font-sans">
          {results.length} résultat{results.length > 1 ? "s" : ""} trouvé{results.length > 1 ? "s" : ""} pour "{query}"
        </p>
      </div>

      {/* Relationship Network - Grouped */}
      {groupedRelationships.length > 0 && (
        <div className="p-4 border-b border-border bg-secondary/50">
          <h4 className="font-serif text-sm font-medium mb-3 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            Maillage des relations ({relationships.length})
          </h4>
          <div className="space-y-3">
            {groupedRelationships.map((group, idx) => (
              <GroupedRelationshipBadge 
                key={idx} 
                group={group} 
                onClose={onClose}
              />
            ))}
          </div>
        </div>
      )}

      {/* Clustered Results */}
      <div className="divide-y divide-border">
        {clusters.map((cluster, clusterIdx) => (
          <ClusterSection key={clusterIdx} cluster={cluster} onClose={onClose} />
        ))}
      </div>
    </div>
  );
};

const GroupedRelationshipBadge = ({ 
  group, 
  onClose 
}: { 
  group: GroupedRelationship; 
  onClose: () => void;
}) => {
  // Dédupliquer les mémoriaux
  const uniqueMemorials = useMemo(() => {
    const seen = new Set<string>();
    return group.pairs.filter(pair => {
      if (seen.has(pair.memorialSlug)) return false;
      seen.add(pair.memorialSlug);
      return true;
    });
  }, [group.pairs]);

  return (
    <div className="space-y-2">
      {/* Relation Label with Count */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border ${confidenceColors[group.confidence]}`}>
          <ArrowRight className="w-3 h-3" />
          <span className="font-sans font-medium">{group.label}</span>
          {group.count > 1 && (
            <span className="ml-1 px-1.5 py-0.5 bg-background/50 rounded-full text-[10px]">
              {group.count}
            </span>
          )}
        </div>
      </div>

      {/* Associated Memorials */}
      <div className="ml-4 pl-3 border-l-2 border-border/50 space-y-1">
        {uniqueMemorials.map((pair, idx) => (
          <Link
            key={idx}
            to={`/memorial/${pair.memorialSlug}`}
            onClick={onClose}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group py-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary/50 group-hover:bg-primary transition-colors" />
            <span className="font-sans truncate">
              {pair.from.name}
              <span className="text-muted-foreground/60 mx-1">→</span>
              {pair.to.name}
            </span>
            <span className="text-muted-foreground/50 text-[10px] ml-auto shrink-0">
              ({pair.memorialName})
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

const ClusterSection = ({ cluster, onClose }: { cluster: SearchResult[]; onClose: () => void }) => {
  const memorial = cluster.find(r => r.type === "memorial");
  const authors = cluster.filter(r => r.type === "author");

  return (
    <div className="p-4">
      {/* Memorial Header */}
      <Link
        to={`/memorial/${cluster[0].memorialSlug}`}
        onClick={onClose}
        className="flex items-center gap-3 mb-3 group"
      >
        <div className="w-12 h-14 overflow-hidden rounded-sm bg-muted shrink-0">
          {cluster[0].photo && (
            <img
              src={cluster[0].photo}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-sans mb-0.5">
            Mémorial
          </p>
          <h4 className="font-serif text-foreground group-hover:text-primary transition-colors truncate">
            {cluster[0].memorialName}
          </h4>
        </div>
      </Link>

      {/* Authors in this cluster */}
      {authors.length > 0 && (
        <div className="ml-4 pl-4 border-l-2 border-border space-y-2">
          <p className="text-xs text-muted-foreground font-sans">
            Personnes liées ({authors.length})
          </p>
          {authors.map((author, idx) => (
            <AuthorResult key={idx} author={author} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  );
};

const AuthorResult = ({ author, onClose }: { author: SearchResult; onClose: () => void }) => {
  return (
    <Link
      to={`/memorial/${author.memorialSlug}`}
      onClick={onClose}
      className="flex items-center gap-3 p-2 rounded-sm hover:bg-muted/50 transition-colors group"
    >
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <User className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-sm text-foreground group-hover:text-primary transition-colors truncate">
          {author.name}
        </p>
        {author.relation && (
          <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-muted text-muted-foreground text-xs font-sans rounded">
            {author.relation}
          </span>
        )}
      </div>
      <Heart className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
};

export default SearchResults;
