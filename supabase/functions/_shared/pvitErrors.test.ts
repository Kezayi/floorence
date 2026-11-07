import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { PVIT_ERRORS, pvitIssue } from "./pvitErrors.ts";

Deno.test("all published PVit numeric codes and observed 3024 are translated", () => {
  const codes = [500, ...Array.from({length: 13}, (_, i) => 1000 + i), 2000, 2001, ...Array.from({length: 24}, (_, i) => 3000 + i), 3024, 3100, ...Array.from({length: 10}, (_, i) => 4000 + i), 5000,5001,5002,5003,...Array.from({length: 15}, (_, i) => 5400 + i),5417,6000,7000,8000,9000,9001,9002,10000,10001,10008];
  for (const code of codes) assertEquals(pvitIssue({code}).message, PVIT_ERRORS[code]);
  assertEquals(Object.keys(PVIT_ERRORS).length, codes.length);
});
Deno.test("2000 describes merchant balance, not a customer PIN or customer funds", () => {
  assertEquals(pvitIssue('{"status":"FAILED","code":2000}').code, "2000");
  assertEquals(pvitIssue({code: 2000}).message.includes("Ce n’est pas le solde de votre compte personnel"), true);
});
Deno.test("unknown codes never repeat raw provider detail", () => {
  const result = pvitIssue({code: 123456, message: "PRIVATE_RAW", secret: "PRIVATE_RAW"});
  assertEquals(result.code, "123456");
  assertEquals(result.message.includes("PRIVATE_RAW"), false);
});
Deno.test("success code is not interpreted as an error code", () => {
  assertEquals(pvitIssue({code: 200, status: "FAILED"}).code, "FAILED");
});