import { describe, it, expect } from "vitest";
import { framingFor, validateFraming } from "./photoFraming";

const URL = "https://x.supabase.co/storage/v1/object/public/memorial-photos/a.jpg";

describe("cadrage biométrique", () => {
  it("mode brut : aucun agrandissement même si un réglage existe", () => {
    expect(framingFor(URL, { mode: "brut", overrides: { [URL]: { scale: 1.85, x: 50, y: 42 } } })).toBeNull();
  });
  it("mode biométrique : applique le réglage de la photo", () => {
    expect(framingFor(URL, { mode: "biometrique", overrides: { [URL]: { scale: 1.85, x: 50, y: 42 } } }))
      .toEqual({ scale: 1.85, x: 50, y: 42 });
  });
  it("refuse un agrandissement au-delà de 2,5×", () => {
    expect(validateFraming({ mode: "biometrique", overrides: { [URL]: { scale: 3, x: 50, y: 40 } } }).ok).toBe(false);
  });
  it("refuse un mode inconnu", () => {
    expect(validateFraming({ mode: "auto", overrides: {} }).ok).toBe(false);
  });
});

import { validateFraming as vf2, framingFor as ff2 } from "./photoFraming";
describe("éclairage manuel", () => {
  it("conserve un réglage d'éclairage seul (sans agrandissement)", () => {
    const r = vf2({ mode: "biometrique", overrides: { "https://x/a.jpg": { scale: 1, x: 50, y: 40, light: 1.2, contrast: 1 } } });
    expect(r.ok && ff2("https://x/a.jpg", r.value)?.light).toBe(1.2);
  });
  it("refuse une luminosité hors 0,6–1,6", () => {
    expect(vf2({ mode: "biometrique", overrides: { "https://x/a.jpg": { scale: 1, x: 50, y: 40, light: 2 } } }).ok).toBe(false);
  });
});
