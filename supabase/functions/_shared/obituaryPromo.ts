// PROMO-01 — free obituary publication campaign (server authority).
// Applies ONLY to memorial publication ("future" category = avis de décès). Never to gestures.

export const PROMO_SETTING_KEY = "obituary_free_campaign";
export const PROMO_REASONS = ["campagne_inaugurale", "ouverture_bureau_local", "campagne_exceptionnelle"] as const;

export interface ObituaryPromo {
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  reason: string | null;
  scope: "worldwide";
}

export function validatePromo(v: unknown): { ok: true; value: ObituaryPromo } | { ok: false; error: string } {
  const o = v as Record<string, unknown> | null;
  if (!o || typeof o !== "object") return { ok: false, error: "Campagne invalide" };
  if (typeof o.active !== "boolean") return { ok: false, error: "État de campagne invalide" };
  if (o.scope !== "worldwide") return { ok: false, error: "Portée invalide" };
  const s = typeof o.starts_at === "string" ? Date.parse(o.starts_at) : NaN;
  const e = typeof o.ends_at === "string" ? Date.parse(o.ends_at) : NaN;
  if (o.active) {
    if (isNaN(s) || isNaN(e)) return { ok: false, error: "Dates de campagne requises" };
    if (e <= s) return { ok: false, error: "La fin doit suivre le début" };
    if (!PROMO_REASONS.includes(o.reason as typeof PROMO_REASONS[number])) return { ok: false, error: "Motif invalide" };
  }
  return {
    ok: true,
    value: {
      active: o.active,
      starts_at: isNaN(s) ? null : new Date(s).toISOString(),
      ends_at: isNaN(e) ? null : new Date(e).toISOString(),
      reason: typeof o.reason === "string" ? o.reason : null,
      scope: "worldwide",
    },
  };
}

export function isPromoActive(v: unknown, now: Date = new Date()): boolean {
  const r = validatePromo(v);
  if (!r.ok || !r.value.active) return false;
  const t = now.getTime();
  return t >= Date.parse(r.value.starts_at!) && t < Date.parse(r.value.ends_at!);
}
