// ============================================================================
// MOTEUR D'INFÉRENCE TRANSITIVE
// Détecte les liens manquants entre mémoriaux via des relations existantes
// Ex: Si A est Frère de B, et A est Neveu de C, alors B est aussi Neveu de C
// ============================================================================

import { inferGender, getGenderAwareRelation } from "@/lib/relationshipInference";
import { validateChronologicalCoherence } from "@/lib/chronologicalValidation";

// ============================================================================
// TYPES
// ============================================================================

type NormalizedType =
  | "PARENT" | "CHILD" | "SIBLING"
  | "GRANDPARENT" | "GRANDCHILD"
  | "UNCLE" | "NEPHEW" | "COUSIN" | "SPOUSE";

export interface TransitiveSuggestion {
  /** Memorial X (source of the inferred link) */
  xMemorialId: string;
  xName: string;
  xFirstName: string;
  xBirthDate: string | null;
  /** Memorial Y (target of the inferred link) */
  yMemorialId: string;
  yName: string;
  yFirstName: string;
  yBirthDate: string | null;
  /** Pivot memorial through which the link was inferred */
  pivotMemorialId: string;
  pivotName: string;
  /** The inferred relation: "X est [relation] de Y" */
  relationType: string;
  /** Gender-aware label */
  genderedRelation: string;
  /** Explanation of how the link was inferred */
  reason: string;
  /** Confidence level */
  confidence: "high" | "medium";
  /** Chronological validation result */
  chronoValid: boolean;
  chronoVerified: boolean;
  /** Unique key for this suggestion (sorted pair) */
  pairKey: string;
}

export interface MemorialNode {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
}

export interface RelationEdge {
  id: string;
  memorialId1: string;
  memorialId2: string;
  relationType: string;
  status: string;
}

// ============================================================================
// NORMALISATION DES RELATIONS
// ============================================================================

const normalizeRelation = (relation: string): NormalizedType | null => {
  const lower = relation.toLowerCase();
  if (["père", "mère"].includes(lower)) return "PARENT";
  if (["fils", "fille"].includes(lower)) return "CHILD";
  if (["frère", "sœur", "soeur"].includes(lower)) return "SIBLING";
  if (["grand-père", "grand-mère"].includes(lower)) return "GRANDPARENT";
  if (["petit-fils", "petite-fille"].includes(lower)) return "GRANDCHILD";
  if (["oncle", "tante"].includes(lower)) return "UNCLE";
  if (["neveu", "nièce", "niece"].includes(lower)) return "NEPHEW";
  if (["cousin", "cousine"].includes(lower)) return "COUSIN";
  if (["époux", "épouse"].includes(lower)) return "SPOUSE";
  return null;
};

/** Inverse d'un type normalisé */
const inverseNormalized = (type: NormalizedType): NormalizedType => {
  const map: Record<NormalizedType, NormalizedType> = {
    PARENT: "CHILD", CHILD: "PARENT",
    SIBLING: "SIBLING",
    GRANDPARENT: "GRANDCHILD", GRANDCHILD: "GRANDPARENT",
    UNCLE: "NEPHEW", NEPHEW: "UNCLE",
    COUSIN: "COUSIN",
    SPOUSE: "SPOUSE",
  };
  return map[type];
};

/** Relation de base (forme masculine) pour chaque type normalisé */
const NORMALIZED_TO_BASE: Record<NormalizedType, string> = {
  PARENT: "Père",
  CHILD: "Fils",
  SIBLING: "Frère",
  GRANDPARENT: "Grand-père",
  GRANDCHILD: "Petit-fils",
  UNCLE: "Oncle",
  NEPHEW: "Neveu",
  COUSIN: "Cousin",
  SPOUSE: "Époux",
};

// ============================================================================
// RÈGLES DE TRANSITIVITÉ
// Notation: P est R_PX de X, P est R_PY de Y → X est [result] de Y
// ============================================================================

