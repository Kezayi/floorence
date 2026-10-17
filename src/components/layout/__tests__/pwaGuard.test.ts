import { describe, it, expect } from "vitest";
import { isPwaSimulationAllowed } from "../Header";

describe("PWA simulation guard", () => {
  it("refuses simulation on production domains", () => {
    for (const h of ["www.floorence.org", "floorence.org", "floorence.lovable.app"]) {
      expect(isPwaSimulationAllowed(h, false)).toBe(false);
    }
  });
  it("allows simulation in dev, localhost and preview", () => {
    expect(isPwaSimulationAllowed("www.floorence.org", true)).toBe(true);
    expect(isPwaSimulationAllowed("localhost", false)).toBe(true);
    expect(isPwaSimulationAllowed("id-preview--abc.lovable.app", false)).toBe(true);
  });
});
