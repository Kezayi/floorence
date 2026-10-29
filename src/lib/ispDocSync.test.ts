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
  it.each([null, "", "   "])("does not attribute an ISP to an absent name %s", (author_name) => {
    const [fact] = computeIspFacts([p({ author_name, candle_count: 1 })]);
    expect(fact?.isp).toBeNull();
    expect(fact?.reason).toMatch(/identité ambiguë/);
  });
  it("does not attribute combined gestures to one of multiple names on the same account", () => {
    const [fact] = computeIspFacts([p({ author_name: "Alpha Test", candle_count: 1 }), p({ author_name: "Beta Test", candle_count: 1 })]);
    expect(fact?.isp).toBeNull();
    expect(fact?.reason).toMatch(/identité ambiguë/);
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

import { summarizeIsp, targetIspMemorial, formatIsp } from "../../supabase/functions/_shared/isp";
import { readFileSync as rf } from "node:fs";
describe("ISP comparison", () => {
  const posts = [
    p({ user_id: "a", author_name: "Ana", candle_count: 2 }),
    p({ user_id: "b", author_name: "Bea", candle_count: 2 }),
    p({ user_id: "c", author_name: "Céo", candle_count: 1 }),
    p({ user_id: "d", author_name: "Dan", relation_category: "inconnu", candle_count: 1 }),
  ];
  it("max among calculables, exact tie, counts", () => {
    const s = summarizeIsp(computeIspFacts(posts), "m");
    expect(s).toMatchObject({ evaluated: 4, calculable: 3, non_calculable: 1, leaders: ["Ana", "Bea"] });
    expect(s.max).toBeCloseTo(2 / 6);
  });
  it("single winner", () => {
    const s = summarizeIsp(computeIspFacts(posts.slice(1)), "m");
    expect(s.leaders).toEqual(["Bea"]);
  });
  it("all non calculable => no max", () => {
    expect(summarizeIsp(computeIspFacts([posts[3]]), "m")).toMatchObject({ max: null, leaders: [] });
  });
  it("memorial target: unique, named, ambiguous; never cross-memorial", () => {
    const f = computeIspFacts([...posts, p({ memorial_id: "n", user_id: "z", author_name: "Zoé", candle_count: 9 })]);
    const names = new Map([["m", "Marquise NKE MENGUE"], ["n", "Paul Test"]]);
    expect(targetIspMemorial("Qui présente le plus fort ISP dans la communauté de Marquise NKÉ MENGUE ?", f, names)).toBe("m");
    expect(targetIspMemorial("Qui a le plus fort rayonnement ?", f, names)).toBeNull();
    expect(summarizeIsp(f, "m").leaders).not.toContain("Zoé");
    expect(targetIspMemorial("x", computeIspFacts(posts), names)).toBe("m");
  });
  it("0 exact vs tiny value", () => {
    expect(formatIsp(0)).toBe("0");
    expect(formatIsp(0.00001234)).toBe("0.00001234");
    expect(formatIsp(5.5)).toBe("5.5000");
  });
  it("biography fallback suppressed only when ISP facts exist; kinship keeps it", () => {
    const src = rf("supabase/functions/social-search/index.ts", "utf8");
    expect(src).toMatch(/ispHasFacts \? " Pour cette question ISP[\s\S]*Désolé, je ne trouve pas/);
    expect(isIspQuestion("Qui présente le plus fort ISP dans la communauté de Marquise NKE MENGUE ?")).toBe(true);
    expect(isIspQuestion("Quel lien entre Paul et Jacques ?")).toBe(false);
  });
  it("doc documents comparison", () => {
    expect(doc).toContain("Comparaison : maximum par mémorial canonique unique");
  });
});
