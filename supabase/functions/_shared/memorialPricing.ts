// G1-FIX7 — server-side memorial pricing category (single authority).
// "future" (Nouveau décès) if funeral_date > now OR death_date >= now - 6 months; else "past".
// Invalid / contradictory dates → error (never a free fallback).

export type MemorialCategory = "future" | "past";

function parseIsoDay(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
  return d;
}

export function classifyMemorial(
  deathDate: string | null | undefined,
  funeralDate: string | null | undefined,
  now: Date = new Date(),
): { ok: true; category: MemorialCategory } | { ok: false; error: string } {
  if (!deathDate) return { ok: false, error: "Date de décès manquante" };
  const death = parseIsoDay(deathDate.slice(0, 10));
  if (!death) return { ok: false, error: "Date de décès invalide" };

  let funeral: Date | null = null;
  if (funeralDate) {
    funeral = new Date(funeralDate);
    if (isNaN(funeral.getTime())) return { ok: false, error: "Date des obsèques invalide" };
    const funeralDay = Date.UTC(funeral.getUTCFullYear(), funeral.getUTCMonth(), funeral.getUTCDate());
    if (funeralDay < death.getTime()) {
      return { ok: false, error: "La date des obsèques ne peut précéder la date de décès" };
    }
  }

  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);

  const isFuture = (funeral !== null && funeral.getTime() > now.getTime()) || death.getTime() >= sixMonthsAgo.getTime();
  return { ok: true, category: isFuture ? "future" : "past" };
}

// deno-lint-ignore no-explicit-any
export async function readMemorialPrice(admin: any, category: MemorialCategory): Promise<number | null> {
  const key = category === "future" ? "memorial_price_future" : "memorial_price_past";
  const { data } = await admin.from("system_settings").select("value").eq("key", key).maybeSingle();
  const amount = data?.value?.amount;
  return typeof amount === "number" && Number.isInteger(amount) && amount >= 0 ? amount : null;
}
