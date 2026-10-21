import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { classifyMemorial } from "./memorialPricing.ts";

// 2026-10-21 12:00 UTC = 13:00 Libreville
const NOW = new Date("2026-10-21T12:00:00Z");
const cat = (d: string | null, f?: string | null) => {
  const r = classifyMemorial(d, f, NOW);
  return r.ok ? r.category : "error";
};

Deno.test("1. décès J-10, obsèques futures → récent", () => assertEquals(cat("2026-10-11", "2026-10-26"), "future"));
Deno.test("2. décès J-30, obsèques futures → récent", () => assertEquals(cat("2026-09-21", "2026-10-23"), "future"));
Deno.test("3. décès J-31, obsèques futures → passé", () => assertEquals(cat("2026-09-20", "2026-10-23"), "past"));
Deno.test("4. décès J-5, obsèques passées → passé", () => assertEquals(cat("2026-10-16", "2026-10-20"), "past"));
Deno.test("5. décès il y a 6 mois, obsèques futures → passé", () => assertEquals(cat("2026-04-21", "2026-10-26"), "past"));
Deno.test("6a. obsèques aujourd'hui → récent", () => assertEquals(cat("2026-10-19", "2026-10-21"), "future"));
Deno.test("6b. obsèques aujourd'hui 23h30 Libreville (22h30 UTC) → récent", () =>
  assertEquals(cat("2026-10-19", "2026-10-21T22:30:00Z"), "future"));
Deno.test("6c. obsèques hier 23h30 Libreville → passé", () =>
  assertEquals(cat("2026-10-19", "2026-10-20T22:30:00+01:00"), "past"));
Deno.test("décès récent sans obsèques → passé", () => assertEquals(cat("2026-10-15", null), "past"));
Deno.test("7a. décès absent → rejet", () => assertEquals(cat(null, null), "error"));
Deno.test("7b. date impossible → rejet", () => assertEquals(cat("2024-02-31", null), "error"));
Deno.test("7c. obsèques invalides → rejet", () => assertEquals(cat("2026-10-10", "n'importe"), "error"));
Deno.test("7d. obsèques avant décès → rejet", () => assertEquals(cat("2026-10-10", "2026-10-01"), "error"));
