import { describe, it, expect } from 'vitest';
import { compareFusion, type FusionSubject } from './ragetFusionComparator';

const base: FusionSubject = { id: 'a', first_name: 'Jean', last_name: 'Obame', birth_date: '1950-01-01', death_date: '2020-05-05', biography: 'Instituteur à Libreville, passionné de musique.' };

describe('compareFusion', () => {
  it('flags identical dates as concordance', () => {
    const r = compareFusion(base, { ...base, id: 'b', first_name: 'Jéan' });
    expect(r.filter((f) => f.kind === 'concordance').map((f) => f.field)).toEqual(expect.arrayContaining(['identite', 'naissance', 'deces', 'biographie']));
  });
  it('never treats a shared surname as identity', () => {
    const r = compareFusion(base, { ...base, id: 'b', first_name: 'Paul' });
    expect(r.find((f) => f.field === 'identite')?.kind).toBe('divergence');
  });
  it('reports contradicting death dates', () => {
    const r = compareFusion(base, { ...base, id: 'b', death_date: '2021-01-01' });
    expect(r.find((f) => f.field === 'deces')?.kind).toBe('divergence');
  });
  it('reports missing data', () => {
    const r = compareFusion(base, { ...base, id: 'b', birth_date: null, biography: '' });
    expect(r.find((f) => f.field === 'naissance')?.kind).toBe('missing');
    expect(r.find((f) => f.field === 'biographie')?.kind).toBe('missing');
  });
  it('flags memorials already related to each other', () => {
    const r = compareFusion(base, { ...base, id: 'b' }, [{ other_id: 'b', other_name: 'X', relation: 'frère', status: 'confirmed' }], []);
    expect(r.some((f) => f.field === 'relations' && f.kind === 'divergence')).toBe(true);
  });
  it('detects shared relatives', () => {
    const rel = [{ other_id: 'c', other_name: 'Marie', relation: 'épouse', status: 'confirmed' }];
    const r = compareFusion(base, { ...base, id: 'b' }, rel, rel);
    expect(r.some((f) => f.field === 'relations' && f.kind === 'concordance')).toBe(true);
  });
});
