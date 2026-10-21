// Display-only mirror of supabase/functions/_shared/memorialPricing.ts (server is the authority).
// Récent iff funeral day (Africa/Libreville) >= today AND death within 30 days (inclusive).
export type MemorialCategory = "future" | "past";

const DAY_MS = 86_400_000;

function isoDay(v: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
  return d.getTime();
}

function librevilleDay(d: Date): number {
  return isoDay(new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Libreville", year: "numeric", month: "2-digit", day: "2-digit" }).format(d))!;
}

export function classifyMemorialForDisplay(deathDate: string, funeralDate: string, now = new Date()): MemorialCategory | null {
  const death = isoDay(deathDate);
  if (death === null) return null;
  let funeral: number | null = null;
  if (funeralDate) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(funeralDate)) funeral = isoDay(funeralDate);
    else {
      const f = new Date(funeralDate);
      funeral = isNaN(f.getTime()) ? null : librevilleDay(f);
    }
    if (funeral === null || funeral < death) return null;
  }
  const today = librevilleDay(now);
  const days = Math.round((today - death) / DAY_MS);
  return funeral !== null && funeral >= today && days >= 0 && days <= 30 ? "future" : "past";
}
