/** One structured response, no second model call. Source references come from server rows. */
export const relationResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "ribenga_answer",
    schema: {
      type: "object",
      properties: {
        answer: { type: "string" },
        source_refs: { type: "array", items: { type: "string" } },
      },
      required: ["answer", "source_refs"],
      additionalProperties: false,
    },
  },
};

export function readRelationResponse(
  raw: string,
  sources: ReadonlyMap<string, readonly string[]>,
  allowedIds: ReadonlySet<string>,
): { answer: string; memorialIds: string[]; validSources: boolean } | null {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!value || typeof value !== "object" || !("answer" in value) ||
    typeof value.answer !== "string" || !value.answer.trim()) return null;
  const answer = value.answer;
  if (!("source_refs" in value) || !Array.isArray(value.source_refs) ||
    value.source_refs.length > 200 || value.source_refs.some((ref) => typeof ref !== "string" || !sources.has(ref))) {
    return { answer, memorialIds: [], validSources: false };
  }
  const memorialIds = [...new Set(value.source_refs.flatMap((ref: string) => [...(sources.get(ref) ?? [])]))]
    .filter((id) => allowedIds.has(id));
  return { answer, memorialIds, validSources: true };
}