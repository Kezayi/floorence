import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminContextRelationGraph } from "./resolvedGraphs";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const H = "00000000-0000-4000-8000-00000000000c";
const api = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: api }));
describe("RIBENGA graph public/RLS boundary, deterministic fixtures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.rpc.mockResolvedValue({ data: [
      { endpoint_a: A, endpoint_b: B, status: "accepted", is_conflict: false, relation_ids: ["r1", "r2"] },
      { endpoint_a: A, endpoint_b: H, status: "accepted", is_conflict: false, relation_ids: ["hidden"] },
      { endpoint_a: A, endpoint_b: B, status: "pending", is_conflict: false, relation_ids: ["pending"] },
      { endpoint_a: A, endpoint_b: B, status: "accepted", is_conflict: true, relation_ids: ["conflict"] },
    ], error: null });
    api.from.mockImplementation((table: string) => {
      const chain = { select: vi.fn(), in: vi.fn(), eq: vi.fn(), is: vi.fn(), then: vi.fn() };
      for (const method of ["select", "in", "eq", "is"] as const) chain[method].mockReturnValue(chain);
      chain.then.mockImplementation((resolve) => resolve({ data: table === "memorials"
        ? [{ id: A }, { id: B }] // H is not readable through the caller's public/RLS-filtered result.
        : [{ id: "r1", relation_type: "Père" }, { id: "r2", relation_type: "Frère" }], error: null }));
      return chain;
    });
  });
  it("preserves original accepted relation IDs independently, excluding private, pending and conflicting edges", async () => {
    const graph = await fetchAdminContextRelationGraph(A, B, [A, B, H]);
    expect(graph.edges.map((edge) => edge.relationId)).toEqual(["r1", "r2"]);
    expect(graph.memorials.map((memorial) => memorial.id)).toEqual([A, B]);
    expect(graph.edges.map((edge) => edge.label)).toEqual(["Père", "Frère"]);
    const memorialChain = api.from.mock.results.find((result) => result.value)?.value;
    expect(memorialChain.eq).toHaveBeenCalledWith("is_active", true);
    expect(memorialChain.eq).toHaveBeenCalledWith("is_published", true);
    expect(memorialChain.is).toHaveBeenCalledWith("deleted_at", null);
  });
  it("no canonical allowed endpoint means no graph query", async () => {
    expect(await fetchAdminContextRelationGraph(A, H, [A, B])).toEqual({ edges: [], memorials: [] });
    expect(api.rpc).not.toHaveBeenCalled();
  });
  it("a failed server projection does not become an empty successful graph", async () => {
    api.rpc.mockResolvedValue({ data: null, error: new Error("unavailable") });
    await expect(fetchAdminContextRelationGraph(A, B, [A, B])).rejects.toThrow("unavailable");
  });
});