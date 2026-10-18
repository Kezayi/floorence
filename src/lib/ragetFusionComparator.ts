// BO-03 — RAGet, comparateur déterministe de fusion (consultatif, aucune IA externe).
// Règle : une ressemblance de nom ne vaut jamais identité ni parenté.

export interface FusionSubject {
  id: string;
  slug?: string | null;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  death_date: string | null;
  biography: string | null;
}

export interface FusionRelation {
  other_id: string;
  other_name: string;
  relation: string;
  status: string | null;
}

export type FindingKind = 'concordance' | 'divergence' | 'missing';
export interface Finding {
  kind: FindingKind;
  field: 'identite' | 'naissance' | 'deces' | 'biographie' | 'relations';
  label: string;
  source: string; // provenance
}

const norm = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const STOP = new Set(['dans', 'avec', 'pour', 'elle', 'etait', 'sont', 'nous', 'vous', 'leur', 'tous', 'cette', 'mais', 'plus', 'comme', 'avait', 'ete']);
const keywords = (t: string | null) =>
  new Set(norm(t).split(/[^a-z0-9]+/).filter((w) => w.length >= 5 && !STOP.has(w)));

function compareDate(a: string | null, b: string | null, field: 'naissance' | 'deces', name: string): Finding {
  const src = `memorials.${field === 'naissance' ? 'birth_date' : 'death_date'}`;
  if (!a || !b) return { kind: 'missing', field, label: `${name} absente sur ${!a && !b ? 'les deux mémoriaux' : !a ? 'la source' : 'la cible'}`, source: src };
  if (a.slice(0, 10) === b.slice(0, 10)) return { kind: 'concordance', field, label: `${name} identique (${a.slice(0, 10)})`, source: src };
  return { kind: 'divergence', field, label: `${name} différente : ${a.slice(0, 10)} / ${b.slice(0, 10)}`, source: src };
}

export function compareFusion(
  a: FusionSubject, b: FusionSubject,
  relA: FusionRelation[] = [], relB: FusionRelation[] = [],
): Finding[] {
  const f: Finding[] = [];
  const fa = norm(a.first_name), la = norm(a.last_name), fb = norm(b.first_name), lb = norm(b.last_name);
  if (fa === fb && la === lb) f.push({ kind: 'concordance', field: 'identite', label: 'Prénom et nom identiques (à confirmer par d’autres éléments)', source: 'memorials.first_name/last_name' });
  else if (fa === lb && la === fb) f.push({ kind: 'divergence', field: 'identite', label: 'Prénom et nom inversés entre les deux fiches', source: 'memorials.first_name/last_name' });
  else {
    if (la === lb) f.push({ kind: 'divergence', field: 'identite', label: 'Même nom de famille mais prénoms différents — homonymie possible, aucune identité déduite', source: 'memorials.first_name' });
    else f.push({ kind: 'divergence', field: 'identite', label: 'Noms différents', source: 'memorials.last_name' });
  }
  f.push(compareDate(a.birth_date, b.birth_date, 'naissance', 'Date de naissance'));
  f.push(compareDate(a.death_date, b.death_date, 'deces', 'Date de décès'));

  if (!a.biography?.trim() || !b.biography?.trim()) {
    f.push({ kind: 'missing', field: 'biographie', label: 'Biographie absente sur au moins un mémorial', source: 'memorials.biography' });
  } else {
    const ka = keywords(a.biography), kb = keywords(b.biography);
    const common = [...ka].filter((w) => kb.has(w));
    if (common.length) f.push({ kind: 'concordance', field: 'biographie', label: `Termes biographiques communs : ${common.slice(0, 8).join(', ')}`, source: 'memorials.biography' });
    else f.push({ kind: 'divergence', field: 'biographie', label: 'Aucun terme biographique significatif en commun', source: 'memorials.biography' });
  }

  const direct = relA.some((r) => r.other_id === b.id) || relB.some((r) => r.other_id === a.id);
  if (direct) f.push({ kind: 'divergence', field: 'relations', label: 'Les deux mémoriaux sont déjà reliés entre eux — ce sont probablement deux personnes distinctes', source: 'memorial_relations' });
  const idsB = new Set(relB.map((r) => r.other_id));
  const shared = relA.filter((r) => idsB.has(r.other_id) && r.other_id !== a.id && r.other_id !== b.id);
  if (shared.length) f.push({ kind: 'concordance', field: 'relations', label: `Proches communs : ${[...new Set(shared.map((r) => r.other_name))].join(', ')}`, source: 'memorial_relations' });
  if (!relA.length || !relB.length) f.push({ kind: 'missing', field: 'relations', label: 'Aucune relation enregistrée sur au moins un mémorial', source: 'memorial_relations' });
  else if (!shared.length && !direct) f.push({ kind: 'missing', field: 'relations', label: 'Aucun proche en commun enregistré', source: 'memorial_relations' });
  return f;
}
