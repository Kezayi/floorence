import { describe, it, expect } from "vitest";
import { paymentOperatorLabel } from "./paymentPhone";
describe("paymentOperatorLabel", () => {
  it("07 = Airtel Money", () => expect(paymentOperatorLabel("074 69 80 31")).toBe("Airtel Money"));
  it("06 = Moov Money, +241 accepté", () => expect(paymentOperatorLabel("+241 62 12 34 56")).toBe("Moov Money"));
  it("numéro invalide = aucun opérateur", () => expect(paymentOperatorLabel("12345")).toBeNull());
});
