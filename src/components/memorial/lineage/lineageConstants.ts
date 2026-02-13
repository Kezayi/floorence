/**
 * Constants and classification logic for the Lineage Tree.
 * Handles relation categorization into 5 pillars:
 * Nuclear, Ascendance, Descendance, Extended/Alliance, Diverse.
 * Supports generations -4 to +4.
 */

/* ── Relation keyword sets ── */
export const PARENT_RELATIONS = [
  "père", "mère", "parent", "papa", "maman",
];
export const GRANDPARENT_RELATIONS = [
  "grand-père", "grand-mère", "grandpère", "grandmère",
];
export const GREAT_GRANDPARENT_RELATIONS = [
  "arrière-grand-père", "arrière-grand-mère",
];
export const GREAT_GREAT_GRANDPARENT_RELATIONS = [
  "arrière-arrière-grand-père", "arrière-arrière-grand-mère",
  "arrière arrière grand-père", "arrière arrière grand-mère",
];
export const CHILD_RELATIONS = [
  "fils", "fille", "enfant",
];
export const GRANDCHILD_RELATIONS = [
  "petit-fils", "petite-fille",
];
export const GREAT_GRANDCHILD_RELATIONS = [
  "arrière-petit-fils", "arrière-petite-fille",
];
export const GREAT_GREAT_GRANDCHILD_RELATIONS = [
  "arrière-arrière-petit-fils", "arrière-arrière-petite-fille",
  "arrière arrière petit-fils", "arrière arrière petite-fille",
];
export const SPOUSE_RELATIONS = [
  "époux", "épouse", "mari", "femme", "conjoint", "conjointe",
];
export const SIBLING_RELATIONS = [
  "frère", "sœur", "soeur", "demi-frère", "demi-sœur", "demi-soeur",
];
export const EXTENDED_RELATIONS = [
  "oncle", "tante", "neveu", "nièce", "cousin", "cousine",
  "grand-oncle", "grand-tante", "grande-tante",
  "arrière-grand-oncle", "arrière-grand-tante", "arrière-grande-tante",
  "arrière-arrière-grand-oncle", "arrière-arrière-grand-tante", "arrière-arrière-grande-tante",
  "arrière arrière grand-oncle", "arrière arrière grand-tante", "arrière arrière grande-tante",
  "petit-neveu", "petite-nièce",
  "arrière-petit-neveu", "arrière-petite-nièce",
  "arrière-arrière-petit-neveu", "arrière-arrière-petite-nièce",
  "arrière arrière petit-neveu", "arrière arrière petite-nièce",
  "petit-cousin", "petite-cousine",
];
export const ALLIANCE_RELATIONS = [
  "beau-père", "belle-mère", "beau-frère", "belle-sœur", "belle-soeur",
  "gendre", "belle-fille", "beau-fils", "bel-oncle", "belle-tante",
  "bel oncle", "belle tante",
];

/* ── Link style types ── */
export type LinkStyle = "blood" | "alliance" | "extended" | "sibling";

/* ── Generation classification result ── */
export interface ClassifiedRelation {
  generation: number;       // -4 to 4 (ancestors negative, descendants positive)
  isLineage: boolean;       // belongs to the tree at all
  linkStyle: LinkStyle;     // visual style
  pillar: TreePillar;       // which pillar it belongs to
}

export type TreePillar = "nucleaire" | "ascendance" | "descendance" | "elargie" | "alliance";

export type ViewFilter = "ascendance" | "descendance" | "complete";

