import { describe, it, expect } from "vitest";
import { describeDeclared } from "./relationDirection";
const J = "j", P = "p";
const row = (t: string, a: string, b: string, s = "accepted") => ({ id: t + a, relation_type: t, memorial_id_1: a, memorial_id_2: b, status: s });
describe("relationDirection", () => {
  it("Jacques père de Paul, lu dans les deux sens", () => {
    expect(describeDeclared([row("Père", J, P)], J, P)).toEqual([{ relationId: "PèreJ".replace("J", "j"), aToB: "père", bToA: "enfant" }]);
    expect(describeDeclared([row("Père", J, P)], P, J)[0]).toMatchObject({ aToB: "enfant", bToA: "père" });
  });
  it("Paul fils de Jacques : réciproque neutre, aucun sexe inventé", () => {
    expect(describeDeclared([row("Fils", P, J)], J, P)[0]).toMatchObject({ aToB: "parent", bToA: "fils" });
  });
  it("aucun lien direct / non accepté", () => {
    expect(describeDeclared([row("Père", J, "x")], J, P)).toEqual([]);
    expect(describeDeclared([row("Père", J, P, "pending")], J, P)).toEqual([]);
  });
  it("conflit : deux déclarations restent distinctes", () => {
    expect(describeDeclared([row("Père", J, P), row("Frère", P, J)], J, P)).toHaveLength(2);
  });
  it("type inconnu : formulation neutre", () => {
    expect(describeDeclared([row("Parrain", J, P)], P, J)[0].aToB).toContain("sans équivalent sûr");
  });
});
