import { Badge } from '@/components/ui/badge';
import { getRelationCategory, type RelationCategoryName } from '@/lib/relationCategoryUtils';
import { getRelationWithDeceased } from '@/lib/relationshipInference';

const categoryStyles: Record<RelationCategoryName, string> = {
  'Famille directe': 'bg-foreground/10 text-foreground border-foreground/20',
  'Famille élargie': 'bg-muted text-muted-foreground border-muted-foreground/20',
  'Alliés': 'bg-[hsl(var(--gesture-candle)/0.15)] text-[hsl(var(--gesture-candle))] border-[hsl(var(--gesture-candle)/0.3)]',
  'Socio cœur (Amis)': 'bg-[hsl(var(--gesture-flower)/0.15)] text-[hsl(var(--gesture-flower))] border-[hsl(var(--gesture-flower)/0.3)]',
  'Autres': 'bg-secondary text-secondary-foreground border-border',
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
