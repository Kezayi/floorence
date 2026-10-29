/** FIC-01: declared profile value only, never inferred from a name or relationship. */
export const CIVILITIES = ["M.", "Mme", "Mlle"] as const;
export type Civility = typeof CIVILITIES[number];
export function isCivility(value: unknown): value is Civility {
  return typeof value === "string" && CIVILITIES.some((c) => c === value);
}
export type IspIdentityFilter = "men" | "women" | "ambiguous" | null;
export function ispIdentityFilter(question: string): IspIdentityFilter {
  const q = question.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const men = /\b(homme|hommes|monsieur|messieurs)\b/.test(q);
  const women = /\b(femme|femmes|madame|mesdames|mademoiselle|mesdemoiselles)\b/.test(q);
  return men && women ? "ambiguous" : men ? "men" : women ? "women" : null;
}
export function matchesCivility(value: unknown, filter: IspIdentityFilter): boolean {
  if (filter === null) return true;
  if (!isCivility(value) || filter === "ambiguous") return false;
  return filter === "men" ? value === "M." : value === "Mme" || value === "Mlle";
}
export function canCompleteIdentity(required: boolean, value: unknown): boolean {
  return !required || isCivility(value);
}