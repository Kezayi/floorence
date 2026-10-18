import { describe, it, expect } from 'vitest';
import { ADMIN_NAV, resolveAdminCrumbs } from './adminNav';
import { ADMIN_PREFIX as P } from './adminRoutes';

const LEGACY = ['', '/memoriaux', '/moderation', '/statistiques', '/analytics', '/finances',
  '/audit-suggestions', '/pont-intermediaires', '/modeles', '/corbeille', '/intelligence-sociale',
  '/utilisateurs', '/parametres', '/historique'].map((s) => P + s);

describe('BO-01 navigation', () => {
  it('garde les 14 anciennes entrées dans le menu', () => {
    const all = ADMIN_NAV.flatMap((p) => p.items.map((i) => i.to));
    for (const r of LEGACY) expect(all).toContain(r);
    expect(all).toHaveLength(14);
  });
  it('a 4 pôles', () => expect(ADMIN_NAV).toHaveLength(4));
  it('fil d’Ariane des sous-pages', () => {
    expect(resolveAdminCrumbs(`${P}/memoriaux/abc`)?.item.to).toBe(`${P}/memoriaux`);
    expect(resolveAdminCrumbs(`${P}/modeles/new`)?.sub).toBe('Nouveau');
    expect(resolveAdminCrumbs(P)?.item.label).toBe('Tableau de bord');
  });
});
