import { describe, it, expect } from 'vitest';
import { compareGeo } from './geoFusionComparator';
import { EMPTY_GEO } from './geoLands';

const base = { ...EMPTY_GEO, origin_country: 'GA', origin_locality: 'Oyem', residence_country: 'GA', burial_country: 'GA', burial_status: 'done' as const };

describe('compareGeo', () => {
  it('origines identiques', () => {
    expect(compareGeo(base, base).find((f) => f.land === 'Terre originelle')?.kind).toBe('identical');
  });
  it('pays de résidence différents', () => {
    expect(compareGeo(base, { ...base, residence_country: 'FR' }).find((f) => f.land === 'Terre de vie')?.kind).toBe('different');
  });
  it("pays d'inhumation absent sur le Master", () => {
    const f = compareGeo(base, { ...base, burial_country: null }).find((x) => x.source === 'memorials.burial_country/burial_locality');
    expect(f?.kind).toBe('missing');
    expect(f?.label).toContain('le Master');
  });
  it('inhumation prévue versus réalisée', () => {
    expect(compareGeo({ ...base, burial_status: 'planned' }, base).some((f) => f.kind === 'status_different')).toBe(true);
  });
  it('champs vides sur les deux fiches', () => {
    const r = compareGeo(EMPTY_GEO, EMPTY_GEO);
    expect(r).toHaveLength(3);
    expect(r.every((f) => f.kind === 'missing')).toBe(true);
  });
});
