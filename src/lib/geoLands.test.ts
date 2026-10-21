import { describe, it, expect } from "vitest";
import { normalizeGeo, sanitizeLocality, hasAnyGeo, countryName, EMPTY_GEO } from "./geoLands";

describe("GEO-01 trois terres", () => {
  it("accepts only ISO alpha-2 codes, never infers", () => {
    const g = normalizeGeo({ origin_country: "CM", burial_country: "GA", residence_country: "gabon" });
    expect(g.origin_country).toBe("CM");
    expect(g.burial_country).toBe("GA");
    expect(g.residence_country).toBeNull();
  });
  it("no preselected country; empty memorial stays empty", () => {
    expect(EMPTY_GEO.origin_country).toBeNull();
    expect(hasAnyGeo(normalizeGeo({}))).toBe(false);
  });
  it("burial status restricted to planned/done/unknown", () => {
    expect(normalizeGeo({ burial_status: "planned" }).burial_status).toBe("planned");
    expect(normalizeGeo({ burial_status: "confirmed" }).burial_status).toBeNull();
  });
  it("locality is trimmed, stripped of markup and capped at 120", () => {
    expect(sanitizeLocality("  <b>Ebolowa</b> ")).toBe("bEbolowa/b");
    expect(sanitizeLocality("   ")).toBeNull();
    expect(sanitizeLocality("x".repeat(200))!.length).toBe(120);
  });
  it("French country names", () => {
    expect(countryName("CM")).toBe("Cameroun");
  });
});
