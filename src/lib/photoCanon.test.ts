import { describe, expect, it } from "vitest";
import { canonAdjustment, measureLuminance, PHOTO_CANON } from "./photoCanon";

describe("canon photo défunts", () => {
  it("laisse une photo déjà au canon inchangée", () => {
    expect(canonAdjustment(82, 48)).toEqual({ brightness: 1, contrast: 1 });
  });
  it("éclaircit une photo sombre, borné à 1.4", () => {
    expect(canonAdjustment(41, 48).brightness).toBe(1.4);
  });
  it("assombrit une photo surexposée, borné à 0.7", () => {
    expect(canonAdjustment(200, 48).brightness).toBe(0.7);
  });
  it("mesure un gris uniforme", () => {
    const px = new Uint8ClampedArray([100, 100, 100, 255, 100, 100, 100, 255]);
    expect(measureLuminance(px).mean).toBeCloseTo(100);
    expect(PHOTO_CANON.ratio).toBe(0.75);
  });
});
