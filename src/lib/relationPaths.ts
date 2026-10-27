// ============================================================================
// RIBENGA-06 — Chemins relationnels non linéaires entre mémoriaux
// Parcours UNIQUEMENT sur identifiants canoniques (memorial UUID), jamais par nom.
// Entrée : liens déclarés ET acceptés, déjà résolus côté serveur (RLS appliquée).
// Aucune inférence ici : un chemin n'est que l'enchaînement de liens vérifiés.
// ============================================================================

export interface VerifiedRelationEdge {
  /** Extrémité A (UUID mémorial) */
  aId: string;
  /** Extrémité B (UUID mémorial) */
  bId: string;
  /** Identifiants canoniques memorial_relations.id étayant cette paire */
  relationIds: string[];
  /** Libellé déclaré (première déclaration conservée) */
  label: string;
}

export interface PathStep {
  fromId: string;
  toId: string;
  edge: VerifiedRelationEdge;
}

export interface RelationPath {
  /** Nœuds ordonnés, extrémités incluses */
  nodeIds: string[];
  steps: PathStep[];
}

const pairKey = (a: string, b: string): string => [a, b].sort().join("|");

/**
 * Consolide les lignes serveur en arêtes uniques par paire de mémoriaux.
 * Plusieurs déclarations sur la même paire fusionnent leurs relationIds
 * (les confirmations se comptent sur l'ensemble), sans dupliquer l'arête.
 */
export function buildVerifiedEdges(
  rows: Array<{ aId: string; bId: string; relationIds: string[]; label: string }>,
): VerifiedRelationEdge[] {
  const byPair = new Map<string, VerifiedRelationEdge>();
  for (const r of rows) {
    if (!r.aId || !r.bId || r.aId === r.bId) continue;
    const k = pairKey(r.aId, r.bId);
    const existing = byPair.get(k);
    if (existing) {
      for (const id of r.relationIds) {
        if (!existing.relationIds.includes(id)) existing.relationIds.push(id);
      }
    } else {
      byPair.set(k, {
        aId: r.aId,
        bId: r.bId,
        relationIds: [...r.relationIds],
        label: r.label || "Lien déclaré",
      });
    }
  }
  return Array.from(byPair.values());
}

/**
 * Recherche les plus courts chemins simples (sans nœud répété) entre deux
 * mémoriaux, en largeur. Borné : maxDepth arêtes, maxPaths parcours distincts.
 * Retourne [] si aucun chemin étayé — l'appelant affiche alors « chemin non étayé ».
 */
export function findRelationPaths(
  edges: VerifiedRelationEdge[],
  fromId: string,
  toId: string,
  opts: { maxDepth?: number; maxPaths?: number } = {},
): RelationPath[] {
  const { maxDepth = 4, maxPaths = 2 } = opts;
  if (!fromId || !toId || fromId === toId) return [];

  const adj = new Map<string, Array<{ to: string; edge: VerifiedRelationEdge }>>();
  for (const e of edges) {
    if (!adj.has(e.aId)) adj.set(e.aId, []);
    if (!adj.has(e.bId)) adj.set(e.bId, []);
    adj.get(e.aId)!.push({ to: e.bId, edge: e });
    adj.get(e.bId)!.push({ to: e.aId, edge: e });
  }
  if (!adj.has(fromId) || !adj.has(toId)) return [];

  const paths: RelationPath[] = [];
  const seenSequences = new Set<string>();
  const queue: Array<{ node: string; nodeIds: string[]; steps: PathStep[] }> = [
    { node: fromId, nodeIds: [fromId], steps: [] },
  ];

  while (queue.length > 0 && paths.length < maxPaths) {
    const { node, nodeIds, steps } = queue.shift()!;
    if (steps.length >= maxDepth) continue;
    for (const { to, edge } of adj.get(node) || []) {
      if (nodeIds.includes(to)) continue; // chemins simples uniquement
      const nextNodeIds = [...nodeIds, to];
      const nextSteps = [...steps, { fromId: node, toId: to, edge }];
      if (to === toId) {
        const seq = nextNodeIds.join(">");
        if (!seenSequences.has(seq)) {
          seenSequences.add(seq);
          paths.push({ nodeIds: nextNodeIds, steps: nextSteps });
        }
      } else {
        queue.push({ node: to, nodeIds: nextNodeIds, steps: nextSteps });
      }
    }
  }
  return paths;
}
