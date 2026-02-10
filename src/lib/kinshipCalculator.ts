/**
 * Kinship Calculator — "Pont des Vivants"
 * Calculates genealogical degrees, social labels,
 * common ancestor detection, and confidence scoring.
 */

/* ── Types ── */
export interface KinshipAnalysis {
  degree: number;
  hasAlliance: boolean;
  label: string;
  commonAncestorIndex: number | null;
  confidence: "haute" | "moyenne" | "faible";
}

/* ── Degree mapping by relation type ── */
const DEGREE_PATTERNS: [string[], number][] = [
  // 1 degree — direct parent/child
  [["père", "mère", "fils", "fille", "enfant"], 1],
  // 2 degrees — siblings, grandparent/grandchild
  [["frère", "sœur", "soeur", "demi-frère", "demi-sœur", "demi-soeur",
    "grand-père", "grand-mère", "petit-fils", "petite-fille"], 2],
  // 3 degrees — uncle/aunt, nephew/niece, great-grandparent
  [["oncle", "tante", "neveu", "nièce", "niece",
    "arrière-grand", "arrière-petit"], 3],
  // 4 degrees — cousins
  [["cousin", "cousine"], 4],
];

/* ── Alliance keywords (0 degrees but flags the path) ── */
const ALLIANCE_KW = [
  "époux", "épouse", "mari", "femme", "conjoint", "conjointe",
  "beau-père", "belle-mère", "beau-fils", "belle-fille",
  "beau-frère", "belle-sœur", "belle-soeur",
];

/* ── Ascending relations (child → parent direction) ── */
const ASCENDING_KW = [
  "fils", "fille", "enfant", "petit-fils", "petite-fille",
  "neveu", "nièce", "niece",
];

/* ── Helpers ── */
function getRelationDegree(rel: string): number {
  const l = rel.toLowerCase();
  if (ALLIANCE_KW.some(k => l.includes(k))) return 0;
  for (const [keywords, degree] of DEGREE_PATTERNS) {
    if (keywords.some(k => l.includes(k))) return degree;
  }
  return 1; // Default for unknown relations
}

function isAllianceRel(rel: string): boolean {
  return ALLIANCE_KW.some(k => rel.toLowerCase().includes(k));
}

function isAscendingRel(rel: string): boolean {
  return ASCENDING_KW.some(k => rel.toLowerCase().includes(k));
}

/* ── Main analysis function ── */
export function analyzeKinship(relations: string[]): KinshipAnalysis {
  if (!relations.length) {
    return {
      degree: 0,
      hasAlliance: false,
      label: "Même personne",
      commonAncestorIndex: null,
      confidence: "haute",
    };
  }

  // Sum degrees and detect alliance
  let degree = 0;
  let hasAlliance = false;
  for (const rel of relations) {
    degree += getRelationDegree(rel);
    if (isAllianceRel(rel)) hasAlliance = true;
  }

  // Heuristic common ancestor detection:
  // Track generation level as we walk the path.
  // The highest point is the most likely common ancestor.
  let gen = 0;
  let maxGen = 0;
  let maxGenIdx = 0;
  for (let i = 0; i < relations.length; i++) {
    if (isAllianceRel(relations[i])) continue;
    if (isAscendingRel(relations[i])) {
      gen++; // Going up toward ancestors
    } else {
      gen--; // Going down or lateral
    }
    if (gen > maxGen) {
      maxGen = gen;
      maxGenIdx = i + 1; // Node AFTER this relation is the ancestor
    }
  }

  const commonAncestorIndex = maxGen > 0
    ? Math.min(maxGenIdx, relations.length)
    : Math.floor(relations.length / 2);

  // Confidence based on path length and alliance presence
  let confidence: KinshipAnalysis["confidence"];
  if (relations.length <= 2 && !hasAlliance) confidence = "haute";
  else if (relations.length <= 4) confidence = "moyenne";
  else confidence = "faible";

  return {
    degree,
    hasAlliance,
    label: degreeToSocialLabel(degree, hasAlliance),
    commonAncestorIndex,
    confidence,
  };
}

/* ── Social label translation ── */
function degreeToSocialLabel(degree: number, hasAlliance: boolean): string {
  const suffix = hasAlliance ? " par alliance" : "";
  switch (degree) {
    case 0: return "Conjoints";
    case 1: return `Parent / Enfant${suffix}`;
    case 2: return `Frères / Sœurs${suffix}`;
    case 3: return `Oncle / Neveu${suffix}`;
    case 4: return `Cousins germains${suffix}`;
    case 5: return `Cousins issus de germains${suffix}`;
    case 6: return `Cousins au 2ème degré${suffix}`;
    default: return `Parents au ${degree}ème degré${suffix}`;
  }
}

/* ── Format degree display ── */
export function formatDegree(degree: number): string {
  if (degree === 0) return "Direct";
  if (degree === 1) return "1er degré";
  return `${degree}ème degré`;
}
