// BUSINESS-RULES-02 — server-side memorial pricing category (single authority).
// "future" (Récent) iff BOTH: funeral day (Africa/Libreville) >= today AND death within 30 days (inclusive).
// Otherwise "past". Invalid / contradictory dates → error (never a free fallback).

export type MemorialCategory = "future" | "past";

const TZ = "Africa/Libreville";
const DAY_MS = 86_400_000;
export const RECENT_DEATH_MAX_DAYS = 30;

function parseIsoDay(v: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
  return d.getTime();
}

function librevilleDay(d: Date): number {
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return parseIsoDay(s)!;
}

export function classifyMemorial(
  deathDate: string | null | undefined,
  funeralDate: string | null | undefined,
  now: Date = new Date(),
): { ok: true; category: MemorialCategory } | { ok: false; error: string } {
  if (!deathDate) return { ok: false, error: "Date de décès manquante" };
  const death = parseIsoDay(deathDate.slice(0, 10));
  if (death === null) return { ok: false, error: "Date de décès invalide" };

  let funeralDay: number | null = null;
  if (funeralDate) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(funeralDate)) {
      funeralDay = parseIsoDay(funeralDate);
      if (funeralDay === null) return { ok: false, error: "Date des obsèques invalide" };
    } else {
      const f = new Date(funeralDate);
      if (isNaN(f.getTime())) return { ok: false, error: "Date des obsèques invalide" };
      funeralDay = librevilleDay(f);
    }
    if (funeralDay < death) return { ok: false, error: "La date des obsèques ne peut précéder la date de décès" };
  }

  const today = librevilleDay(now);
  const daysSinceDeath = Math.round((today - death) / DAY_MS);
  const funeralPending = funeralDay !== null && funeralDay >= today;
  const recentDeath = daysSinceDeath >= 0 && daysSinceDeath <= RECENT_DEATH_MAX_DAYS;
  return { ok: true, category: funeralPending && recentDeath ? "future" : "past" };
}

// deno-lint-ignore no-explicit-any
export async function readMemorialPrice(admin: any, category: MemorialCategory): Promise<number | null> {
  const key = category === "future" ? "memorial_price_future" : "memorial_price_past";
  const { data } = await admin.from("system_settings").select("value").eq("key", key).maybeSingle();
  const amount = data?.value?.amount;
  return typeof amount === "number" && Number.isInteger(amount) && amount >= 0 ? amount : null;
}
