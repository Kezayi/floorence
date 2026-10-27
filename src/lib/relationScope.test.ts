import { describe, it, expect } from "vitest";
import { buildRelationalScope, type ScopeInput } from "./relationScope";

const base: ScopeInput = {
  masterName: "Jean Obame",
  masterLands: {
    origin_country: "GA",
    origin_locality: "Libreville",
    residence_country: null,
    residence_locality: null,
    burial_country: null,
    burial_locality: null,
  },
  directRelationIds: [],
  directLinkedCount: 0,
  lineageCount: 0,
  confirmationsTotal: 0,
  reachableCount: 0,
  reachableLandNames: [],
};

const kinds = (s: ReturnType<typeof buildRelationalScope>) => s.map((x) => x.kind);

describe("buildRelationalScope", () => {
  it("déclare les terres enregistrées comme fait, avec source", () => {
    const s = buildRelationalScope(base);
    const fact = s.find((x) => x.kind === "fact");
    expect(fact?.text).toContain("Origine : Libreville");
    expect(fact?.source).toBe("Terres déclarées du mémorial");
  });

  it("dit explicitement « aucune terre déclarée » quand les terres sont vides", () => {
    const s = buildRelationalScope({
      ...base,
      masterLands: {
        origin_country: null, origin_locality: null,
        residence_country: null, residence_locality: null,
        burial_country: null, burial_locality: null,
      },
    });
    const u = s.find((x) => x.source === "Terres déclarées du mémorial");
    expect(u?.kind).toBe("unsubstantiated");
    expect(u?.text).toContain("Aucune terre déclarée");
  });

  it("dit « indisponibles » (pas « aucune ») quand la lecture des terres a échoué", () => {
    const s = buildRelationalScope({ ...base, masterLands: null });
    const u = s.find((x) => x.source === "Terres déclarées du mémorial");
    expect(u?.text).toBe("Terres du défunt indisponibles.");
  });

  it("compte deux relations DISTINCTES vers le même mémorial comme deux liens, un mémorial", () => {
    const s = buildRelationalScope({
      ...base,
      directRelationIds: ["r1", "r2"],
      directLinkedCount: 1,
    });
    const d = s.find((x) => x.source === "Pont des Ancêtres (liens acceptés)");
    expect(d?.text).toBe("2 liens déclarés et acceptés avec 1 mémorial.");
  });

  it("n'affiche jamais un faux 0 de confirmations quand le compteur est indisponible", () => {
    const s = buildRelationalScope({
      ...base,
      directRelationIds: ["r1"],
      directLinkedCount: 1,
      confirmationsTotal: null,
    });
    const c = s.find((x) => x.source === "Témoignages de confirmation");
    expect(c?.kind).toBe("unsubstantiated");
    expect(c?.text).toBe("Confirmations indisponibles.");
  });

  it("qualifie les confirmations de témoignages, jamais de preuves", () => {
    const s = buildRelationalScope({
      ...base,
      directRelationIds: ["r1"],
      directLinkedCount: 1,
      confirmationsTotal: 3,
    });
    const c = s.find((x) => x.kind === "confirmation");
    expect(c?.text).toContain("3 confirmations");
    expect(c?.text).toContain("pas des preuves");
  });

  it("n'émet l'hypothèse de portée que si des chemins avérés dépassent les liens directs", () => {
    const without = buildRelationalScope({
      ...base,
      directRelationIds: ["r1"],
      directLinkedCount: 1,
      reachableCount: 1,
    });
    expect(kinds(without)).not.toContain("hypothesis");

    const withPath = buildRelationalScope({
      ...base,
      directRelationIds: ["r1"],
      directLinkedCount: 1,
      reachableCount: 3,
      reachableLandNames: ["Cameroun", "Gabon"],
    });
    const h = withPath.find((x) => x.kind === "hypothesis");
    expect(h?.text).toContain("3 mémoriaux reliés");
    expect(h?.text).toContain("Cameroun");
    expect(h?.text).toContain("Hypothèse conditionnée aux seuls liens acceptés");
  });

  it("déclare la portée non étayée quand aucun lien n'existe", () => {
    const s = buildRelationalScope(base);
    const u = s.find((x) => x.source === "Pont des Ancêtres (liens acceptés)");
    expect(u?.kind).toBe("unsubstantiated");
    expect(kinds(s)).not.toContain("hypothesis");
  });

  it("signale un lignage indisponible sans l'assimiler à zéro lien", () => {
    const s = buildRelationalScope({ ...base, lineageCount: null });
    const u = s.find((x) => x.source === "Arbre de lignage");
    expect(u?.kind).toBe("unsubstantiated");
    expect(u?.text).toBe("Lignage indisponible.");
  });
});