const TRANSITIVE_RULES: Record<string, { result: NormalizedType; confidence: "high" | "medium" }> = {
  // Enfants du même parent → Frères/Sœurs
  "PARENT|PARENT": { result: "SIBLING", confidence: "high" },
  // Frère du parent → Oncle
  "SIBLING|PARENT": { result: "UNCLE", confidence: "high" },
  // Enfant du frère → Neveu
  "PARENT|SIBLING": { result: "NEPHEW", confidence: "high" },
  // Frères du même → Frères aussi
  "SIBLING|SIBLING": { result: "SIBLING", confidence: "high" },
  // Parent du parent → Grand-parent
  "CHILD|PARENT": { result: "GRANDPARENT", confidence: "high" },
  // Enfant de l'enfant → Petit-enfant
  "PARENT|CHILD": { result: "GRANDCHILD", confidence: "high" },
  // Parents du même enfant → Époux
  "CHILD|CHILD": { result: "SPOUSE", confidence: "medium" },
  // Parent du frère → même parent
  "CHILD|SIBLING": { result: "PARENT", confidence: "high" },
  // Frère de l'enfant → aussi enfant
  "SIBLING|CHILD": { result: "CHILD", confidence: "high" },
  // Oncle + Parent → Cousins
  "UNCLE|PARENT": { result: "COUSIN", confidence: "medium" },
  "PARENT|UNCLE": { result: "COUSIN", confidence: "medium" },
  // Neveu + Frère → l'autre est aussi Oncle
  "NEPHEW|SIBLING": { result: "UNCLE", confidence: "medium" },
  "SIBLING|NEPHEW": { result: "NEPHEW", confidence: "medium" },
  // Grand-parent + Parent → Arrière-Grand-parent (approx Grand-père)
  "GRANDPARENT|PARENT": { result: "GRANDPARENT", confidence: "medium" },
  // Parent + Grand-parent → Petit-enfant (approx)
  "PARENT|GRANDPARENT": { result: "GRANDCHILD", confidence: "medium" },
};

// ============================================================================
// ALGORITHME PRINCIPAL
// ============================================================================

/**
 * Calcule les suggestions transitives pour un mémorial donné.
 * Scanne toutes les relations acceptées pour trouver des liens à 2 sauts.
 */
