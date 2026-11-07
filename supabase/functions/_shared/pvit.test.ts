import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { normalizeMsisdn, enteredPaymentMsisdn, detectOperator, mapPvitStatus, resolvePvitConfig, initiatePayment, pvitAcceptanceEvidence } from "./pvit.ts";

Deno.test("REST acceptance never proves an operator PIN prompt was sent or received", () => {
  assertEquals(pvitAcceptanceEvidence(), {
    payment_request_accepted: true, pin_prompt_received: null, ussd_push_sent: null,
  });
});

Deno.test("Airtel numbers (07…) route to AIRTEL_MONEY", () => {
  assertEquals(detectOperator("074 00 00 00"), "AIRTEL_MONEY");
  assertEquals(detectOperator("+241 77123456"), "AIRTEL_MONEY");
});
Deno.test("Moov numbers (06…) route to MOOV_MONEY", () => {
  assertEquals(detectOperator("066123456"), "MOOV_MONEY");
  assertEquals(detectOperator("0024162123456"), "MOOV_MONEY");
});
Deno.test("invalid numbers are refused", () => {
  assertEquals(normalizeMsisdn("12345"), null);
  assertEquals(normalizeMsisdn("+33123456789"), null);
  assertEquals(normalizeMsisdn("0741234567"), null);
  assertEquals(detectOperator("011234567"), null);
});
Deno.test("local normalization remains limited to operator detection", () => {
  for (const input of ["074123456", "+24174123456", "0024174123456", "24174123456", "07 41 23 456", "74123456"]) {
    assertEquals(normalizeMsisdn(input), "074123456");
  }
});
Deno.test("payment number is sent in national 9-digit form (PVit rejects +241)", () => {
  for (const input of ["074698031", "74698031", "+24174698031", "0024174698031", "+241 74 69 80 31"]) {
    assertEquals(enteredPaymentMsisdn(input), "074698031");
  }
  assertEquals(enteredPaymentMsisdn("+24166123456"), "066123456");
  assertEquals(enteredPaymentMsisdn("011234567"), null);
});
Deno.test("PVit reçoit le format national et le bon compte pour chaque opérateur sans débit réel", async () => {
  const originalFetch = globalThis.fetch;
  const cfg = resolvePvitConfig((k) => ({
    PVIT_ACCOUNT_AIRTEL: "TEST_AIRTEL_PHONE", PVIT_ACCOUNT_MOOV: "TEST_MOOV_PHONE",
    PVIT_SECRET_PASSWORD: "test-only", PVIT_URL_CODE_SECRET: "test-secret",
    PVIT_URL_CODE_REST: "test-rest", PVIT_CALLBACK_URL_CODE: "test-callback",
  } as Record<string, string>)[k]);
  const bodies: Record<string, unknown>[] = [];
  globalThis.fetch = async (_input, init) => {
    if (init?.body instanceof URLSearchParams) {
      return Response.json({ secret: "test-only", expires_in: 3600 });
    }
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return Response.json({ status: "PENDING", reference_id: "TEST_TX" });
  };
  try {
    for (const [phone, operator] of [["+24174123456", "AIRTEL_MONEY"], ["+24165108829", "MOOV_MONEY"]] as const) {
      const result = await initiatePayment(cfg, { amount: 1400, reference: "TEST", msisdn: phone, operator, product: "Cierge1 Fleur1" });
      assertEquals(result.accepted, true);
    }
    assertEquals(bodies.map((body) => [body.customer_account_number, body.merchant_operation_account_code, body.operator_code]), [
      ["074123456", "TEST_AIRTEL_PHONE", "AIRTEL_MONEY"], ["065108829", "TEST_MOOV_PHONE", "MOOV_MONEY"],
    ]);
    let rejected = false;
    try {
      await initiatePayment(cfg, { amount: 1400, reference: "TEST", msisdn: "066123456", operator: "AIRTEL_MONEY", product: "Cierge1 Fleur1" });
    } catch { rejected = true; }
    assertEquals(rejected, true);
    assertEquals(bodies.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
Deno.test("only SUCCESS confirms a payment", () => {
  assertEquals(mapPvitStatus("SUCCESS"), "success");
  assertEquals(mapPvitStatus("PENDING"), "pending");
  assertEquals(mapPvitStatus("FAILED"), "failed");
  assertEquals(mapPvitStatus("AMBIGUOUS"), "pending");
  assertEquals(mapPvitStatus("UNKNOWN"), "pending");
});
Deno.test("each operator uses its own operation account", () => {
  const c = resolvePvitConfig((k) => ({ PVIT_ACCOUNT_AIRTEL: "ACC_A", PVIT_ACCOUNT_MOOV: "ACC_M" } as Record<string, string>)[k]);
  assertEquals(c.accounts.AIRTEL_MONEY, "ACC_A");
  assertEquals(c.accounts.MOOV_MONEY, "ACC_M");
  assertEquals(c.ok, false);
});
Deno.test("product label never exceeds PVit's 15-char limit", async () => {
  const { pvitProductLabel } = await import("./pvit.ts");
  assertEquals(pvitProductLabel("mixte", 2, 2), "Cierge2 Fleur2");
  assertEquals(pvitProductLabel("cierge", 3), "Cierge x3");
  for (const l of [pvitProductLabel("mixte", 999, 999), pvitProductLabel("fleur", 0, 123456789), pvitProductLabel("memorial")]) {
    assertEquals(l.length <= 15, true);
  }
});
