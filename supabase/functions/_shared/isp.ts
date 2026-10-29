/**
 * Indice de Sympathie Potentiel (ISP) — RIBENGA internal only.
 * Specification: docs/INDICE_DE_SYMPATHIE_POTENTIEL_ISP.md (kept in sync by src/lib/ispDocSync.test.ts).
 * Propriété exclusive revendiquée de Michel NGWA AYI, promoteur de Floorence.
 */

import { matchesCivility, type IspIdentityFilter } from "./civility.ts";

/** Single ordered circle referential (closest first). Rank C = position + 1; no coefficient is stored. */
export const ISP_CIRCLES: ReadonlyArray<{ key: string; label: string; aliases: readonly string[] }> = [
  { key: "famille_directe", label: "Famille proche", aliases: ["famille_directe", "Famille directe", "Famille proche"] },
  { key: "famille_elargie", label: "Famille élargie", aliases: ["famille_elargie", "Famille élargie"] },
  { key: "allies", label: "Alliés", aliases: ["allies", "Alliés"] },
  { key: "socio_coeur", label: "Socio-cœur", aliases: ["socio_coeur", "Socio-cœur", "Socio cœur (Amis)"] },
  { key: "autres", label: "Autres", aliases: ["autres", "Autres"] },
];

const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("fr").replace(/[\s_\-()]+/g, "").trim();

/** Rank C of a stored relation_category, or null when unknown (=> non calculable). */
export function circleRank(category: string | null | undefined, circles = ISP_CIRCLES): number | null {
  if (!category) return null;
  const f = fold(category);
  const i = circles.findIndex((c) => c.aliases.some((a) => fold(a) === f));
  return i < 0 ? null : i + 1;
}

export const exceptionality = (c: number) => (c * (c - 1)) / 2;

/** ISP = G × C × (1 + E) / T ; null when not computable. */
export function ispValue(g: number, c: number | null, t: number): number | null {
  if (c === null || !Number.isInteger(c) || c < 1) return null;
  if (!Number.isFinite(g) || !Number.isFinite(t) || g < 0 || t <= 0) return null;
  return (g * c * (1 + exceptionality(c))) / t;
}

const ISP_TRIGGER = /\b(sympath\w*|influen\w*|rayonn\w*|mobilis\w*|ascendant|isp)\b/i;
/** Only questions about potential sympathy / influence / radiance / remarkable mobilization. */
export const isIspQuestion = (q: string) => ISP_TRIGGER.test(q.normalize("NFC"));

export interface IspPost { memorial_id: string; user_id: string | null; author_name: string | null; relation_category: string | null; candle_count: number | null; flower_count: number | null }
export interface IspFact { memorial_id: string; author_name: string; circle: string | null; C: number | null; E: number | null; G: number | null; T: number | null; isp: number | null; reason?: string; identity_eligible?: boolean }

