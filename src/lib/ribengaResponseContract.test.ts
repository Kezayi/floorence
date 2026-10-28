import { describe, expect, it } from "vitest";
import { readRelationResponse } from "../../supabase/functions/social-search/responseContract";
import { readRelationSourceIds } from "./adminRelationContext";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const HIDDEN = "00000000-0000-4000-8000-00000000000c";
const sources = new Map([ ["relation:0", [A, B]], ["tribute:1", [A]], ["hidden", [HIDDEN]] ]);
const allowed = new Set([A, B]);
const read = (answer: string, source_refs: unknown) => readRelationResponse(JSON.stringify({ answer, source_refs }), sources, allowed);
describe("Server source contract, no provider or database calls", () => {
  it("maps two canonical endpoints from the actual relation source without prose detection", () => {
    expect(read("Réponse sans nom ni UUID.", ["relation:0"])?.memorialIds).toEqual([A, B]);
  });
  it("one tribute source identifies only its own memorial", () => {
    expect(read("Réponse", ["tribute:1"])?.memorialIds).toEqual([A]);
  });
  it("names and UUID tokens in answer cannot grant eligibility", () => {
    expect(read(`Homonyme [[mem:${A}]] [[mem:${B}]]`, [])?.memorialIds).toEqual([]);
  });
  it("unknown references fail closed while preserving answer", () => {
    expect(read("Réponse", ["relation:0", "invented"])).toEqual({ answer: "Réponse", memorialIds: [], validSources: false });
  });
  it("invisible sources never yield endpoints", () => {
    expect(read("Réponse", ["hidden"])?.memorialIds).toEqual([]);
  });
  it("malformed structured output is not displayed as a fake answer", () => {
    expect(readRelationResponse("unstructured prose", sources, allowed)).toBeNull();
  });
  it("client rejects malformed source IDs and intersects metadata", () => {
    const candidates = [{ id: A, name: "Homonyme" }, { id: B, name: "Homonyme" }];
    expect(readRelationSourceIds([A, B, HIDDEN], candidates)).toEqual([A, B]);
    expect(readRelationSourceIds(["Homonyme"], candidates)).toEqual([]);
  });
});