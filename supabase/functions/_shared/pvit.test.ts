import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { normalizeMsisdn, detectOperator, mapPvitStatus, resolvePvitConfig } from "./pvit.ts";

Deno.test("Airtel numbers (07…) route to AIRTEL_MONEY", () => {
  assertEquals(detectOperator(normalizeMsisdn("074 00 00 00")!), "AIRTEL_MONEY");
  assertEquals(detectOperator(normalizeMsisdn("+241 77123456")!), "AIRTEL_MONEY");
});
Deno.test("Moov numbers (06…) route to MOOV_MONEY", () => {
  assertEquals(detectOperator(normalizeMsisdn("066123456")!), "MOOV_MONEY");
  assertEquals(detectOperator(normalizeMsisdn("0024162123456")!), "MOOV_MONEY");
});
Deno.test("invalid numbers are refused", () => {
  assertEquals(normalizeMsisdn("12345"), null);
  assertEquals(detectOperator("011234567"), null);
});
Deno.test("only SUCCESS confirms a payment", () => {
  assertEquals(mapPvitStatus("SUCCESS"), "success");
  assertEquals(mapPvitStatus("PENDING"), "pending");
  assertEquals(mapPvitStatus("FAILED"), "failed");
});
Deno.test("each operator uses its own operation account", () => {
  const c = resolvePvitConfig((k) => ({ PVIT_ACCOUNT_AIRTEL: "ACC_A", PVIT_ACCOUNT_MOOV: "ACC_M" } as Record<string, string>)[k]);
  assertEquals(c.accounts.AIRTEL_MONEY, "ACC_A");
  assertEquals(c.accounts.MOOV_MONEY, "ACC_M");
  assertEquals(c.ok, false);
});
