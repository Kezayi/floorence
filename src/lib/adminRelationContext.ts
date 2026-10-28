/** Server context metadata is a set of candidates, NOT canonical citations by the AI. */
export interface AdminMemorialContext {
  id: string;
  name: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Citation token emitted by social-search answers: [[mem:<uuid>]] copied from the server context. */
const CITATION = /\[\[mem:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]\]/gi;
export const MAX_CITED_FOR_PATHS = 4;

export function readAdminMemorialContext(value: unknown): AdminMemorialContext[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([id, entry]) => {
    if (!UUID.test(id) || !entry || typeof entry !== "object") return [];
    const name = "name" in entry ? entry.name : null;
    return typeof name === "string" && name.trim() ? [{ id, name: name.trim() }] : [];
  }).slice(0, 200);
}

/**
 * Exact UUID citations of the answer, in order of first appearance, kept ONLY when the
 * server sent that UUID in its authorized context. Names are never used.
 */
export function extractCitedMemorialIds(answer: string, authorizedIds: Iterable<string>): string[] {
  const allowed = new Set([...authorizedIds].map((id) => id.toLowerCase()));
  const out: string[] = [];
  for (const m of answer.matchAll(CITATION)) {
    const id = m[1].toLowerCase();
    if (allowed.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

/** Removes citation tokens from displayed prose (stored answer is unchanged). */
export function stripCitations(answer: string): string {
  return answer.replace(CITATION, "").replace(/\[\[mem:[^\]]*\]?\]?/g, "").replace(/[ \t]{2,}/g, " ");
}

/** Every unordered pair among the first cited memorials — no arbitrary "first two". */
export function citedPairs(ids: string[], max = MAX_CITED_FOR_PATHS): Array<[string, string]> {
  const kept = ids.slice(0, max);
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < kept.length; i++) for (let j = i + 1; j < kept.length; j++) pairs.push([kept[i], kept[j]]);
  return pairs;
}
