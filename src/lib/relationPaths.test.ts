import { describe, it, expect } from "vitest";
import { buildVerifiedEdges, findRelationPaths, type VerifiedRelationEdge } from "./relationPaths";

// UUIDs synthétiques — aucune donnée réelle
const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const C = "00000000-0000-4000-8000-00000000000c";
const D = "00000000-0000-4000-8000-00000000000d";
const E = "00000000-0000-4000-8000-00000000000e";
const F = "00000000-0000-4000-8000-00000000000f";

let rid = 0;
const edge = (aId: string, bId: string, label = "Frère", relationId = `r${++rid}`): VerifiedRelationEdge => ({
  aId, bId, relationId, label,
});

describe("buildVerifiedEdges", () => {
  it("garde DISTINCTES deux relations acceptées avec deux relation_id vers le même mémorial", () => {
    const edges = buildVerifiedEdges([
      { aId: A, bId: B, relationId: "r1", label: "Frère" },
      { aId: B, bId: A, relationId: "r2", label: "Frère" },
    ]);
    expect(edges).toHaveLength(2);
    expect(edges.map((e) => e.relationId).sort()).toEqual(["r1", "r2"]);
  });

  it("déduplique uniquement le MÊME relation_id listé deux fois", () => {
    const edges = buildVerifiedEdges([
      { aId: A, bId: B, relationId: "r1", label: "Frère" },
      { aId: B, bId: A, relationId: "r1", label: "Frère" },
    ]);
    expect(edges).toHaveLength(1);
  });

  it("ignore les boucles, extrémités vides et relation_id manquant", () => {
    const edges = buildVerifiedEdges([
      { aId: A, bId: A, relationId: "r1", label: "X" },
      { aId: "", bId: B, relationId: "r2", label: "Y" },
      { aId: A, bId: B, relationId: "", label: "Z" },
      { aId: A, bId: B, relationId: "r3", label: "Frère" },
    ]);
    expect(edges).toHaveLength(1);
  });
});

describe("findRelationPaths", () => {
  it("trouve un chemin direct", () => {
    const paths = findRelationPaths([edge(A, B)], A, B);
    expect(paths).toHaveLength(1);
    expect(paths[0].nodeIds).toEqual([A, B]);
    expect(paths[0].steps).toHaveLength(1);
  });

  it("trouve un chemin multi-sauts (non linéaire)", () => {
    const paths = findRelationPaths([edge(A, B), edge(B, C)], A, C);
    expect(paths).toHaveLength(1);
    expect(paths[0].nodeIds).toEqual([A, B, C]);
    expect(paths[0].steps.map((s) => s.fromId)).toEqual([A, B]);
  });

  it("retourne plusieurs parcours distincts quand ils sont fondés", () => {
    const paths = findRelationPaths(
      [edge(A, B), edge(B, D), edge(A, C), edge(C, D)],
      A,
      D,
    );
    expect(paths).toHaveLength(2);
    const seqs = paths.map((p) => p.nodeIds.join(">")).sort();
    expect(seqs).toEqual([[A, B, D].join(">"), [A, C, D].join(">")].sort());
  });

  it("retourne vide quand aucun chemin n'est étayé", () => {
    const paths = findRelationPaths([edge(A, B), edge(C, D)], A, D);
    expect(paths).toEqual([]);
  });

  it("respecte la borne de profondeur", () => {
    // Chaîne A-B-C-D-E-F : 5 arêtes, maxDepth 4 => non étayé
    const paths = findRelationPaths(
      [edge(A, B), edge(B, C), edge(C, D), edge(D, E), edge(E, F)],
      A,
      F,
      { maxDepth: 4 },
    );
    expect(paths).toEqual([]);
  });

  it("ne boucle pas et ne répète aucun nœud", () => {
    // Cycle A-B-C-A présent : les chemins trouvés restent simples, le plus court d'abord
    const paths = findRelationPaths(
      [edge(A, B), edge(B, C), edge(C, A), edge(C, D)],
      A,
      D,
    );
    expect(paths).toHaveLength(2);
    expect(paths[0].nodeIds).toEqual([A, C, D]);
    expect(paths[1].nodeIds).toEqual([A, B, C, D]);
    for (const p of paths) {
      expect(new Set(p.nodeIds).size).toBe(p.nodeIds.length);
    }
  });

  it("des relations parallèles distinctes enrichissent l'étape sans multiplier les parcours", () => {
    const e1 = edge(A, B, "Frère", "r-par-1");
    const e2 = edge(A, B, "Cousin", "r-par-2");
    const paths = findRelationPaths([e1, e2, edge(B, C)], A, C);
    expect(paths).toHaveLength(1);
    expect(paths[0].steps[0].edges.map((e) => e.relationId).sort()).toEqual(["r-par-1", "r-par-2"]);
  });

  it("refuse fromId === toId et les extrémités absentes du graphe", () => {
    expect(findRelationPaths([edge(A, B)], A, A)).toEqual([]);
    expect(findRelationPaths([edge(A, B)], A, C)).toEqual([]);
  });
});
