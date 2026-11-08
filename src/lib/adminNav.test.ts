import { describe, it, expect } from 'vitest';
import { ADMIN_NAV, resolveAdminCrumbs } from './adminNav';
import { ADMIN_PREFIX as P } from './adminRoutes';

const LEGACY = ['', '/memoriaux', '/moderation', '/finances',
  '/audit-suggestions', '/pont-intermediaires', '/modeles', '/corbeille', '/intelligence-sociale',
  '/utilisateurs', '/parametres', '/historique'].map((s) => P + s);

describe('BO-01 navigation', () => {
  it('garde les 12 entrées dans le menu', () => {
    const all = ADMIN_NAV.flatMap((p) => p.items.map((i) => i.to));
    for (const r of LEGACY) expect(all).toContain(r);
    expect(all).toHaveLength(12);
  });
  it('a 4 pôles', () => expect(ADMIN_NAV).toHaveLength(4));
  it('pôles dans l’ordre demandé, tableau de bord en tête', () => {
    expect(ADMIN_NAV.map((p) => p.label)).toEqual([
      'Pilotage & finances',
      'Opérations mémorielles',
      'Relations & intelligence',
      'Gouvernance',
    ]);
    expect(ADMIN_NAV[0].items[0]).toMatchObject({ to: P, label: 'Tableau de bord', end: true });
  });
  it('statistiques et analyses fusionnées dans le tableau de bord', () => {
    const all = ADMIN_NAV.flatMap((p) => p.items.map((i) => i.to));
    expect(all).not.toContain(`${P}/statistiques`);
    expect(all).not.toContain(`${P}/analytics`);
  });
  it('fil d’Ariane des sous-pages', () => {
    expect(resolveAdminCrumbs(`${P}/memoriaux/abc`)?.item.to).toBe(`${P}/memoriaux`);
    expect(resolveAdminCrumbs(`${P}/modeles/new`)?.sub).toBe('Nouveau');
    expect(resolveAdminCrumbs(P)?.item.label).toBe('Tableau de bord');
  });
});
