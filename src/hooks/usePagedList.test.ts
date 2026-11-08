import { describe, it, expect } from 'vitest';
import { pageSlice, ADMIN_PAGE_SIZE } from './usePagedList';

const list = Array.from({ length: 60 }, (_, i) => i);

describe('pagination Back-Office', () => {
  it('25 lignes par page par défaut', () => {
    expect(ADMIN_PAGE_SIZE).toBe(25);
    expect(pageSlice(list, 1, 25).items).toHaveLength(25);
  });
  it('dernière page partielle et nombre de pages', () => {
    const r = pageSlice(list, 3, 25);
    expect(r.items).toEqual([50, 51, 52, 53, 54, 55, 56, 57, 58, 59]);
    expect(r.totalPages).toBe(3);
    expect(r.hasNextPage).toBe(false);
  });
  it('page hors limites ramenée à la dernière', () => {
    expect(pageSlice(list, 9, 25).page).toBe(3);
  });
});