const normName = (s: string | null) => (s ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("fr").replace(/\s+/g, " ").trim();
const gestures = (p: IspPost) => {
  const a = p.candle_count, b = p.flower_count;
  if (a === null || b === null || !Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return null;
  return a + b;
};

/** Deterministic per-(account, memorial) facts from visible posts. user_id never appears in output. */
export function computeIspFacts(posts: IspPost[], opts: { truncated?: boolean; identityFilter?: IspIdentityFilter; civilities?: ReadonlyMap<string, unknown> } = {}): IspFact[] {
  const byMem = new Map<string, IspPost[]>();
  for (const p of posts) {
    const group = byMem.get(p.memorial_id) ?? [];
    group.push(p);
    byMem.set(p.memorial_id, group);
  }
  const out: IspFact[] = [];
  for (const [memorial_id, list] of byMem) {
    let T: number | null = 0;
    for (const p of list) { const g = gestures(p); T = g === null || T === null ? null : T + g; }
    const accountsByName = new Map<string, Set<string | null>>();
    for (const p of list) {
      const n = normName(p.author_name);
      const accounts = accountsByName.get(n) ?? new Set<string | null>();
      accounts.add(p.user_id);
      accountsByName.set(n, accounts);
    }
    const byUser = new Map<string, IspPost[]>();
    for (const p of list) if (p.user_id) {
      const group = byUser.get(p.user_id) ?? [];
      group.push(p);
      byUser.set(p.user_id, group);
    }
    for (const own of byUser.values()) {
      const author_name = own[0]?.author_name ?? "?";
      const base = { memorial_id, author_name, circle: null, C: null, E: null, G: null, T, isp: null,
        ...(opts.identityFilter ? { identity_eligible: matchesCivility(opts.civilities?.get(own[0]?.user_id ?? ""), opts.identityFilter) } : {}) } as IspFact;
      if (opts.truncated) { out.push({ ...base, T: null, reason: "corpus tronqué" }); continue; }
      const names = new Set(own.map((p) => normName(p.author_name)));
      if (names.has("") || names.size !== 1 || [...names].some((name) => (accountsByName.get(name)?.size ?? 0) > 1)) {
        out.push({ ...base, reason: "identité ambiguë (nom absent, variable, homonyme ou hommage anonyme)" }); continue;
      }
      const ranks = new Set(own.map((p) => circleRank(p.relation_category)));
      if (ranks.size !== 1 || ranks.has(null)) { out.push({ ...base, reason: ranks.has(null) ? "cercle inconnu" : "cercles multiples" }); continue; }
      const C = [...ranks][0];
      if (C === null || C === undefined) { out.push({ ...base, reason: "cercle inconnu" }); continue; }
      let G: number | null = 0;
      for (const p of own) { const g = gestures(p); G = g === null || G === null ? null : G + g; }
      const circle = ISP_CIRCLES[C - 1]?.label ?? null;
      if (G === null || T === null) { out.push({ ...base, circle, C, E: exceptionality(C), reason: "gestes non fiables" }); continue; }
      const isp = ispValue(G, C, T);
      out.push({ ...base, circle, C, E: exceptionality(C), G, T, isp, reason: isp === null ? "T = 0" : undefined });
    }
  }
  return out;
}

/** Exact display: 0 stays "0", tiny positive values never collapse to "0.0000". */
export function formatIsp(v: number): string {
  if (v === 0) return "0";
  const fixed = v.toFixed(4);
  return Number(fixed) === 0 ? v.toPrecision(4) : fixed;
}

const normText = (s: string) => normName(s).replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();

/** Memorial concerned by the question: named uniquely, or the only one with facts; otherwise null (ambiguous). */
export function targetIspMemorial(question: string, facts: IspFact[], names: Map<string, string>): string | null {
  const ids = [...new Set(facts.map((f) => f.memorial_id))];
  if (ids.length === 1) return ids[0];
  const q = ` ${normText(question)} `;
  const named = ids.filter((id) => { const n = normText(names.get(id) ?? ""); return n.length > 0 && q.includes(` ${n} `); });
  return named.length === 1 ? named[0] : null;
}

export interface IspSummary { memorial_id: string; evaluated: number; calculable: number; non_calculable: number; above_threshold: number; T: number | null; max: number | null; leaders: string[] }

/** Deterministic maximum within ONE memorial (T shared, so exact integer numerators are compared — ties are exact). */
export function summarizeIsp(facts: IspFact[], memorial_id: string): IspSummary {
  const own = facts.filter((f) => f.memorial_id === memorial_id);
  const calc = own.filter((f) => f.identity_eligible !== false && f.isp !== null && f.G !== null && f.C !== null && f.E !== null);
  let best = -1; let leaders: string[] = [];
  for (const f of calc) {
    if (f.G === null || f.C === null || f.E === null) continue;
    const num = f.G * f.C * (1 + f.E);
    if (num > best) { best = num; leaders = [f.author_name]; } else if (num === best) leaders.push(f.author_name);
  }
  const max = calc.find((f) => f.G !== null && f.C !== null && f.E !== null && f.G * f.C * (1 + f.E) === best)?.isp ?? null;
  const T = calc[0]?.T ?? null;
  return { memorial_id, evaluated: own.length, calculable: calc.length, non_calculable: own.length - calc.length, above_threshold: calc.filter((f) => f.isp !== null && f.isp > 1).length, T, max, leaders };
}

/** Semantically explicit comparison line: accounts (contributors) are never confused with tributes or gestures. */
export function ispComparisonLine(s: IspSummary, memorialLabel: string, tributes: number, redact: (n: string) => string = (n) => n): string {
  const head = `ISP_COMPARAISON | ${memorialLabel} [[mem:${s.memorial_id}]] | hommages visibles=${tributes} | contributeurs (comptes) évalués=${s.evaluated} | contributeurs ISP calculable=${s.calculable} | contributeurs ISP non calculable=${s.non_calculable}`;
  if (s.max === null) return `${head} | gestes totaux T=${s.T ?? "non fiable"} | aucun maximum établi`;
  const who = s.leaders.map(redact).join(" ; ");
  return `${head} | gestes totaux T=${s.T} | contributeurs ISP>1=${s.above_threshold} | ISP maximum=${formatIsp(s.max)}${s.max > 1 ? " (>1 : signal potentiel)" : " (seuil >1 non franchi)"} | ${s.leaders.length > 1 ? "égalité" : "plus fort ISP"} : ${who}`;
}
