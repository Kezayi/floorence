import { Badge } from '@/components/ui/badge';
import { getRelationCategory, type RelationCategoryName } from '@/lib/relationCategoryUtils';
import { getRelationWithDeceased } from '@/lib/relationshipInference';

const categoryStyles: Record<RelationCategoryName, string> = {
  'Famille directe': 'bg-[hsl(0,25%,95%)] text-[hsl(0,40%,45%)] border-[hsl(0,25%,82%)]',
  'Famille élargie': 'bg-[hsl(40,30%,93%)] text-[hsl(40,45%,38%)] border-[hsl(40,30%,75%)]',
  'Alliés': 'bg-[hsl(145,20%,93%)] text-[hsl(145,30%,35%)] border-[hsl(145,20%,75%)]',
  'Socio cœur (Amis)': 'bg-[hsl(210,25%,93%)] text-[hsl(210,35%,42%)] border-[hsl(210,25%,78%)]',
  'Autres': 'bg-[hsl(0,0%,93%)] text-[hsl(0,0%,35%)] border-[hsl(0,0%,78%)]',
};

interface RelationCategoryBadgeProps {
  relation: string;
  showCategory?: boolean;
}

const RelationCategoryBadge = ({ relation, showCategory = false }: RelationCategoryBadgeProps) => {
  const category = getRelationCategory(relation);
  const displayLabel = getRelationWithDeceased(relation);

  return (
    <div className="flex flex-col gap-1">
      <Badge variant="outline" className={categoryStyles[category]}>
        {displayLabel}
      </Badge>
      {showCategory && (
        <span className="text-[10px] text-muted-foreground leading-tight">{category}</span>
      )}
    </div>
  );
};

export default RelationCategoryBadge;
