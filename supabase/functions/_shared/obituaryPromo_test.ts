import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { isPromoActive, validatePromo } from "./obituaryPromo.ts";

const base = { active: true, starts_at: "2026-10-22T00:00:00Z", ends_at: "2026-11-22T00:00:00Z", reason: "campagne_inaugurale", scope: "worldwide" };

Deno.test("inactive campaign keeps normal price", () => {
  assertEquals(isPromoActive({ ...base, active: false }, new Date("2026-10-25T00:00:00Z")), false);
});
Deno.test("active campaign within window", () => {
  assertEquals(isPromoActive(base, new Date("2026-10-25T00:00:00Z")), true);
});
Deno.test("expired campaign returns to normal", () => {
  assertEquals(isPromoActive(base, new Date("2026-11-22T00:00:01Z")), false);
});
Deno.test("not yet started", () => {
  assertEquals(isPromoActive(base, new Date("2026-10-21T23:59:59Z")), false);
});
Deno.test("missing setting is inactive", () => {
  assertEquals(isPromoActive(null), false);
});
Deno.test("invalid reason rejected", () => {
  assertEquals(validatePromo({ ...base, reason: "x" }).ok, false);
});
Deno.test("end before start rejected", () => {
  assertEquals(validatePromo({ ...base, ends_at: "2026-10-01T00:00:00Z" }).ok, false);
});
