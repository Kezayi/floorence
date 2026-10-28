/**
 * RIBENGA — deterministic direction of a DECLARED relation.
 * Storage convention (check_relationship_coherence): memorial_id_1 is <relation_type> of memorial_id_2.
 * The reverse wording never infers sex: unknown counterpart gender => neutral term.
 */
export interface DeclaredRelationRow {
  id: string; relation_type: string; memorial_id_1: string | null; memorial_id_2: string | null; status: string | null;
}

const REVERSE: Record<string, string> = {
  "Père": "enfant", "Mère": "enfant", "Fils": "parent", "Fille": "parent",
  "Frère": "frère ou sœur", "Sœur": "frère ou sœur", "Grand Frère": "cadet(te)",
  "Époux": "conjoint(e)", "Épouse": "conjoint(e)",
  "Grand-père": "petit-enfant", "Grand-mère": "petit-enfant",
  "Petit-fils": "grand-parent", "Petite-fille": "grand-parent",
};

/** Wording of how `from` relates to `to`, or null when the stored row does not link them directly. */
export function declaredRole(row: DeclaredRelationRow, from: string, to: string): string | null {
  const type = row.relation_type?.trim();
  if (!type || row.status !== "accepted") return null;
  if (row.memorial_id_1 === from && row.memorial_id_2 === to) return type.toLowerCase();
  if (row.memorial_id_1 === to && row.memorial_id_2 === from) {
    const reverse = REVERSE[type];
    return reverse ?? `lié(e) par le lien déclaré « ${type} » (sens inverse, sans équivalent sûr)`;
  }
  return null;
}

export interface DirectedStatement { relationId: string; aToB: string; bToA: string }

/** All direct accepted declarations between A and B, each read in both directions. */
export function describeDeclared(rows: DeclaredRelationRow[], a: string, b: string): DirectedStatement[] {
  const out: DirectedStatement[] = [];
  for (const row of rows) {
    const aToB = declaredRole(row, a, b);
    const bToA = declaredRole(row, b, a);
    if (aToB && bToA) out.push({ relationId: row.id, aToB, bToA });
  }
  return out;
}

const FEM = new Set(["Mère", "Fille", "Sœur", "Épouse", "Grand-mère", "Petite-fille"]);
const MASC = new Set(["Père", "Fils", "Frère", "Grand Frère", "Époux", "Grand-père", "Petit-fils"]);

/** Participle agreement only when the stored type itself carries the gender of `from`. */
export function declaredParticiple(row: DeclaredRelationRow, from: string): string {
  const type = row.relation_type?.trim();
  if (row.memorial_id_1 !== from || !type) return "déclaré(e)";
  return FEM.has(type) ? "déclarée" : MASC.has(type) ? "déclaré" : "déclaré(e)";
}

export interface NamedMemorial { id: string; first_name: string | null; last_name: string | null }

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("fr")
  .replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/**
 * "lien/relation … entre A et B" → [A, B] in the asked order, ONLY when each side matches exactly
 * one candidate full name (first + last) and the two are distinct. Otherwise null (no guess).
 */
export function resolveQuestionPair(question: string, candidates: NamedMemorial[]): [string, string] | null {
  const m = norm(question).match(/\b(?:lien|liens|relation|relations|parente)\b.*?\bentre\s+(.+?)\s+et\s+(.+)$/);
  if (!m) return null;
  const full = candidates.map((c) => ({ id: c.id, name: norm(`${c.first_name ?? ""} ${c.last_name ?? ""}`) }))
    .filter((c) => c.name.includes(" "));
  const pick = (segment: string) => {
    const s = ` ${segment} `;
    const hits = full.filter((c) => s.includes(` ${c.name} `));
    const ids = new Set(hits.map((h) => h.id));
    return ids.size === 1 ? hits[0].id : null;
  };
  const a = pick(m[1]); const b = pick(m[2]);
  return a && b && a !== b ? [a, b] : null;
}
