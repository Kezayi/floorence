import { countryName, isIsoCountry } from "@/lib/geoLands";

// GEO-03 — Normalises the server aggregate; sorting: contributors desc, then French name.
export interface GeoCountryRow { code: string; name: string; contributors: number; tributes: number; share: number }
export interface TributeGeography { countries: number; contributors: number; tributes: number; rows: GeoCountryRow[] }

export function normalizeTributeGeography(raw: unknown): TributeGeography | null {
  const r = (raw ?? {}) as { contributors?: unknown; tributes?: unknown; by_country?: unknown };
  const list = Array.isArray(r.by_country) ? r.by_country : [];
  const rows = list
    .filter((x: { code?: unknown }) => isIsoCountry(x?.code))
    .map((x: { code: string; contributors?: unknown; tributes?: unknown }) => ({
      code: x.code, name: countryName(x.code),
      contributors: Number(x.contributors) || 0, tributes: Number(x.tributes) || 0, share: 0,
    }))
    .filter((x) => x.contributors > 0)
    .sort((a, b) => b.contributors - a.contributors || a.name.localeCompare(b.name, "fr"));
  if (!rows.length) return null;
  const max = rows[0].contributors;
  rows.forEach((x) => { x.share = x.contributors / max; });
  return {
    countries: rows.length,
    contributors: Number(r.contributors) || 0,
    tributes: Number(r.tributes) || 0,
    rows,
  };
}
