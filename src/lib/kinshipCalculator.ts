/**
 * Kinship Calculator — "Pont des Vivants"
 * Calculates genealogical degrees, social labels,
 * common ancestor detection, confidence scoring,
 * and ambiguity detection for unresolved links.
 */

/* ── Types ── */
export interface KinshipAnalysis {
  degree: number;
  hasAlliance: boolean;
  label: string;
  commonAncestorIndex: number | null;
  confidence: "haute" | "moyenne" | "faible";
  ambiguities: AmbiguousLink[];
}

export interface AmbiguousLink {
  /** Index in the path steps where the ambiguity sits */
  stepIndex: number;
  /** The current relation label used */
  currentRelation: string;
  /** Possible alternative relation labels */
  alternatives: string[];
  /** Human explanation of why it's ambiguous */
  reason: string;
}

/* ── Degree mapping by relation type ── */
const DEGREE_PATTERNS: [string[], number][] = [
  [["père", "mère", "fils", "fille", "enfant"], 1],
  [["frère", "sœur", "soeur", "demi-frère", "demi-sœur", "demi-soeur",
    "grand-père", "grand-mère", "petit-fils", "petite-fille"], 2],
  [["oncle", "tante", "neveu", "nièce", "niece",
    "arrière-grand", "arrière-petit"], 3],
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

/* ── Ambiguity rules ── */
interface AmbiguityRule {
  /** Pattern: pair of consecutive relation keywords that create ambiguity */
  patternA: string[];
  patternB: string[];
  /** The alternatives if this pattern matches */
  alternatives: string[];
  reason: string;
}

const AMBIGUITY_RULES: AmbiguityRule[] = [
  {
    // "Fils/Fille de X" + "X est Père/Mère de Y" → Y could be sibling OR uncle/aunt
    patternA: ["fils", "fille", "enfant", "petit-fils", "petite-fille"],
    patternB: ["père", "mère"],
    alternatives: ["Père", "Oncle", "Grand-oncle"],
    reason: "Lien indirect via un ancêtre commun : la filiation directe ou collatérale n'est pas confirmée",
  },
  {
    // Grandchild → Grandparent path could imply parent or uncle
    patternA: ["petit-fils", "petite-fille"],
    patternB: ["grand-père", "grand-mère"],
    alternatives: ["Parent", "Oncle/Tante"],
    reason: "Le petit-enfant partage un grand-parent, mais le lien intermédiaire (parent vs oncle) n'est pas défini",
  },
  {
    // Sibling path could be full or half
    patternA: ["frère", "sœur", "soeur"],
    patternB: ["frère", "sœur", "soeur"],
    alternatives: ["Frère/Sœur", "Demi-frère/Demi-sœur", "Cousin(e) germain(e)"],
    reason: "Même fratrie supposée, mais sans confirmation du même couple parental",
  },
  {
    // Nephew path: could be via sibling or via spouse's sibling
    patternA: ["neveu", "nièce", "niece"],
    patternB: ["oncle", "tante"],
    alternatives: ["Oncle/Tante", "Grand-oncle/Grand-tante"],
    reason: "Le lien oncle/neveu peut être direct (fratrie) ou par alliance",
  },
];

/* ── Helpers ── */
function getRelationDegree(rel: string): number {
  const l = rel.toLowerCase();
  if (ALLIANCE_KW.some(k => l.includes(k))) return 0;
  for (const [keywords, degree] of DEGREE_PATTERNS) {
    if (keywords.some(k => l.includes(k))) return degree;
  }
  return 1;
}

function isAllianceRel(rel: string): boolean {
  return ALLIANCE_KW.some(k => rel.toLowerCase().includes(k));
}

function isAscendingRel(rel: string): boolean {
  return ASCENDING_KW.some(k => rel.toLowerCase().includes(k));
}

/** Detect ambiguities in a relation chain */
function detectAmbiguities(relations: string[]): AmbiguousLink[] {
  const ambiguities: AmbiguousLink[] = [];
  if (relations.length < 2) return ambiguities;

  for (let i = 0; i < relations.length - 1; i++) {
    const relA = relations[i].toLowerCase();
    const relB = relations[i + 1].toLowerCase();

    for (const rule of AMBIGUITY_RULES) {
      const matchA = rule.patternA.some(k => relA.includes(k));
      const matchB = rule.patternB.some(k => relB.includes(k));
      if (matchA && matchB) {
        ambiguities.push({
          stepIndex: i + 1, // The node between the two relations
          currentRelation: relations[i + 1],
          alternatives: rule.alternatives,
          reason: rule.reason,
        });
        break; // One ambiguity per step
      }
    }
  }

  return ambiguities;
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
      ambiguities: [],
    };
  }

  let degree = 0;
  let hasAlliance = false;
  for (const rel of relations) {
    degree += getRelationDegree(rel);
    if (isAllianceRel(rel)) hasAlliance = true;
  }

  // Common ancestor detection
  let gen = 0;
  let maxGen = 0;
  let maxGenIdx = 0;
  for (let i = 0; i < relations.length; i++) {
    if (isAllianceRel(relations[i])) continue;
    if (isAscendingRel(relations[i])) {
      gen++;
    } else {
      gen--;
    }
    if (gen > maxGen) {
      maxGen = gen;
      maxGenIdx = i + 1;
    }
  }

  const commonAncestorIndex = maxGen > 0
    ? Math.min(maxGenIdx, relations.length)
    : Math.floor(relations.length / 2);

  // Ambiguity detection
  const ambiguities = detectAmbiguities(relations);

  // Confidence: lower if ambiguities exist
  let confidence: KinshipAnalysis["confidence"];
  if (ambiguities.length > 0) {
    confidence = "faible";
  } else if (relations.length <= 2 && !hasAlliance) {
    confidence = "haute";
  } else if (relations.length <= 4) {
    confidence = "moyenne";
  } else {
    confidence = "faible";
  }

  return {
    degree,
    hasAlliance,
    label: degreeToSocialLabel(degree, hasAlliance),
    commonAncestorIndex,
    confidence,
    ambiguities,
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
