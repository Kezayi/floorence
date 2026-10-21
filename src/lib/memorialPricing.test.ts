import { describe, it, expect } from "vitest";
import { classifyMemorialForDisplay as c } from "./memorialPricing";

const NOW = new Date("2026-10-21T12:00:00Z");
describe("classification des avis (miroir)", () => {
  it("J-30 + obsèques futures = récent", () => expect(c("2026-09-21", "2026-10-23", NOW)).toBe("future"));
  it("J-31 + obsèques futures = passé", () => expect(c("2026-09-20", "2026-10-23", NOW)).toBe("past"));
  it("J-5 + obsèques passées = passé", () => expect(c("2026-10-16", "2026-10-20", NOW)).toBe("past"));
  it("obsèques aujourd'hui = récent", () => expect(c("2026-10-19", "2026-10-21", NOW)).toBe("future"));
  it("date invalide = rejet", () => expect(c("2024-02-31", "", NOW)).toBeNull());
});
