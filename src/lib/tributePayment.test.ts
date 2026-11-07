import { beforeEach, expect, it, vi } from "vitest";
import { checkTributePayment } from "./tributePayment";
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