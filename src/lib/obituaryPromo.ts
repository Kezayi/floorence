// PROMO-01 display mirror. The server (create-memorial) is the only authority.
import type { ObituaryPromoSetting } from "@/hooks/useSystemSettings";

export const PROMO_REASON_LABELS: Record<string, string> = {
  campagne_inaugurale: "Campagne inaugurale",
  ouverture_bureau_local: "Ouverture d'un bureau local",
  campagne_exceptionnelle: "Campagne exceptionnelle",
};

export function isObituaryPromoActive(p: ObituaryPromoSetting | null | undefined, now: Date = new Date()): boolean {
  if (!p?.active || !p.starts_at || !p.ends_at) return false;
  const s = Date.parse(p.starts_at), e = Date.parse(p.ends_at), t = now.getTime();
  return !isNaN(s) && !isNaN(e) && t >= s && t < e;
}
