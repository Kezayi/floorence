import { describe, expect, it } from "vitest";
import { targetIspMemorial, computeIspFacts } from "../../supabase/functions/_shared/isp";
import { tributeLinks } from "../../supabase/functions/social-search/tributeLinks";

describe("RIBENGA closure: account identity and target, isolated fixtures", () => {
  it("does not answer for the only memorial with facts when the question names another", () => {
    const facts = computeIspFacts([{ memorial_id: "a", user_id: "account", author_name: "Iris Test", relation_category: "autres", candle_count: 1, flower_count: 0 }]);
    expect(targetIspMemorial("Quel ISP pour Beta Test ?", facts, new Map([["a", "Alpha Test"], ["b", "Beta Test"]]))).toBe("b");
  });
  it("does not choose one of two homonymous memorials merely because only one has tributes", () => {
    const facts = computeIspFacts([{ memorial_id: "a", user_id: "account", author_name: "Iris Test", relation_category: "autres", candle_count: 1, flower_count: 0 }]);
    expect(targetIspMemorial("Quel ISP pour Alpha Test ?", facts, new Map([["a", "Alpha Test"], ["b", "Alpha Test"]]))).toBeNull();
  });
  it("an account carrying different author names cannot establish unique contributor identity", () => {
    const rows = [
      { id: "1", created_at: "2026-01-01", memorial_id: "a", user_id: "account", author_name: "Alpha Person", relation_link: "Fils" },
      { id: "2", created_at: "2026-01-02", memorial_id: "a", user_id: "account", author_name: "Beta Person", relation_link: "Fils" },
    ];
    expect(tributeLinks(rows, ["a"])[0]?.identity).toBe("ambiguous");
  });
});