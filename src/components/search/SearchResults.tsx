import { Link } from "react-router-dom";
import { SearchResult, RelationshipEdge } from "@/lib/searchWithRelations";
import { User, Heart, Link2, ArrowRight } from "lucide-react";

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

const SearchResults = ({ results, relationships, clusters, query, onClose }: SearchResultsProps) => {
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

      {/* Relationship Network */}
      {relationships.length > 0 && (
        <div className="p-4 border-b border-border bg-secondary/50">
          <h4 className="font-serif text-sm font-medium mb-3 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            Maillage des relations ({relationships.length})
          </h4>
          <div className="space-y-2">
            {relationships.slice(0, 5).map((rel, idx) => (
              <RelationshipBadge key={idx} relationship={rel} />
            ))}
            {relationships.length > 5 && (
              <p className="text-xs text-muted-foreground font-sans">
                +{relationships.length - 5} autres relations
              </p>
            )}
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

const RelationshipBadge = ({ relationship }: { relationship: RelationshipEdge }) => {
  return (
    <div className="flex items-center gap-2 text-sm flex-wrap">
      <span className="font-serif text-foreground truncate max-w-[120px]">
        {relationship.from.name}
      </span>
      <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${confidenceColors[relationship.confidence]}`}>
        <ArrowRight className="w-3 h-3" />
        <span className="font-sans">{relationship.label}</span>
        <ArrowRight className="w-3 h-3" />
      </div>
      <span className="font-serif text-foreground truncate max-w-[120px]">
        {relationship.to.name}
      </span>
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
