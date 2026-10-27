// ============================================================================
// RIBENGA-06/07 — Chemins relationnels non linéaires entre mémoriaux
// Parcours UNIQUEMENT sur identifiants canoniques (memorial UUID), jamais par nom.
// Entrée : liens déclarés ET acceptés, déjà résolus côté serveur (RLS appliquée).
// RIBENGA-07 : une arête = UN relation_id canonique. Deux relations distinctes
// acceptées vers le même mémorial restent distinctes ; leurs confirmations ne
// se fusionnent ni ne s'additionnent jamais.
// ============================================================================

export interface VerifiedRelationEdge {
  /** Extrémité A (UUID mémorial) */
  aId: string;
  /** Extrémité B (UUID mémorial) */
  bId: string;
  /** Identifiant canonique memorial_relations.id — unique par arête */
  relationId: string;
  /** Libellé déclaré de CETTE relation */
  label: string;
}

export interface PathStep {
  fromId: string;
  toId: string;
  /** Toutes les relations DISTINCTES acceptées sur cette paire de mémoriaux */
  edges: VerifiedRelationEdge[];
}

export interface RelationPath {
  /** Nœuds ordonnés, extrémités incluses */
  nodeIds: string[];
  steps: PathStep[];
}

const pairKey = (a: string, b: string): string => [a, b].sort().join("|");

/**
 * Consolide les lignes serveur en arêtes : UNE arête par relation_id canonique.
 * Seul un doublon du MÊME relation_id (déclaration listée deux fois côté
 * serveur) est dédupliqué. Deux relation_id distincts ne fusionnent jamais.
 */
export function buildVerifiedEdges(
  rows: Array<{ aId: string; bId: string; relationId: string; label: string }>,
): VerifiedRelationEdge[] {
  const byRelationId = new Map<string, VerifiedRelationEdge>();
  for (const r of rows) {
    if (!r.aId || !r.bId || r.aId === r.bId || !r.relationId) continue;
    if (byRelationId.has(r.relationId)) continue; // même relation déjà vue
    byRelationId.set(r.relationId, {
      aId: r.aId,
      bId: r.bId,
      relationId: r.relationId,
      label: r.label || "Lien déclaré",
    });
  }
  return Array.from(byRelationId.values());
}

/**
 * Recherche les plus courts chemins simples (sans nœud répété) entre deux
 * mémoriaux, en largeur. Borné : maxDepth arêtes, maxPaths parcours distincts.
 * L'adjacence est par PAIRE de mémoriaux : des relations parallèles distinctes
 * ne multiplient pas les parcours, elles enrichissent l'étape (step.edges).
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

  // Adjacence par paire : toutes les relations distinctes d'une paire sur une entrée
  const pairEdges = new Map<string, VerifiedRelationEdge[]>();
  for (const e of edges) {
    const k = pairKey(e.aId, e.bId);
    const list = pairEdges.get(k) || [];
    list.push(e);
    pairEdges.set(k, list);
  }
  const adj = new Map<string, Array<{ to: string; edges: VerifiedRelationEdge[] }>>();
  for (const list of pairEdges.values()) {
    const { aId, bId } = list[0];
    if (!adj.has(aId)) adj.set(aId, []);
    if (!adj.has(bId)) adj.set(bId, []);
    adj.get(aId)!.push({ to: bId, edges: list });
    adj.get(bId)!.push({ to: aId, edges: list });
  }
  if (!adj.has(fromId) || !adj.has(toId)) return [];

  const paths: RelationPath[] = [];
  const seenSequences = new Set<string>();
  const enqueued = new Set<string>([fromId]);
  const queue: Array<{ node: string; nodeIds: string[]; steps: PathStep[] }> = [
    { node: fromId, nodeIds: [fromId], steps: [] },
  ];

  while (queue.length > 0 && paths.length < maxPaths) {
    const { node, nodeIds, steps } = queue.shift()!;
    if (steps.length >= maxDepth) continue;
    for (const { to, edges: stepEdges } of adj.get(node) || []) {
      if (nodeIds.includes(to)) continue; // chemins simples uniquement
      const nextNodeIds = [...nodeIds, to];
      const nextSteps = [...steps, { fromId: node, toId: to, edges: stepEdges }];
      const seq = nextNodeIds.join(">");
      if (to === toId) {
        if (!seenSequences.has(seq)) {
          seenSequences.add(seq);
          paths.push({ nodeIds: nextNodeIds, steps: nextSteps });
        }
      } else if (!enqueued.has(seq)) {
        enqueued.add(seq);
        queue.push({ node: to, nodeIds: nextNodeIds, steps: nextSteps });
      }
    }
  }
  return paths;
}
