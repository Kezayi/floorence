import { beforeEach, expect, it, vi } from "vitest";
import { checkTributePayment, checkTributePaymentDetail, paymentError } from "./tributePayment";
const mock = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mock.invoke } } }));
beforeEach(() => vi.clearAllMocks());
it.each([
  [{ success: true, status: "pending" }, "pending"],
  [{ success: false, status: "pending" }, "pending"],
  [{ success: true, status: "success" }, "success"],
  [{ success: false, status: "failed" }, "failed"],
])("only final server confirmation unlocks success: %j", async (data, expected) => {
  mock.invoke.mockResolvedValue({ data });
  expect(await checkTributePayment("FLRTEST")).toBe(expected);
  expect(mock.invoke).toHaveBeenCalledWith("ebilling", { body: { action: "check-status", reference: "FLRTEST" } });
});
it("preserves a terminal provider reason and code without converting failure to success", async () => {
  mock.invoke.mockResolvedValue({ data: { status: "failed", error_code: "2000", message: "Compte marchand insuffisant (Code 2000)" } });
  expect(await checkTributePaymentDetail("FLRMOOV")).toEqual({ status: "failed", code: "2000", message: "Compte marchand insuffisant (Code 2000)" });
});
it("translates a provider code from an HTTP error rather than showing its raw message", async () => {
  const error = { context: new Response(JSON.stringify({ status_code: 2000, message: "PRIVATE_RAW" }), { status: 402 }) };
  const result = await paymentError(error, "fallback");
  expect(result.message).not.toContain("PRIVATE_RAW");
  expect(result.message).toContain("Code 2000");
});
it("an unreachable status check cannot confirm a payment", async () => {
  mock.invoke.mockResolvedValue({ error: new Error("Failed to fetch") });
  await expect(checkTributePaymentDetail("FLRMOOV")).rejects.toThrow("ne relancez pas de débit");
});