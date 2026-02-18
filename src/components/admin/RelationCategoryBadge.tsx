import { getRelationCategory, type RelationCategoryName } from '@/lib/relationCategoryUtils';
import { getRelationWithDeceased } from '@/lib/relationshipInference';

/* Relation display: minimalist italic style, no badge background */

interface RelationCategoryBadgeProps {
  relation: string;
  showCategory?: boolean;
}

const RelationCategoryBadge = ({ relation, showCategory = false }: RelationCategoryBadgeProps) => {
  const category = getRelationCategory(relation);
  const displayLabel = getRelationWithDeceased(relation);

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-sans italic text-muted-foreground">
        {displayLabel}
      </span>
      {showCategory && (
        <span className="text-[10px] text-muted-foreground/70 leading-tight">{category}</span>
      )}
    </div>
  );
};

export default RelationCategoryBadge;
