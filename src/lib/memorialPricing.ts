// Display-only mirror of supabase/functions/_shared/memorialPricing.ts (server is the authority).
export type MemorialCategory = "future" | "past";

export function classifyMemorialForDisplay(deathDate: string, funeralDate: string, now = new Date()): MemorialCategory | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deathDate)) return null;
  const death = new Date(`${deathDate}T00:00:00Z`);
  if (isNaN(death.getTime())) return null;
  const funeral = funeralDate ? new Date(funeralDate) : null;
  if (funeral && isNaN(funeral.getTime())) return null;
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);
  return (funeral && funeral.getTime() > now.getTime()) || death.getTime() >= sixMonthsAgo.getTime() ? "future" : "past";
}