export const computeTransitiveSuggestions = (
  targetMemorialId: string,
  relations: RelationEdge[],
  memorials: Map<string, MemorialNode>
): TransitiveSuggestion[] => {
  const acceptedRelations = relations.filter(r => r.status === "accepted");
  if (acceptedRelations.length < 2) return [];

  // Build adjacency: for each memorial, list of (otherMemorialId, relation from this to other)
  const adjacency = new Map<string, Array<{ otherId: string; normalizedType: NormalizedType; rawType: string }>>();

  for (const rel of acceptedRelations) {
    const normType = normalizeRelation(rel.relationType);
    if (!normType) continue;

    // memorial_id_1 is [relationType] of memorial_id_2
    if (!adjacency.has(rel.memorialId1)) adjacency.set(rel.memorialId1, []);
    adjacency.get(rel.memorialId1)!.push({
      otherId: rel.memorialId2,
      normalizedType: normType,
      rawType: rel.relationType,
    });

    // Inverse direction
    if (!adjacency.has(rel.memorialId2)) adjacency.set(rel.memorialId2, []);
    adjacency.get(rel.memorialId2)!.push({
      otherId: rel.memorialId1,
      normalizedType: inverseNormalized(normType),
      rawType: rel.relationType, // raw type is from the perspective of memorial_id_1
    });
  }

  // Build set of existing direct links (to avoid suggesting duplicates)
  const existingPairs = new Set<string>();
  for (const rel of acceptedRelations) {
    existingPairs.add([rel.memorialId1, rel.memorialId2].sort().join("|"));
  }

  // Also include pending relations
  for (const rel of relations) {
    if (rel.status === "pending") {
      existingPairs.add([rel.memorialId1, rel.memorialId2].sort().join("|"));
    }
  }

  const suggestions: TransitiveSuggestion[] = [];
  const seenPairs = new Set<string>();

  // Get all neighbors of the target memorial
  const targetNeighbors = adjacency.get(targetMemorialId) || [];

  for (const neighbor of targetNeighbors) {
    const pivotId = neighbor.otherId;
    // neighbor.normalizedType = type of relation from targetMemorial TO pivot
    // which means: pivot is [inverse] of target, or target is [neighbor.normalizedType] of pivot
    // Actually: in adjacency, we store "from this memorial's perspective":
    // target → pivot with normalizedType = how target relates to pivot (pivot is [normType] relative to target? No...)
    
    // Let me re-clarify: The adjacency stores "P is [normType] of other" for the record (P, other, type).
    // And for the inverse: "other is inverse(normType) of P", stored as other → { otherId: P, normType: inverse(normType) }
    
    // So from target's adjacency entry { otherId: pivot, normType: T }:
    // This means target → pivot with type T
    // If this came from record (target, pivot, rawType) → target is rawType of pivot → T = normalize(rawType)
    // If this came from inverse of record (pivot, target, rawType) → target is inverse(normalize(rawType)) of pivot

    // For the transitive rule: P is R_PX of X, P is R_PY of Y
    // Here P = pivot, X = target, Y = other neighbor of pivot
    // R_PX = how pivot relates to target
    // From target's adjacency: target has { otherId: pivot, normalizedType: T_target_to_pivot }
    // T_target_to_pivot = normalize of "target is [?] of pivot"
    // So pivot is inverse(T_target_to_pivot) of target
    // R_PX = inverse(T_target_to_pivot) — "P is R_PX of X"

    const r_px = inverseNormalized(neighbor.normalizedType);

    // Now look at pivot's other neighbors (excluding target)
    const pivotNeighbors = adjacency.get(pivotId) || [];

    for (const pivotNeighbor of pivotNeighbors) {
      if (pivotNeighbor.otherId === targetMemorialId) continue;

      const yId = pivotNeighbor.otherId;

      // pivotNeighbor.normalizedType = how pivot relates in this direction
      // pivot → yId with normalizedType = from the adjacency perspective
      // This means pivot is [normalizedType] of Y? No...
      // The adjacency entry for pivot → { otherId: Y, normalizedType: T }
      // Means the same as for target above.
      // From record (pivot, Y, rawType): pivot is rawType of Y → T = normalize(rawType)
      // From inverse of record (Y, pivot, rawType): pivot is inverse(normalize(rawType)) of Y

      // R_PY = pivotNeighbor.normalizedType — "P is [this] of Y"
      const r_py = pivotNeighbor.normalizedType;

      // Check if X-Y already linked
      const pairKey = [targetMemorialId, yId].sort().join("|");
      if (existingPairs.has(pairKey) || seenPairs.has(pairKey)) continue;

      // Look up transitive rule
      const ruleKey = `${r_px}|${r_py}`;
      const rule = TRANSITIVE_RULES[ruleKey];
      if (!rule) continue;

      // Get memorial data
      const xNode = memorials.get(targetMemorialId);
      const yNode = memorials.get(yId);
      const pivotNode = memorials.get(pivotId);

      if (!xNode || !yNode || !pivotNode) continue;

      // Compute the base relation and apply gender
      const baseRelation = NORMALIZED_TO_BASE[rule.result];
      const genderedRelation = getGenderAwareRelation(baseRelation, xNode.firstName);

      // Chronological validation
      const chrono = validateChronologicalCoherence(
        xNode.birthDate,
        yNode.birthDate,
        baseRelation
      );

      // Skip if chronologically impossible
      if (!chrono.isValid) continue;

      // Build reason
      const pivotFullName = `${pivotNode.firstName} ${pivotNode.lastName}`;
      const xFullName = `${xNode.firstName} ${xNode.lastName}`;
      const yFullName = `${yNode.firstName} ${yNode.lastName}`;
      const reason = `${pivotFullName} est relié(e) à ${xFullName} et à ${yFullName}`;

      seenPairs.add(pairKey);
      suggestions.push({
        xMemorialId: targetMemorialId,
        xName: xFullName,
        xFirstName: xNode.firstName,
        xBirthDate: xNode.birthDate,
        yMemorialId: yId,
        yName: yFullName,
        yFirstName: yNode.firstName,
        yBirthDate: yNode.birthDate,
        pivotMemorialId: pivotId,
        pivotName: pivotFullName,
        relationType: baseRelation,
        genderedRelation,
        reason,
        confidence: rule.confidence,
        chronoValid: chrono.isValid,
        chronoVerified: chrono.isVerified,
        pairKey,
      });
    }
  }

  // Sort: high confidence first, then verified
  return suggestions.sort((a, b) => {
    const confOrder = { high: 0, medium: 1 };
    if (confOrder[a.confidence] !== confOrder[b.confidence]) {
      return confOrder[a.confidence] - confOrder[b.confidence];
    }
    if (a.chronoVerified !== b.chronoVerified) return a.chronoVerified ? -1 : 1;
    return 0;
  });
};

// ============================================================================
// GESTION DES SUGGESTIONS IGNORÉES (localStorage)
// ============================================================================

const IGNORED_KEY = "floorence_ignored_transitive";

export const getIgnoredSuggestions = (): Set<string> => {
  try {
    const raw = localStorage.getItem(IGNORED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

export const ignoreSuggestion = (pairKey: string): void => {
  const ignored = getIgnoredSuggestions();
  ignored.add(pairKey);
  localStorage.setItem(IGNORED_KEY, JSON.stringify(Array.from(ignored)));
};
