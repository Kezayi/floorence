import { useState, useCallback } from 'react';

export interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface PaginationResult {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  from: number;
  to: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotalCount: (count: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  resetPage: () => void;
}

export const useServerPagination = (initialPageSize = 10): PaginationResult => {
  const [state, setState] = useState<PaginationState>({
    page: 1,
    pageSize: initialPageSize,
    totalCount: 0,
  });

  const totalPages = Math.ceil(state.totalCount / state.pageSize) || 1;
  const from = (state.page - 1) * state.pageSize;
  const to = Math.min(from + state.pageSize - 1, state.totalCount - 1);

  const setPage = useCallback((page: number) => {
    setState((prev) => ({
      ...prev,
      page: Math.max(1, Math.min(page, Math.ceil(prev.totalCount / prev.pageSize) || 1)),
    }));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setState((prev) => ({
      ...prev,
      pageSize: size,
      page: 1, // Reset to first page when changing page size
    }));
  }, []);

  const setTotalCount = useCallback((count: number) => {
    setState((prev) => ({
      ...prev,
      totalCount: count,
    }));
  }, []);

  const nextPage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      page: Math.min(prev.page + 1, Math.ceil(prev.totalCount / prev.pageSize) || 1),
    }));
  }, []);

  const previousPage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      page: Math.max(prev.page - 1, 1),
    }));
  }, []);

  const resetPage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      page: 1,
    }));
  }, []);

  return {
    page: state.page,
    pageSize: state.pageSize,
    totalCount: state.totalCount,
    totalPages,
    from,
    to: Math.max(to, 0),
    hasNextPage: state.page < totalPages,
    hasPreviousPage: state.page > 1,
    setPage,
    setPageSize,
    setTotalCount,
    nextPage,
    previousPage,
    resetPage,
  };
};
