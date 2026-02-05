import { useState, useMemo, useCallback } from 'react';
import { SortConfig, SortDirection } from '@/components/admin/SortableTableHeader';

export function useSortableTable<T>(
  data: T[] | undefined,
  defaultSortKey: string = 'created_at',
  defaultDirection: SortDirection = 'desc'
) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: defaultSortKey,
    direction: defaultDirection,
  });

  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        // Cycle: desc -> asc -> desc
        return {
          key,
          direction: prev.direction === 'desc' ? 'asc' : 'desc',
        };
      }
      // New column: start with desc
      return { key, direction: 'desc' };
    });
  }, []);

  const sortedData = useMemo(() => {
    if (!data || !sortConfig.direction) return data;

    return [...data].sort((a, b) => {
      const aValue = (a as Record<string, unknown>)[sortConfig.key];
      const bValue = (b as Record<string, unknown>)[sortConfig.key];

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;

      // String comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, 'fr', { sensitivity: 'base' });
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      // Number comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Boolean comparison
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        const comparison = aValue === bValue ? 0 : aValue ? 1 : -1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      // Date string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const dateA = new Date(aValue).getTime();
        const dateB = new Date(bValue).getTime();
        if (!isNaN(dateA) && !isNaN(dateB)) {
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
      }

      return 0;
    });
  }, [data, sortConfig]);

  return {
    sortConfig,
    handleSort,
    sortedData,
  };
}
