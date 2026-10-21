import { describe, it, expect } from "vitest";
import { isObituaryPromoActive } from "./obituaryPromo";
const p = { active: true, starts_at: "2026-10-22T00:00:00Z", ends_at: "2026-11-22T00:00:00Z", reason: "campagne_inaugurale", scope: "worldwide" as const };
describe("obituary promo display", () => {
  it("inactive by default", () => expect(isObituaryPromoActive({ ...p, active: false }, new Date("2026-10-25"))).toBe(false));
  it("active in window", () => expect(isObituaryPromoActive(p, new Date("2026-10-25"))).toBe(true));
  it("expired", () => expect(isObituaryPromoActive(p, new Date("2026-11-23"))).toBe(false));
});
