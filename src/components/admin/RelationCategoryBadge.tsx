import { Badge } from '@/components/ui/badge';
import { getRelationCategory, type RelationCategoryName } from '@/lib/relationCategoryUtils';
import { getRelationWithDeceased } from '@/lib/relationshipInference';

const categoryStyles: Record<RelationCategoryName, string> = {
  'Famille directe': 'bg-[hsl(0,70%,95%)] text-[hsl(0,70%,50%)] border-[hsl(0,70%,80%)]',
  'Famille élargie': 'bg-[hsl(45,90%,92%)] text-[hsl(45,90%,35%)] border-[hsl(45,90%,70%)]',
  'Alliés': 'bg-[hsl(145,60%,92%)] text-[hsl(145,60%,30%)] border-[hsl(145,60%,70%)]',
  'Socio cœur (Amis)': 'bg-[hsl(210,70%,92%)] text-[hsl(210,70%,40%)] border-[hsl(210,70%,70%)]',
  'Autres': 'bg-[hsl(0,0%,92%)] text-[hsl(0,0%,15%)] border-[hsl(0,0%,70%)]',
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
