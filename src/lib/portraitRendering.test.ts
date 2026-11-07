import { describe, expect, it } from "vitest";
import { portraitResolution, portraitTone } from "./portraitRendering";

describe("rendu des portraits", () => {
  it("demande davantage de pixels pour un visage agrandi", () => {
    expect(portraitResolution(600, undefined, { scale: 2, x: 50, y: 40 }, true)).toEqual({ width: 1200, height: undefined, quality: 95 });
  });
  it("conserve une limite de résolution pour le réseau mobile", () => {
    expect(portraitResolution(1200, 1600, { scale: 2.5, x: 50, y: 40 }, true)).toEqual({ width: 2000, height: 2000, quality: 95 });
  });
  it("une exposition de +1 EV double le multiplicateur sans inventer de détail", () => {
    expect(portraitTone({ scale: 1, x: 50, y: 40, exposure: 1 }).exposure).toBe(2);
  });
  it("le rendu neutre ne modifie ni les ombres ni la netteté", () => {
    expect(portraitTone(null)).toEqual({ exposure: 1, exponent: 1, amplitude: 1, sharpness: 0 });
  });
});