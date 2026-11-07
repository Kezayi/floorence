import { describe, expect, it } from "vitest";
import { paymentPhone } from "./paymentPhone";

describe("payment phone sent to PVit in national 9-digit form", () => {
  it("accepts local, short and +241 forms and returns 07…/06…", () => {
    for (const p of ["074698031", "74698031", "+24174698031", "+241 74 69 80 31", "0024174698031"]) {
      expect(paymentPhone(p)).toBe("074698031");
    }
    expect(paymentPhone("+24166123456")).toBe("066123456");
  });
  it("never produces a +241 number (PVit error 3024)", () => {
    expect(paymentPhone("+24177123456")?.startsWith("+")).toBe(false);
  });
  it("rejects non Airtel/Moov or malformed numbers", () => {
    for (const p of ["011234567", "+33123456789", "0741234567", ""]) expect(paymentPhone(p)).toBeNull();
  });
});
