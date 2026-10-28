/**
 * RIBENGA — person ↔ deceased relation declared INSIDE one memorial (tribute relation_link).
 * Source: server-validated `tribute_links` (grouped per contributor account, no user id exposed).
 * A declaration is never a proof; lineage labels derived from the same tribute are the same source.
 */
export interface TributeLink {
  memorial_id: string;
  author: string;
  /** "unique": one account; "ambiguous": several accounts/anonymous posts share this name on the memorial. */
  identity: "unique" | "ambiguous";
  links: string[];
}

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("fr")
  .replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export function readTributeLinks(raw: unknown, allowedMemorialIds: readonly string[]): TributeLink[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(allowedMemorialIds);
  return raw.filter((t): t is TributeLink => !!t && typeof t === "object"
    && typeof t.memorial_id === "string" && allowed.has(t.memorial_id)
    && typeof t.author === "string" && t.author.trim() !== ""
    && (t.identity === "unique" || t.identity === "ambiguous")
    && Array.isArray(t.links) && t.links.every((l: unknown) => typeof l === "string"))
    .slice(0, 300);
}

type G = "F" | "M" | "N";
/** contributor role (normalized) → deceased role by deceased gender as written in the label. */
const REVERSE: Array<[RegExp, Record<G, string>]> = [
  [/^arriere petit (fils|fille|enfant)$/, { F: "arrière-grand-mère", M: "arrière-grand-père", N: "arrière-grand-parent" }],
  [/^petit (fils|fille|enfant)s?$|^petite fille$/, { F: "grand-mère", M: "grand-père", N: "grand-parent" }],
  [/^(fils|fille|enfant)$/, { F: "mère", M: "père", N: "parent" }],
  [/^(grand pere|grand mere|grand parent)$/, { F: "petite-fille", M: "petit-fils", N: "petit-enfant" }],
  [/^(pere|mere|parent)$/, { F: "fille", M: "fils", N: "enfant" }],
  [/^(frere|soeur)$/, { F: "sœur", M: "frère", N: "frère ou sœur" }],
  [/^(epoux|epouse|conjoint|conjointe|mari|femme)$/, { F: "épouse", M: "époux", N: "conjoint(e)" }],
  [/^(neveu|niece)$/, { F: "tante", M: "oncle", N: "oncle ou tante" }],
  [/^(oncle|tante)$/, { F: "nièce", M: "neveu", N: "neveu ou nièce" }],
  [/^(cousin|cousine)$/, { F: "cousine", M: "cousin", N: "cousin(e)" }],
];

/** "Petit-fils de la Défunte" → role "petit-fils", deceased gender F. Gender only from the label itself. */
export function parseTributeLabel(label: string): { role: string; gender: G } | null {
  const raw = label.trim();
  if (!raw) return null;
  const n = norm(raw);
  const gender: G = /\bdefunte\b/.test(n) ? "F" : /\bdefunt\b/.test(n) ? "M" : "N";
  const role = n.replace(/\b(de la|du|de l|de)\s+defunte?\b.*$/, "").replace(/^(son|sa|ses|mon|ma)\s+/, "").trim();
  return role ? { role, gender } : null;
}

/** Wording of the deceased toward the contributor, or null when no safe reverse exists. */
export function reverseTributeRole(label: string): string | null {
  const p = parseTributeLabel(label);
  if (!p) return null;
  for (const [re, by] of REVERSE) if (re.test(p.role)) return by[p.gender];
  return null;
}

/** Contributor role as declared, readable ("Petit-fils de la Défunte" → "petit-fils"). */
export function contributorRole(label: string): string {
  const cut = label.trim().replace(/\s+(de la|du|de l'|de)\s+d[ée]funte?\b.*$/i, "").replace(/^(son|sa|ses)\s+/i, "");
  return (cut || label.trim()).toLocaleLowerCase("fr");
}

export interface NamedMemorial { id: string; first_name: string | null; last_name: string | null }

export type PersonPair =
  | { kind: "ok"; order: "person-first" | "deceased-first"; memorialId: string; tribute: TributeLink }
  | { kind: "ambiguous" | "none" };

/**
 * "lien entre A et B": one side must match exactly one cited memorial full name, the other side exactly
 * one contributor name on THAT memorial. Several accounts with that name → ambiguous (no guess).
 */
export function resolvePersonDeceasedPair(question: string, memorials: NamedMemorial[], tributes: TributeLink[]): PersonPair | null {
  const m = norm(question).match(/\b(?:lien|liens|relation|relations|parente)\b.*?\bentre\s+(.+?)\s+et\s+(.+)$/);
  if (!m) return null;
  const has = (seg: string, name: string) => name.includes(" ") && ` ${seg} `.includes(` ${name} `);
  const memIn = (seg: string) => memorials.filter((c) => has(seg, norm(`${c.first_name ?? ""} ${c.last_name ?? ""}`)));
  const tryOrder = (memSeg: string, personSeg: string): PersonPair | null => {
    const mems = memIn(memSeg);
    if (mems.length !== 1) return null;
    const hits = tributes.filter((t) => t.memorial_id === mems[0].id && has(personSeg, norm(t.author)));
    if (!hits.length) return { kind: "none" };
    if (hits.length > 1 || hits[0].identity !== "unique") return { kind: "ambiguous" };
    return { kind: "ok", order: "person-first", memorialId: mems[0].id, tribute: hits[0] };
  };
  const b = tryOrder(m[2], m[1]); // A = person, B = deceased
  const a = tryOrder(m[1], m[2]); // A = deceased, B = person
  if (a?.kind === "ok" && b?.kind === "ok") return { kind: "ambiguous" };
  if (b?.kind === "ok") return b;
  if (a?.kind === "ok") return { ...a, order: "deceased-first" };
  return a ?? b;
}
