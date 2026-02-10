/**
 * Constants and classification logic for the Lineage Tree.
 * Handles relation categorization into 5 pillars:
 * Nuclear, Ascendance, Descendance, Extended/Alliance, Diverse.
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
export const CHILD_RELATIONS = [
  "fils", "fille", "enfant",
];
export const GRANDCHILD_RELATIONS = [
  "petit-fils", "petite-fille",
];
export const GREAT_GRANDCHILD_RELATIONS = [
  "arrière-petit-fils", "arrière-petite-fille",
];
export const SPOUSE_RELATIONS = [
  "époux", "épouse", "mari", "femme", "conjoint", "conjointe",
];
export const SIBLING_RELATIONS = [
  "frère", "sœur", "soeur", "demi-frère", "demi-sœur", "demi-soeur",
];
export const EXTENDED_RELATIONS = [
  "oncle", "tante", "neveu", "nièce", "cousin", "cousine",
  "grand-oncle", "grand-tante", "petit-neveu", "petite-nièce",
  "petit-cousin", "petite-cousine",
];
export const ALLIANCE_RELATIONS = [
  "beau-père", "belle-mère", "beau-frère", "belle-sœur", "belle-soeur",
  "gendre", "belle-fille", "bel-oncle", "belle-tante",
];

/* ── Link style types ── */
export type LinkStyle = "blood" | "alliance" | "extended" | "sibling";

/* ── Generation classification result ── */
export interface ClassifiedRelation {
  generation: number;       // -3 to 3 (ancestors negative, descendants positive)
  isLineage: boolean;       // belongs to the tree at all
  linkStyle: LinkStyle;     // visual style
  pillar: TreePillar;       // which pillar it belongs to
}

export type TreePillar = "nucleaire" | "ascendance" | "descendance" | "elargie" | "alliance";

export type ViewFilter = "ascendance" | "descendance" | "complete";

/* ── Classification function ── */
export const classifyRelation = (relation: string): ClassifiedRelation => {
  const lower = relation.toLowerCase();

  // Arrière-grands-parents (-3)
  if (GREAT_GRANDPARENT_RELATIONS.some(k => lower.includes(k))) {
    return { generation: -3, isLineage: true, linkStyle: "blood", pillar: "ascendance" };
  }
  // Grands-parents (-2)
  if (GRANDPARENT_RELATIONS.some(k => lower.includes(k)) && !lower.includes("arrière")) {
    return { generation: -2, isLineage: true, linkStyle: "blood", pillar: "ascendance" };
  }
  // Parents (-1)
  if (PARENT_RELATIONS.some(p => lower.includes(p)) && !lower.includes("grand") && !lower.includes("beau") && !lower.includes("belle")) {
    return { generation: -1, isLineage: true, linkStyle: "blood", pillar: "nucleaire" };
  }
  // Siblings (0)
  if (SIBLING_RELATIONS.some(s => lower.includes(s))) {
    return { generation: 0, isLineage: true, linkStyle: "sibling", pillar: "nucleaire" };
  }
  // Spouses (0) — excluded from lineage tree
  if (SPOUSE_RELATIONS.some(s => lower.includes(s))) {
    return { generation: 0, isLineage: false, linkStyle: "alliance", pillar: "alliance" };
  }
  // Alliance relations (beau-père, belle-mère, etc.) — excluded from lineage tree
  if (ALLIANCE_RELATIONS.some(a => lower.includes(a))) {
    return { generation: 0, isLineage: false, linkStyle: "alliance", pillar: "alliance" };
  }
  // Extended family (oncle, tante, cousin, etc.)
  if (EXTENDED_RELATIONS.some(e => lower.includes(e))) {
    return { generation: 0, isLineage: true, linkStyle: "extended", pillar: "elargie" };
  }
  // Arrière-petits-enfants (3)
  if (GREAT_GRANDCHILD_RELATIONS.some(k => lower.includes(k))) {
    return { generation: 3, isLineage: true, linkStyle: "blood", pillar: "descendance" };
  }
  // Petits-enfants (2)
  if (GRANDCHILD_RELATIONS.some(k => lower.includes(k))) {
    return { generation: 2, isLineage: true, linkStyle: "blood", pillar: "descendance" };
  }
  // Children (1)
  if (CHILD_RELATIONS.some(c => lower.includes(c)) && !lower.includes("petit") && !lower.includes("belle")) {
    return { generation: 1, isLineage: true, linkStyle: "blood", pillar: "nucleaire" };
  }

  return { generation: 0, isLineage: false, linkStyle: "extended", pillar: "elargie" };
};

/* ── Generation labels ── */
export const GENERATION_LABELS: Record<number, string> = {
  [-3]: "Arrière-grands-parents",
  [-2]: "Grands-parents",
  [-1]: "Parents",
  [0]: "Fratrie & Alliances",
  [1]: "Enfants",
  [2]: "Petits-enfants",
  [3]: "Arrière-petits-enfants",
};

/* ── Pillar labels for filtering UI ── */
export const VIEW_FILTER_LABELS: Record<ViewFilter, string> = {
  ascendance: "Ascendance",
  descendance: "Descendance",
  complete: "Famille complète",
};
