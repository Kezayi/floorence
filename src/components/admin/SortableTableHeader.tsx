import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface SortableTableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: SortConfig;
  onSort: (key: string) => void;
  className?: string;
}

const SortableTableHeader = ({
  label,
  sortKey,
  currentSort,
  onSort,
  className,
}: SortableTableHeaderProps) => {
  const isActive = currentSort.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  return (
    <TableHead
      className={cn(
        'cursor-pointer select-none hover:bg-muted/50 transition-colors',
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {direction === 'asc' ? (
          <ArrowUp className="w-4 h-4 text-primary" />
        ) : direction === 'desc' ? (
          <ArrowDown className="w-4 h-4 text-primary" />
        ) : (
          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
    </TableHead>
  );
};

export default SortableTableHeader;