/* ── Classification function ── */
export const classifyRelation = (relation: string | null | undefined): ClassifiedRelation => {
  if (!relation) return { generation: 0, isLineage: false, linkStyle: "extended", pillar: "elargie" };
  const lower = relation.toLowerCase();

  // ═══════════ ANCESTORS (negative generations) ═══════════

  // Arrière-arrière-grands-parents (-4)
  if (GREAT_GREAT_GRANDPARENT_RELATIONS.some(k => lower.includes(k))) {
    return { generation: -4, isLineage: true, linkStyle: "blood", pillar: "ascendance" };
  }
  // Arrière-arrière-grands-oncles/tantes (-4)
  if (["arrière-arrière-grand-oncle", "arrière-arrière-grand-tante", "arrière-arrière-grande-tante",
       "arrière arrière grand-oncle", "arrière arrière grand-tante", "arrière arrière grande-tante"]
      .some(k => lower.includes(k))) {
    return { generation: -4, isLineage: true, linkStyle: "extended", pillar: "elargie" };
  }
  // Arrière-grands-parents (-3)
  if (GREAT_GRANDPARENT_RELATIONS.some(k => lower.includes(k))) {
    return { generation: -3, isLineage: true, linkStyle: "blood", pillar: "ascendance" };
  }
  // Arrière-grands-oncles/tantes (-3)
  if (["arrière-grand-oncle", "arrière-grand-tante", "arrière-grande-tante"].some(k => lower.includes(k))) {
    return { generation: -3, isLineage: true, linkStyle: "extended", pillar: "elargie" };
  }
  // Grands-parents (-2)
  if (GRANDPARENT_RELATIONS.some(k => lower.includes(k)) && !lower.includes("arrière")) {
    return { generation: -2, isLineage: true, linkStyle: "blood", pillar: "ascendance" };
  }
  // Grands-oncles & Grandes-tantes (-2)
  if (["grand-oncle", "grand-tante", "grande-tante"].some(k => lower.includes(k)) && !lower.includes("arrière")) {
    return { generation: -2, isLineage: true, linkStyle: "extended", pillar: "elargie" };
  }
  // Parents (-1)
  if (PARENT_RELATIONS.some(p => lower.includes(p)) && !lower.includes("grand") && !lower.includes("beau") && !lower.includes("belle")) {
    return { generation: -1, isLineage: true, linkStyle: "blood", pillar: "nucleaire" };
  }
  // Oncles & Tantes (-1)
  if (["oncle", "tante"].some(k => lower.includes(k)) && !lower.includes("grand") && !lower.includes("bel") && !lower.includes("belle")) {
    return { generation: -1, isLineage: true, linkStyle: "extended", pillar: "elargie" };
  }

  // ═══════════ PIVOT (generation 0) ═══════════

  // Siblings (0, same level as Cujus)
  if (SIBLING_RELATIONS.some(s => lower.includes(s)) && !lower.includes("beau") && !lower.includes("belle")) {
    return { generation: 0, isLineage: true, linkStyle: "sibling", pillar: "nucleaire" };
  }
  // Cousins (0, same level as Cujus — or could be 1, but structurally peers)
  if (["cousin", "cousine"].some(k => lower.includes(k)) && !lower.includes("petit")) {
    return { generation: 0, isLineage: true, linkStyle: "extended", pillar: "elargie" };
  }

  // ═══════════ DESCENDANTS (positive generations) ═══════════

  // Arrière-arrière-petits-enfants (4)
  if (GREAT_GREAT_GRANDCHILD_RELATIONS.some(k => lower.includes(k))) {
    return { generation: 4, isLineage: true, linkStyle: "blood", pillar: "descendance" };
  }
  // Arrière-arrière-petits-neveux/nièces (4)
  if (["arrière-arrière-petit-neveu", "arrière-arrière-petite-nièce",
       "arrière arrière petit-neveu", "arrière arrière petite-nièce"]
      .some(k => lower.includes(k))) {
    return { generation: 4, isLineage: true, linkStyle: "extended", pillar: "elargie" };
  }
  // Arrière-petits-enfants (3)
  if (GREAT_GRANDCHILD_RELATIONS.some(k => lower.includes(k))) {
    return { generation: 3, isLineage: true, linkStyle: "blood", pillar: "descendance" };
  }
  // Arrière-petits-neveux/nièces (3)
  if (["arrière-petit-neveu", "arrière-petite-nièce"].some(k => lower.includes(k))) {
    return { generation: 3, isLineage: true, linkStyle: "extended", pillar: "elargie" };
  }
  // Petits-enfants (2)
  if (GRANDCHILD_RELATIONS.some(k => lower.includes(k))) {
    return { generation: 2, isLineage: true, linkStyle: "blood", pillar: "descendance" };
  }
  // Petits-neveux/nièces (2)
  if (["petit-neveu", "petite-nièce"].some(k => lower.includes(k)) && !lower.includes("arrière")) {
    return { generation: 2, isLineage: true, linkStyle: "extended", pillar: "elargie" };
  }
  // Petits-cousins (2)
  if (["petit-cousin", "petite-cousine"].some(k => lower.includes(k))) {
    return { generation: 2, isLineage: true, linkStyle: "extended", pillar: "elargie" };
  }
  // Children (1)
  if (CHILD_RELATIONS.some(c => lower.includes(c)) && !lower.includes("petit") && !lower.includes("belle")) {
    return { generation: 1, isLineage: true, linkStyle: "blood", pillar: "nucleaire" };
  }
  // Neveux & Nièces (1, same level as children)
  if (["neveu", "nièce"].some(k => lower.includes(k)) && !lower.includes("petit") && !lower.includes("arrière")) {
    return { generation: 1, isLineage: true, linkStyle: "extended", pillar: "elargie" };
  }

  // ═══════════ ALLIANCE (excluded from lineage) ═══════════

  // Spouses (0)
  if (SPOUSE_RELATIONS.some(s => lower.includes(s))) {
    return { generation: 0, isLineage: false, linkStyle: "alliance", pillar: "alliance" };
  }
  // Alliance relations (beau-père, belle-mère, etc.)
  if (ALLIANCE_RELATIONS.some(a => lower.includes(a))) {
    return { generation: 0, isLineage: false, linkStyle: "alliance", pillar: "alliance" };
  }

  return { generation: 0, isLineage: false, linkStyle: "extended", pillar: "elargie" };
};

/* ── Generation labels ── */
export const GENERATION_LABELS: Record<number, string> = {
  [-4]: "Arrière-arrière-grands-parents, Grands-oncles & Grandes-tantes",
  [-3]: "Arrière-grands-parents, Grands-oncles & Grandes-tantes",
  [-2]: "Grands-parents, Grands-oncles & Grandes-tantes",
  [-1]: "Parents, Oncles & Tantes",
  [0]: "Fratrie & Cousins",
  [1]: "Enfants, Neveux & Nièces",
  [2]: "Petits-enfants, Petits-neveux & Petites-nièces",
  [3]: "Arrière-petits-enfants, Petits-neveux & Petites-nièces",
  [4]: "Arrière-arrière-petits-enfants",
};

/* ── Pillar labels for filtering UI ── */
export const VIEW_FILTER_LABELS: Record<ViewFilter, string> = {
  ascendance: "Ascendance",
  descendance: "Descendance",
  complete: "Famille complète",
};
