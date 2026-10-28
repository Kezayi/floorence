import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AdminRelationExplanation } from "./AdminRelationExplanation";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const R = "00000000-0000-4000-8000-000000000001";
const api = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
const graphs = vi.hoisted(() => ({ fetchAdminContextRelationGraph: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: api }));
vi.mock("@/lib/resolvedGraphs", () => graphs);
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "synthetic-member" } }) }));
const memorial = (id: string, name: string) => ({ id, first_name: name, last_name: "Test", slug: name, photo_url: null, photos: null });
const mount = (candidates: Array<{ id: string; name: string }>) => render(
  <MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <AdminRelationExplanation candidates={candidates} />
  </QueryClientProvider></MemoryRouter>
);
const choose = async () => {
  await waitFor(() => expect(within(screen.getByLabelText("Depuis le mémorial")).getByRole("option", { name: /Alpha Test/ })).toBeInTheDocument());
  fireEvent.change(screen.getByLabelText("Depuis le mémorial"), { target: { value: A } });
  fireEvent.change(screen.getByLabelText("Vers le mémorial"), { target: { value: B } });
};

describe("Mounted explanation — synthetic isolated checks, no backend calls", () => {
  beforeEach(() => {
    cleanup(); vi.clearAllMocks();
    const chain = { select: vi.fn(), in: vi.fn(), eq: vi.fn(), is: vi.fn(), then: vi.fn() };
    for (const method of ["select", "in", "eq", "is"] as const) chain[method].mockReturnValue(chain);
    chain.then.mockImplementation((resolve) => resolve({ data: [memorial(A, "Alpha"), memorial(B, "Beta")], error: null }));
    api.from.mockReturnValue(chain);
    graphs.fetchAdminContextRelationGraph.mockResolvedValue({ memorials: [memorial(A, "Alpha"), memorial(B, "Beta")], edges: [{ aId: A, bId: B, relationId: R, label: "Frère" }] });
    api.rpc.mockResolvedValue({ data: [{ relation_id: R, confirmations: 2 }], error: null });
  });
  it("without canonical context renders fallback and makes no lookup", () => {
    mount([]);
    expect(screen.getByRole("status")).toHaveTextContent("Source canonique non disponible");
    expect(api.from).not.toHaveBeenCalled();
    expect(graphs.fetchAdminContextRelationGraph).not.toHaveBeenCalled();
  });
  it("only loads a path after explicit UUID selection, with real panel and per-ID counts", async () => {
    mount([{ id: A, name: "Ignored" }, { id: B, name: "Ignored" }]);
    expect(graphs.fetchAdminContextRelationGraph).not.toHaveBeenCalled();
    await choose();
    expect(await screen.findByText("Confirmé par 2 membres")).toBeInTheDocument();
    expect(graphs.fetchAdminContextRelationGraph).toHaveBeenCalledWith(A, B, [A, B]);
    expect(api.rpc).toHaveBeenCalledWith("get_relation_confirmation_counts", { p_relation_ids: [R] });
    expect(screen.getByRole("link", { name: /Alpha Test/ })).toHaveAttribute("href", "/memorial/Alpha");
  });
  it("missing counter row stays unavailable, never becomes zero or confirmed", async () => {
    api.rpc.mockResolvedValue({ data: [], error: null });
    mount([{ id: A, name: "Alpha" }, { id: B, name: "Beta" }]);
    await choose();
    expect(await screen.findByText("Confirmations indisponibles")).toBeInTheDocument();
    expect(screen.queryByText(/Confirmé par/)).not.toBeInTheDocument();
  });
  it("insufficient graph explicitly renders an unsubstantiated path", async () => {
    graphs.fetchAdminContextRelationGraph.mockResolvedValue({ memorials: [], edges: [] });
    mount([{ id: A, name: "Alpha" }, { id: B, name: "Beta" }]);
    await choose();
    expect(await screen.findByText(/Chemin non étayé entre les deux sources/)).toBeInTheDocument();
    expect(api.rpc).not.toHaveBeenCalled();
  });
});