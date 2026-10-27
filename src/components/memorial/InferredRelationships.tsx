import { useMemo } from "react";
import { inferAllRelationships, InferredRelationship, getRelationWithDeceased, INFERENCE_DISCLAIMER } from "@/lib/relationshipInference";
import { Users, Link2 } from "lucide-react";

interface InferredRelationshipsProps {
  messages: Array<{ authorName: string; relationCategory: string }>;
  deceasedGender?: 'male' | 'female';
}

const confidenceColors = {
  high: "bg-green-500/20 text-green-300 border-green-500/30",
  medium: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  low: "bg-memorial-dark-muted/20 text-memorial-dark-muted border-memorial-dark-muted/30",
};

const confidenceLabels = {
  high: "Lien direct",
  medium: "Lien probable",
  low: "Lien indirect",
};

const InferredRelationships = ({ messages, deceasedGender }: InferredRelationshipsProps) => {
  const relationships = useMemo(() => {
    return inferAllRelationships(messages);
  }, [messages]);

  if (relationships.length === 0) return null;

  // Only show high and medium confidence relationships
  const significantRelationships = relationships.filter(
    (r) => r.confidence === "high" || r.confidence === "medium"
  );

  if (significantRelationships.length === 0) return null;

  return (
    <div className="mb-10 p-6 bg-memorial-dark-muted/10 border border-memorial-dark-muted/20 rounded-sm">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-memorial-dark-muted" />
        <h4 className="font-serif text-lg text-memorial-dark-foreground">
          Liens entre les proches
        </h4>
      </div>
      <p className="text-sm text-memorial-dark-muted mb-4 font-sans">
        {INFERENCE_DISCLAIMER} — relations calculées à partir des liens avec {deceasedGender === 'female' ? 'la défunte' : 'le défunt'}, non vérifiées.
      </p>
      
      <div className="space-y-3">
        {significantRelationships.map((rel, index) => (
          <RelationshipCard key={index} relationship={rel} deceasedGender={deceasedGender} />
        ))}
      </div>
    </div>
  );
};

const RelationshipCard = ({ relationship, deceasedGender }: { relationship: InferredRelationship; deceasedGender?: 'male' | 'female' }) => {
  return (
    <div className="flex items-center gap-3 p-3 bg-memorial-dark/50 rounded-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-serif text-memorial-dark-foreground truncate">
            {relationship.fromAuthor}
          </span>
          <span className="text-xs text-memorial-dark-muted font-sans">
            ({getRelationWithDeceased(relationship.fromRelation, deceasedGender)})
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <Link2 className="w-4 h-4 text-memorial-dark-muted" />
        <span title={INFERENCE_DISCLAIMER} className={`text-xs px-2 py-1 rounded border font-sans ${confidenceColors[relationship.confidence]}`}>
          <span className="sr-only">{INFERENCE_DISCLAIMER} : </span>{relationship.inferredLink} <span className="opacity-70">(hypothèse)</span>
        </span>
        <Link2 className="w-4 h-4 text-memorial-dark-muted" />
      </div>
      
      <div className="flex-1 min-w-0 text-right">
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <span className="text-xs text-memorial-dark-muted font-sans">
            ({getRelationWithDeceased(relationship.toRelation, deceasedGender)})
          </span>
          <span className="font-serif text-memorial-dark-foreground truncate">
            {relationship.toAuthor}
          </span>
        </div>
      </div>
    </div>
  );
};

export default InferredRelationships;
