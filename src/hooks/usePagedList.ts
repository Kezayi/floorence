import { useEffect, useMemo, useState } from 'react';

export const ADMIN_PAGE_SIZE = 25;

/** Découpe une liste déjà chargée en pages ; revient à la page 1 quand la liste change de taille. */
export function pageSlice<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  return {
    items: items.slice((current - 1) * pageSize, current * pageSize),
    page: current,
    totalPages,
    totalCount: items.length,
    hasNextPage: current < totalPages,
    hasPreviousPage: current > 1,
  };
}

export function usePagedList<T>(items: T[], initialSize = ADMIN_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);
  useEffect(() => setPage(1), [items.length]);
  const result = useMemo(() => pageSlice(items, page, pageSize), [items, page, pageSize]);
  return {
    ...result,
    pagination: {
      page: result.page,
      pageSize,
      totalCount: result.totalCount,
      totalPages: result.totalPages,
      hasNextPage: result.hasNextPage,
      hasPreviousPage: result.hasPreviousPage,
      onPageChange: (p: number) => { setPage(p); window.scrollTo(0, 0); },
      onPageSizeChange: (s: number) => { setPageSize(s); setPage(1); },
      pageSizeOptions: [25, 50, 100],
    },
  };
}
