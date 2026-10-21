// GEO-01 — Les trois terres du défunt. ISO 3166-1 alpha-2, names via Intl (no external API).
const ISO_CODES = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");

export type BurialStatus = "planned" | "done" | "unknown";
export const BURIAL_STATUS_LABELS: Record<BurialStatus, string> = {
  planned: "Inhumation prévue",
  done: "Inhumation réalisée",
  unknown: "Information non déterminée",
};

let displayNames: Intl.DisplayNames | null = null;
try { displayNames = new Intl.DisplayNames(["fr"], { type: "region" }); } catch { displayNames = null; }

export const isIsoCountry = (code: unknown): code is string =>
  typeof code === "string" && ISO_CODES.includes(code);

export const countryName = (code: string): string => {
  if (!isIsoCountry(code)) return code;
  return displayNames?.of(code) ?? code;
};

export const COUNTRY_OPTIONS = ISO_CODES
  .map((code) => ({ code, name: countryName(code) }))
  .sort((a, b) => a.name.localeCompare(b.name, "fr"));

const LOCALITY_MAX = 120;
/** Free-text locality: trimmed, control chars and markup brackets removed, capped. Null when empty. */
export const sanitizeLocality = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u001F\u007F<>]/g, "").replace(/\s+/g, " ").trim().slice(0, LOCALITY_MAX);
  return s.length ? s : null;
};

export interface GeoLands {
  origin_country: string | null;
  origin_locality: string | null;
  residence_country: string | null;
  residence_locality: string | null;
  burial_country: string | null;
  burial_locality: string | null;
  burial_status: BurialStatus | null;
}

export const EMPTY_GEO: GeoLands = {
  origin_country: null, origin_locality: null,
  residence_country: null, residence_locality: null,
  burial_country: null, burial_locality: null, burial_status: null,
};

/** Normalises any input into the stored shape; never infers a value. */
export const normalizeGeo = (g: Partial<Record<keyof GeoLands, unknown>> | null | undefined): GeoLands => ({
  origin_country: isIsoCountry(g?.origin_country) ? g!.origin_country as string : null,
  origin_locality: sanitizeLocality(g?.origin_locality),
  residence_country: isIsoCountry(g?.residence_country) ? g!.residence_country as string : null,
  residence_locality: sanitizeLocality(g?.residence_locality),
  burial_country: isIsoCountry(g?.burial_country) ? g!.burial_country as string : null,
  burial_locality: sanitizeLocality(g?.burial_locality),
  burial_status: (["planned", "done", "unknown"] as const).includes(g?.burial_status as BurialStatus)
    ? g!.burial_status as BurialStatus : null,
});

export const hasAnyGeo = (g: GeoLands) =>
  !!(g.origin_country || g.origin_locality || g.residence_country || g.residence_locality ||
     g.burial_country || g.burial_locality);
