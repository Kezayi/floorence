import { describe, it, expect } from "vitest";
import { buildVerifiedEdges, findRelationPaths, type VerifiedRelationEdge } from "./relationPaths";

// UUIDs synthétiques — aucune donnée réelle
const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const C = "00000000-0000-4000-8000-00000000000c";
const D = "00000000-0000-4000-8000-00000000000d";
const E = "00000000-0000-4000-8000-00000000000e";
const F = "00000000-0000-4000-8000-00000000000f";

const edge = (aId: string, bId: string, label = "Frère", relationIds = [`r-${aId.slice(-1)}${bId.slice(-1)}`]): VerifiedRelationEdge => ({
  aId, bId, relationIds, label,
});

describe("buildVerifiedEdges", () => {
  it("fusionne les déclarations multiples sur une même paire sans dupliquer l'arête", () => {
    const edges = buildVerifiedEdges([
      { aId: A, bId: B, relationIds: ["r1"], label: "Frère" },
      { aId: B, bId: A, relationIds: ["r2"], label: "Sœur" },
    ]);
    expect(edges).toHaveLength(1);
    expect(edges[0].relationIds.sort()).toEqual(["r1", "r2"]);
    expect(edges[0].label).toBe("Frère"); // première déclaration conservée
  });

  it("ignore les boucles et les extrémités vides", () => {
    const edges = buildVerifiedEdges([
      { aId: A, bId: A, relationIds: ["r1"], label: "X" },
      { aId: "", bId: B, relationIds: ["r2"], label: "Y" },
      { aId: A, bId: B, relationIds: ["r3"], label: "Frère" },
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
    const paths = findRelationPaths(
      [edge(A, B), edge(B, C), edge(C, A), edge(C, D)],
      A,
      D,
    );
    expect(paths).toHaveLength(1);
    expect(paths[0].nodeIds).toEqual([A, B, C, D]);
    expect(new Set(paths[0].nodeIds).size).toBe(paths[0].nodeIds.length);
  });

  it("ne duplique pas un parcours malgré des arêtes déclarées en double", () => {
    const paths = findRelationPaths(
      [edge(A, B, "Frère", ["r1"]), edge(A, B, "Frère", ["r2"]), edge(B, C)],
      A,
      C,
    );
    expect(paths).toHaveLength(1);
  });

  it("refuse fromId === toId et les extrémités absentes du graphe", () => {
    expect(findRelationPaths([edge(A, B)], A, A)).toEqual([]);
    expect(findRelationPaths([edge(A, B)], A, C)).toEqual([]);
  });
});
