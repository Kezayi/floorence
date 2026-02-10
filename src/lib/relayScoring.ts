/**
 * Relay Scoring Engine — "Relais de Confiance"
 * Weighted path scoring for the Pont des Vivants.
 * Prioritizes path STRENGTH over path LENGTH.
 */

/* ── Score constants ── */
const SCORE_BLOOD = 10;    // Voie du Sang
const SCORE_ALLIANCE = 7;  // Voie de l'Alliance
const SCORE_MEMORY = 5;    // Intermédiaire Muet (shared memorial tribute)

const BLOOD_KEYWORDS = [
  "père", "mère", "parent", "fils", "fille", "enfant",
  "frère", "sœur", "soeur", "demi-frère", "demi-sœur",
  "grand-père", "grand-mère", "petit-fils", "petite-fille",
  "oncle", "tante", "neveu", "nièce", "cousin", "cousine",
  "arrière-grand", "arrière-petit",
];

const ALLIANCE_KEYWORDS = [
  "époux", "épouse", "mari", "femme", "conjoint", "conjointe",
  "beau-père", "belle-mère", "beau-fils", "belle-fille",
  "beau-frère", "belle-sœur", "belle-soeur",
];

export type PathType = "sang" | "alliance" | "mémoire";

export function classifyRelation(rel: string): PathType {
  const lower = rel.toLowerCase();
  if (BLOOD_KEYWORDS.some(k => lower.includes(k))) return "sang";
  if (ALLIANCE_KEYWORDS.some(k => lower.includes(k))) return "alliance";
  return "mémoire";
}

export function scoreRelation(rel: string): number {
  const type = classifyRelation(rel);
  switch (type) {
    case "sang": return SCORE_BLOOD;
    case "alliance": return SCORE_ALLIANCE;
    case "mémoire": return SCORE_MEMORY;
  }
}

export function scorePath(relations: string[]): number {
  return relations.reduce((sum, rel) => sum + scoreRelation(rel), 0);
}

export function getPathTypeLabel(type: PathType): string {
  switch (type) {
    case "sang": return "Voie du Sang";
    case "alliance": return "Voie de l'Alliance";
    case "mémoire": return "Intermédiaire Muet";
  }
}

export function getDominantPathType(relations: string[]): PathType {
  const counts = { sang: 0, alliance: 0, mémoire: 0 };
  for (const rel of relations) {
    counts[classifyRelation(rel)]++;
  }
  if (counts.sang >= counts.alliance && counts.sang >= counts.mémoire) return "sang";
  if (counts.alliance >= counts.mémoire) return "alliance";
  return "mémoire";
}

/* ── Relay identification ── */
export interface RelayInfo {
  /** Index in the steps array */
  stepIndex: number;
  /** Combined trust score of edges adjacent to this relay node */
  trustScore: number;
  /** Why this person is the ideal relay */
  reason: string;
}

/**
 * Identify the best "Relais de Confiance" in a path.
 * The relay is the intermediate node (not the endpoints) with the 
 * highest combined trust score from its adjacent edges.
 */
export function identifyRelay(
  relations: string[],
  nodeNames: string[]
): RelayInfo | null {
  // Need at least 3 nodes (A → C → B) to have a relay
  if (relations.length < 2 || nodeNames.length < 3) return null;

  let bestIndex = -1;
  let bestScore = -1;
  let bestReason = "";

  // Interior nodes are indices 1..n-2 in nodeNames (skip endpoints)
  for (let i = 1; i < nodeNames.length - 1; i++) {
    const inEdge = relations[i - 1];
    const outEdge = relations[i];
    const combined = scoreRelation(inEdge) + scoreRelation(outEdge);

    if (combined > bestScore) {
      bestScore = combined;
      bestIndex = i;

      const inType = classifyRelation(inEdge);
      const outType = classifyRelation(outEdge);

      if (inType === "sang" && outType === "sang") {
        bestReason = `${nodeNames[i]} est lié par le sang aux deux côtés du chemin`;
      } else if (inType === "sang" || outType === "sang") {
        bestReason = `${nodeNames[i]} est lié par le sang d'un côté et par ${outType === "sang" ? getPathTypeLabel(inType).toLowerCase() : getPathTypeLabel(outType).toLowerCase()} de l'autre`;
      } else {
        bestReason = `${nodeNames[i]} est le pont le plus solide entre les deux vivants`;
      }
    }
  }

  if (bestIndex < 0) return null;
  return { stepIndex: bestIndex, trustScore: bestScore, reason: bestReason };
}

/* ── Weighted BFS: find path with highest score within maxDegrees ── */
interface GraphEdge {
  to: string;
  rel: string;
}

interface WeightedResult {
  path: string[];
  rels: string[];
  score: number;
}

/**
 * Find the STRONGEST path (highest cumulative score) between start and end,
 * within maxHops. Explores all paths up to the limit and returns the best.
 */
export function findStrongestPath(
  graph: Map<string, GraphEdge[]>,
  startId: string,
  endId: string,
  maxHops: number
): WeightedResult | null {
  if (startId === endId) return { path: [startId], rels: [], score: 0 };

  let best: WeightedResult | null = null;

  // DFS with depth limit — since maxHops is small (5), this is tractable
  const visited = new Set<string>();

  function dfs(current: string, path: string[], rels: string[], currentScore: number) {
    if (path.length > maxHops + 1) return;

    if (current === endId) {
      if (!best || currentScore > best.score || 
          (currentScore === best.score && path.length < best.path.length)) {
        best = { path: [...path], rels: [...rels], score: currentScore };
      }
      return;
    }

    // Prune: if remaining hops can't beat best even with max score
    const remainingHops = maxHops + 1 - path.length;
    if (remainingHops <= 0) return;
    if (best && currentScore + remainingHops * SCORE_BLOOD <= best.score) return;

    const neighbors = graph.get(current) || [];
    for (const edge of neighbors) {
      if (visited.has(edge.to)) continue;
      visited.add(edge.to);
      path.push(edge.to);
      rels.push(edge.rel);
      dfs(edge.to, path, rels, currentScore + scoreRelation(edge.rel));
      path.pop();
      rels.pop();
      visited.delete(edge.to);
    }
  }

  visited.add(startId);
  dfs(startId, [startId], [], 0);

  return best;
}

/* ── Plan de Contact generator ── */
export function generateContactPlan(
  personAName: string,
  personBName: string,
  relay: RelayInfo | null,
  nodeNames: string[],
  relations: string[]
): string {
  if (!relay || nodeNames.length < 3) {
    return `${personAName} et ${personBName} partagent un héritage mémoriel commun.`;
  }

  const relayName = nodeNames[relay.stepIndex];
  const relToA = relations[relay.stepIndex - 1];
  const relToB = relations[relay.stepIndex];

  return `Pour rencontrer ${personBName}, parlez à ${relayName}. ` +
    `Pourquoi ? Parce que ${relayName} est ${relToA} de votre côté ` +
    `et ${relToB} du côté de ${personBName}.`;
}
