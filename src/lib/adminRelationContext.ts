/** Server context metadata is a set of candidates, NOT canonical citations by the AI. */
export interface AdminMemorialContext {
  id: string;
  name: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readAdminMemorialContext(value: unknown): AdminMemorialContext[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([id, entry]) => {
    if (!UUID.test(id) || !entry || typeof entry !== "object") return [];
    const name = "name" in entry ? entry.name : null;
    return typeof name === "string" && name.trim() ? [{ id, name: name.trim() }] : [];
  }).slice(0, 200);
}