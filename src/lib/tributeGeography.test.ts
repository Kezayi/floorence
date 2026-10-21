import { describe, it, expect } from "vitest";
import { normalizeTributeGeography } from "./tributeGeography";

describe("GEO-03 tribute geography", () => {
  it("returns null when no public provenance exists", () => {
    expect(normalizeTributeGeography({ countries: 0, contributors: 0, tributes: 0, by_country: [] })).toBeNull();
  });
  it("sorts by contributors desc then French name", () => {
    const g = normalizeTributeGeography({ contributors: 4, tributes: 6, by_country: [
      { code: "FR", contributors: 1, tributes: 1 }, { code: "GA", contributors: 2, tributes: 4 }, { code: "CM", contributors: 1, tributes: 1 },
    ] })!;
    expect(g.rows.map((r) => r.code)).toEqual(["GA", "CM", "FR"]);
    expect(g.countries).toBe(3);
    expect(g.contributors).toBe(4);
    expect(g.tributes).toBe(6);
  });
  it("drops invalid country codes", () => {
    expect(normalizeTributeGeography({ by_country: [{ code: "ZZ", contributors: 3 }] })).toBeNull();
  });
});
