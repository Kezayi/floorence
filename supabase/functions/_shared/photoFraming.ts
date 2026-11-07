/**
 * Cadrage biométrique non destructif des portraits de défunts.
 * Le fichier source n'est jamais réécrit : seul l'affichage applique
 * un agrandissement (scale) centré sur un point focal (x, y en %).
 */
export const PHOTO_FRAMING_KEY = "photo_framing";

export type FramingMode = "brut" | "biometrique";
export interface FramingAdjust {
  scale: number; x: number; y: number;
  /** Multiplicateurs manuels d'éclairage, cumulés au canon automatique (1 = neutre). */
  light?: number; contrast?: number;
}
export interface PhotoFramingSetting {
  mode: FramingMode;
  /** Réglages par URL de photo (source exacte). */
  overrides: Record<string, FramingAdjust>;
}

export const DEFAULT_FRAMING: PhotoFramingSetting = { mode: "brut", overrides: {} };
export const SCALE_MIN = 1;
export const SCALE_MAX = 2.5;
export const LIGHT_MIN = 0.6;
export const LIGHT_MAX = 1.6;
export const isAdjusted = (a: FramingAdjust) => a.scale > 1 || (a.light ?? 1) !== 1 || (a.contrast ?? 1) !== 1;

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function validateFraming(value: unknown):
  { ok: true; value: PhotoFramingSetting } | { ok: false; error: string } {
  if (!value || typeof value !== "object") return { ok: false, error: "Réglage de cadrage invalide" };
  const v = value as Record<string, unknown>;
  if (v.mode !== "brut" && v.mode !== "biometrique") return { ok: false, error: "Mode de cadrage inconnu" };
  const raw = v.overrides ?? {};
  if (typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "Réglages par photo invalides" };
  const overrides: Record<string, FramingAdjust> = {};
  for (const [url, a] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^https:\/\//.test(url) || url.length > 1000) return { ok: false, error: "Adresse de photo invalide" };
    const o = a as Record<string, unknown>;
    if (!o || !isNum(o.scale) || !isNum(o.x) || !isNum(o.y)) return { ok: false, error: "Réglage de photo incomplet" };
    if (o.scale < SCALE_MIN || o.scale > SCALE_MAX) return { ok: false, error: "Agrandissement hors limites (1 à 2,5)" };
    if (o.x < 0 || o.x > 100 || o.y < 0 || o.y > 100) return { ok: false, error: "Point focal hors limites (0 à 100 %)" };
    const light = o.light === undefined ? 1 : o.light;
    const contrast = o.contrast === undefined ? 1 : o.contrast;
    if (!isNum(light) || !isNum(contrast) || light < LIGHT_MIN || light > LIGHT_MAX || contrast < LIGHT_MIN || contrast > LIGHT_MAX)
      return { ok: false, error: "Éclairage hors limites (0,6 à 1,6)" };
    const adj: FramingAdjust = { scale: o.scale, x: o.x, y: o.y, light, contrast };
    if (isAdjusted(adj)) overrides[url] = adj;
  }
  return { ok: true, value: { mode: v.mode, overrides } };
}

/** Réglage effectif d'une photo, ou null (affichage brut). */
export function framingFor(src: string | null | undefined, s: PhotoFramingSetting | null | undefined): FramingAdjust | null {
  if (!src || !s || s.mode !== "biometrique") return null;
  const a = s.overrides[src];
  return a && isAdjusted(a) ? a : null;
}
