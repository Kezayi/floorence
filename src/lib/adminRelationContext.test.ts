import { describe, expect, it, vi, beforeEach } from "vitest";
import { readAdminMemorialContext } from "./adminRelationContext";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const C = "00000000-0000-4000-8000-00000000000c";
const R = "00000000-0000-4000-8000-000000000001";
const api = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: api }));
import { fetchAdminContextRelationGraph } from "./resolvedGraphs";

describe("Canonical admin context", () => {
  it("keeps homonyms separate using server UUID keys", () => {
    expect(readAdminMemorialContext({ [A]: { name: "Même nom" }, [B]: { name: "Même nom" } }).map((m) => m.id)).toEqual([A, B]);
  });
  it("rejects prose, missing IDs and invented non-UUID keys", () => {
    expect(readAdminMemorialContext({ "Nom": { name: "Nom" }, [A]: { photo: "x" } })).toEqual([]);
    expect(readAdminMemorialContext("Nom est parent de Nom")).toEqual([]);
  });
});

describe("Admin graph visibility", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("makes no lookup for an ID outside the authorized context", async () => {
    expect(await fetchAdminContextRelationGraph(A, C, [A, B])).toEqual({ edges: [], memorials: [] });
    expect(api.rpc).not.toHaveBeenCalled();
  });
  it("filters public endpoints and recovers labels by relation ID, not aggregate index", async () => {
    api.rpc.mockResolvedValue({ data: [{ status: "accepted", is_conflict: false, endpoint_a: A, endpoint_b: B,
      relation_ids: [R], relation_labels: ["Wrong positional label"] }], error: null });
    const chains: Array<Record<string, ReturnType<typeof vi.fn>>> = [];
    api.from.mockImplementation((table: string) => {
      const chain: Record<string, ReturnType<typeof vi.fn>> = {};
      for (const method of ["select", "in", "eq", "is"]) chain[method] = vi.fn(() => chain);
      chain.then = vi.fn((resolve) => resolve({ data: table === "memorials" ? [{ id: A }, { id: B }] : [{ id: R, relation_type: "Frère" }], error: null }));
      chains.push(chain);
      return chain;
    });
    const graph = await fetchAdminContextRelationGraph(A, B, [A, B]);
    expect(graph.edges).toEqual([{ aId: A, bId: B, relationId: R, label: "Frère" }]);
    expect(chains[0].eq).toHaveBeenCalledWith("is_published", true);
    expect(chains[0].eq).toHaveBeenCalledWith("is_active", true);
    expect(chains[0].is).toHaveBeenCalledWith("deleted_at", null);
  });
  it("fails closed when a memorial lookup fails", async () => {
    api.rpc.mockResolvedValue({ data: [{ status: "accepted", is_conflict: false, endpoint_a: A, endpoint_b: B, relation_ids: [R] }], error: null });
    const chain = { select: vi.fn(), in: vi.fn(), eq: vi.fn(), is: vi.fn(), then: vi.fn() };
    for (const method of ["select", "in", "eq", "is"] as const) chain[method].mockReturnValue(chain);
    chain.then.mockImplementation((resolve) => resolve({ data: null, error: new Error("permission denied") }));
    api.from.mockReturnValue(chain);
    await expect(fetchAdminContextRelationGraph(A, B, [A, B])).rejects.toThrow("permission denied");
  });
});