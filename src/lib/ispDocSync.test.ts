import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ISP_CIRCLES, circleRank, ispValue, computeIspFacts, isIspQuestion, exceptionality } from "../../supabase/functions/_shared/isp";

const doc = readFileSync("docs/INDICE_DE_SYMPATHIE_POTENTIEL_ISP.md", "utf8");
const p = (o: any) => ({ memorial_id: "m", user_id: "u", author_name: "A", relation_category: "famille_directe", candle_count: 0, flower_count: 0, ...o });

describe("ISP doc sync", () => {
  it("doc keeps attribution, formula and referential order", () => {
    expect(doc).toContain("propriété exclusive de Michel NGWA AYI, promoteur de Floorence");
    expect(doc).toContain("`ISP = G × C × (1 + C(C−1)/2) / T`");
    expect(doc).toContain(`Référentiel ordonné (rang = position) : ${ISP_CIRCLES.map((c) => c.label).join(" ; ")}`);
  });
});

describe("ISP model", () => {
  it("formula C=1,5,7", () => {
    expect(ispValue(10, 1, 10)).toBe(1);
    expect(ispValue(1, 5, 10)).toBe(5.5);
    expect(exceptionality(7)).toBe(21);
    expect(ispValue(1, 7, 1)).toBe(154);
  });
  it("T=0 and unknown circle non calculable", () => {
    expect(ispValue(0, 1, 0)).toBeNull();
    expect(circleRank("inconnu")).toBeNull();
  });
  it("aliases and dynamic ranks", () => {
    expect(circleRank("socio_coeur")).toBe(4);
    expect(circleRank("Socio-cœur")).toBe(4);
    const custom = [{ key: "x", label: "X", aliases: ["x"] }, ...ISP_CIRCLES];
    expect(circleRank("autres", custom)).toBe(6);
  });
  it("totals, ISP>1, homonyms, anonymous, privacy", () => {
    const f = computeIspFacts([
      p({ user_id: "u1", author_name: "Ext", relation_category: "autres", candle_count: 2 }),
      p({ user_id: "u2", author_name: "Proche", candle_count: 5, flower_count: 3 }),
      p({ user_id: "u3", author_name: "Homo", candle_count: 1 }),
      p({ user_id: null, author_name: "homo", candle_count: 1 }),
    ]);
    const ext = f.find((x) => x.author_name === "Ext")!;
    expect(ext.T).toBe(12); expect(ext.isp).toBeCloseTo(110 / 12); expect(ext.isp! > 1).toBe(true);
    expect(f.find((x) => x.author_name === "Homo")!.isp).toBeNull();
    expect(f.length).toBe(3);
    expect(JSON.stringify(f)).not.toMatch(/u1|u2|u3/);
  });
  it("triggers only on sympathy/influence questions", () => {
    expect(isIspQuestion("Qui a le plus grand rayonnement autour de X ?")).toBe(true);
    expect(isIspQuestion("Quelle influence possible a Paul ?")).toBe(true);
    expect(isIspQuestion("Quel lien entre Paul et Jacques ?")).toBe(false);
    expect(isIspQuestion("Combien de fleurs pour X ?")).toBe(false);
  });
  it("sums distinct tributes once per account and isolates memorial totals", () => {
    const facts = computeIspFacts([
      p({ candle_count: 2, flower_count: 1 }),
      p({ candle_count: 4, flower_count: 3 }),
      p({ memorial_id: "other", candle_count: 100 }),
    ]);
    expect(facts.find((f) => f.memorial_id === "m")).toMatchObject({ G: 10, T: 10, C: 1, E: 0, isp: 1 });
    expect(facts.find((f) => f.memorial_id === "other")).toMatchObject({ G: 100, T: 100, isp: 1 });
  });
  it("rejects multiple circles for one account", () => {
    const [fact] = computeIspFacts([p({ candle_count: 1 }), p({ relation_category: "autres", flower_count: 1 })]);
    expect(fact).toMatchObject({ isp: null, reason: "cercles multiples" });
  });
  it.each([-1, 1.5, null, Number.POSITIVE_INFINITY])("rejects unreliable gesture count %s", (candle_count) => {
    const [fact] = computeIspFacts([p({ candle_count })]);
    expect(fact).toMatchObject({ isp: null, reason: "gestes non fiables" });
  });
  it("does not calculate zero-total or truncated corpus", () => {
    expect(computeIspFacts([p({})])[0]).toMatchObject({ isp: null, reason: "T = 0" });
    expect(computeIspFacts([p({ candle_count: 10 })], { truncated: true })[0]).toMatchObject({ isp: null, T: null, reason: "corpus tronqué" });
  });
});
