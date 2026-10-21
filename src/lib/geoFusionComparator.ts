// GEO-01-FIX2 — comparaison factuelle des Trois Terres (lecture seule, aucune résolution).
import { BURIAL_STATUS_LABELS, countryName, type GeoLands } from './geoLands';

export type GeoFindingKind = 'identical' | 'different' | 'missing' | 'status_different';
export interface GeoFinding { kind: GeoFindingKind; land: string; label: string; source: string }

const norm = (s: string | null) => (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const fmt = (c: string | null, l: string | null) => [l, c ? countryName(c) : null].filter(Boolean).join(', ');

const LANDS = [
  { land: 'Terre originelle', c: 'origin_country', l: 'origin_locality' },
  { land: 'Terre de vie', c: 'residence_country', l: 'residence_locality' },
  { land: 'Terre finale', c: 'burial_country', l: 'burial_locality' },
] as const;

/** a = source, b = Master. Une différence n'est jamais qualifiée d'erreur. */
export function compareGeo(a: GeoLands, b: GeoLands): GeoFinding[] {
  const out: GeoFinding[] = [];
  for (const { land, c, l } of LANDS) {
    const source = `memorials.${c}/${l}`;
    const va = fmt(a[c], a[l]), vb = fmt(b[c], b[l]);
    if (!va && !vb) out.push({ kind: 'missing', land, label: `${land} non renseignée sur les deux fiches`, source });
    else if (!va || !vb) out.push({ kind: 'missing', land, label: `${land} absente sur ${!va ? 'la source' : 'le Master'} (renseignée : ${va || vb})`, source });
    else if (a[c] === b[c] && norm(a[l]) === norm(b[l])) out.push({ kind: 'identical', land, label: `${land} identique : ${va}`, source });
    else out.push({ kind: 'different', land, label: `${land} déclarée différemment : ${va} / ${vb}`, source });
  }
  const sa = a.burial_status, sb = b.burial_status;
  if (sa && sb && sa !== sb) out.push({ kind: 'status_different', land: 'Terre finale', label: `Statut de l'inhumation différent : ${BURIAL_STATUS_LABELS[sa]} / ${BURIAL_STATUS_LABELS[sb]}`, source: 'memorials.burial_status' });
  else if (!sa || !sb) { if (sa || sb) out.push({ kind: 'missing', land: 'Terre finale', label: `Statut de l'inhumation absent sur ${!sa ? 'la source' : 'le Master'}`, source: 'memorials.burial_status' }); }
  else out.push({ kind: 'identical', land: 'Terre finale', label: `Statut de l'inhumation identique : ${BURIAL_STATUS_LABELS[sa]}`, source: 'memorials.burial_status' });
  return out;
}
