import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { classifyMemorial } from "./memorialPricing.ts";

const NOW = new Date("2026-10-15T12:00:00Z");
const cat = (d: string | null, f?: string | null) => {
  const r = classifyMemorial(d, f, NOW);
  return r.ok ? r.category : "error";
};

Deno.test("obsèques futures → future", () => assertEquals(cat("2026-10-10", "2026-10-20T10:00:00Z"), "future"));
Deno.test("décès < 6 mois, obsèques passées → future", () => assertEquals(cat("2026-06-01", "2026-06-10"), "future"));
Deno.test("décès > 6 mois, obsèques passées → past", () => assertEquals(cat("2020-01-01", "2020-01-10"), "past"));
Deno.test("décès ancien + obsèques futures → future", () => assertEquals(cat("2025-01-01", "2026-11-01T10:00:00Z"), "future"));
Deno.test("décès ancien sans obsèques → past", () => assertEquals(cat("2019-05-05", null), "past"));
Deno.test("décès absent → error", () => assertEquals(cat(null, null), "error"));
Deno.test("date impossible → error", () => assertEquals(cat("2024-02-31", null), "error"));
Deno.test("obsèques invalides → error", () => assertEquals(cat("2020-01-01", "n'importe"), "error"));
Deno.test("obsèques avant décès → error", () => assertEquals(cat("2020-01-10", "2020-01-01"), "error"));
