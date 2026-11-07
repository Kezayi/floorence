import { describe, expect, it } from "vitest";
import { paymentPhone } from "./paymentPhone";

describe("explicit international payment phone", () => {
  it("rejects local 06/07 numbers instead of adding +241", () => {
    expect(paymentPhone("066123456")).toBeNull();
    expect(paymentPhone("077123456")).toBeNull();
  });
  it("preserves the user-entered Airtel and Moov international numbers", () => {
    expect(paymentPhone("+24177123456")).toBe("+24177123456");
    expect(paymentPhone("+24166123456")).toBe("+24166123456");
    expect(paymentPhone("+241 77 12 34 56")).toBe("+24177123456");
  });
  it("requires the explicit +241 prefix and correct mobile length", () => {
    for (const phone of ["0024177123456", "24177123456", "+241077123456", "+2417712345", "+33123456789", ""]) {
      expect(paymentPhone(phone)).toBeNull();
    }
  });
});